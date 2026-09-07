import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import request from "supertest";
import { createApp } from "../src/app.js";
import { AuthService } from "../src/services/authService.js";
import { NotificationService } from "../src/services/notificationService.js";

class MemoryStore {
  items = [];
  users = [];
  sessions = [];
  notifications = [];
  async listAssessments() { return this.items; }
  async getAssessment(id) { return this.items.find((item) => item.id === id) || null; }
  async saveAssessment(item) { this.items = [...this.items.filter((x) => x.id !== item.id), item]; return item; }
  async saveUser(user) { this.users = [...this.users.filter((x) => x.id !== user.id), user]; return user; }
  async findUserByEmail(email) { return this.users.find((user) => user.email === email) || null; }
  async getUser(id) { return this.users.find((user) => user.id === id) || null; }
  async listUsers() { return this.users; }
  async saveRefreshSession(session) { this.sessions.push(session); }
  async getRefreshSession(id) { return this.sessions.find((session) => session.id === id) || null; }
  async deleteRefreshSession(id) { this.sessions = this.sessions.filter((session) => session.id !== id); }
  async saveNotification(item) { this.notifications = [...this.notifications.filter((x) => x.id !== item.id), item]; return item; }
  async listNotifications(userId) { return this.notifications.filter((item) => item.userId === userId); }
  async markNotificationRead(id, userId) { const item = this.notifications.find((x) => x.id === id && x.userId === userId); if (item) item.readAt = new Date().toISOString(); return item || null; }
}

class MemoryObjectStorage {
  files = new Map();
  async save(file, assessmentId) { const key = `${assessmentId}/${file.originalname}`; this.files.set(key, file.buffer); return { key, provider: "memory" }; }
  async get(key) { return Readable.from(this.files.get(key)); }
}

const appConfig = {
  nodeEnv: "test", frontendOrigin: "http://localhost:5173", mlMode: "fixture", storageDriver: "memory",
  fileStorageProvider: "memory", authRequired: true, jwtAccessSecret: "test-access-secret-at-least-32-characters",
  jwtRefreshSecret: "test-refresh-secret-at-least-32-characters", accessTokenTtl: "15m", refreshTokenTtl: "7d",
  allowRoleSelfAssignment: true, rateLimitWindowMs: 60_000, rateLimitMax: 1000, authRateLimitMax: 1000,
  logLevel: "silent", smtp: {}, twilio: {},
};

function setup() {
  const store = new MemoryStore();
  const authService = new AuthService({ config: appConfig, store });
  const objectStorage = new MemoryObjectStorage();
  const notificationService = new NotificationService({ config: appConfig, store });
  return { app: createApp({ config: appConfig, store, authService, objectStorage, notificationService }) };
}

async function session(app, role = "urban_planner") {
  const credentials = { name: "Test User", email: `${role}@example.com`, password: "StrongPassword123!", role };
  await request(app).post("/api/v1/auth/register").send(credentials).expect(201);
  return (await request(app).post("/api/v1/auth/login").send(credentials).expect(200)).body;
}

test("requires authentication and enforces read-only permissions", async () => {
  const { app } = setup();
  await request(app).get("/api/v1/assessments").expect(401);
  const viewer = await session(app, "public_viewer");
  await request(app).post("/api/v1/assessments").set("authorization", `Bearer ${viewer.accessToken}`).send({
    name: "Forbidden", type: "Test", location: "Pune",
  }).expect(403);
});

test("creates, reads, uploads, reports, optimizes and notifies", async () => {
  const { app } = setup();
  const login = await session(app);
  const auth = { authorization: `Bearer ${login.accessToken}` };
  const created = await request(app).post("/api/v1/assessments").set(auth).send({
    name: "Baner Urban Development", type: "Mixed-use development", location: "Baner, Pune",
  }).expect(201);
  assert.equal(created.body.projectName, "Baner Urban Development");
  assert.equal(created.body.dataQuality.confidence, "low");

  await request(app).get(`/api/v1/assessments/${created.body.id}`).set(auth).expect(200);
  const optimized = await request(app).post(`/api/v1/assessments/${created.body.id}/optimize`).set(auth).expect(200);
  assert.ok(optimized.body.optimized.climateScore >= optimized.body.baseline.climateScore);

  const uploaded = await request(app).post(`/api/v1/assessments/${created.body.id}/documents`).set(auth)
    .attach("documents", Buffer.from("name,value\nheat,34"), { filename: "climate.csv", contentType: "text/csv" }).expect(201);
  await request(app).get(`/api/v1/assessments/${created.body.id}/documents/${uploaded.body.items[0].id}`).set(auth).expect(200);

  const report = await request(app).get(`/api/v1/assessments/${created.body.id}/report`).set(auth).expect(200);
  assert.equal(report.body.subarray(0, 4).toString("ascii"), "%PDF");
  const notifications = await request(app).get("/api/v1/notifications").set(auth).expect(200);
  assert.equal(notifications.body.unread, 1);
});

test("rotates refresh tokens and rejects invalid ML totals", async () => {
  const { app } = setup();
  const login = await session(app);
  const refreshed = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: login.refreshToken }).expect(200);
  assert.notEqual(refreshed.body.refreshToken, login.refreshToken);
  await request(app).post("/api/v1/auth/refresh").send({ refreshToken: login.refreshToken }).expect(401);

  await request(app).post("/api/v1/assessments").set("authorization", `Bearer ${refreshed.body.accessToken}`).send({
    name: "Invalid model output", type: "Test", location: "Pune",
    mlOutput: { landcover: { vegetation_pct: 40, impervious_pct: 40, water_pct: 40 }, lst_celsius_mean: 34 },
  }).expect(400);
});
