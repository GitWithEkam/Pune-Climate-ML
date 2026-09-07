import fs from "node:fs/promises";
import path from "node:path";

export class FileStore {
  constructor(filename) {
    this.filename = filename;
    this.writeQueue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(path.dirname(this.filename), { recursive: true });
    try { await fs.access(this.filename); }
    catch { await fs.writeFile(this.filename, JSON.stringify(this.emptyDatabase(), null, 2)); }
  }

  emptyDatabase() {
    return { assessments: [], users: [], refreshSessions: [], notifications: [] };
  }

  async read() {
    return { ...this.emptyDatabase(), ...JSON.parse(await fs.readFile(this.filename, "utf8")) };
  }

  async update(mutator) {
    this.writeQueue = this.writeQueue.then(async () => {
      const data = await this.read();
      await mutator(data);
      const temporary = `${this.filename}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(data, null, 2));
      await fs.rename(temporary, this.filename);
    });
    await this.writeQueue;
  }

  async listAssessments() {
    const data = await this.read();
    return data.assessments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAssessment(id) {
    return (await this.listAssessments()).find((item) => item.id === id) || null;
  }

  async saveAssessment(assessment) {
    await this.update((data) => {
      const index = data.assessments.findIndex((item) => item.id === assessment.id);
      if (index >= 0) data.assessments[index] = assessment;
      else data.assessments.push(assessment);
    });
    return assessment;
  }

  async saveUser(user) {
    await this.update((data) => {
      const index = data.users.findIndex((item) => item.id === user.id);
      if (index >= 0) data.users[index] = user;
      else data.users.push(user);
    });
    return user;
  }

  async findUserByEmail(email) {
    return (await this.read()).users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async getUser(id) {
    return (await this.read()).users.find((user) => user.id === id) || null;
  }

  async listUsers() {
    return (await this.read()).users;
  }

  async saveRefreshSession(session) {
    await this.update((data) => {
      data.refreshSessions = data.refreshSessions.filter((item) => item.id !== session.id);
      data.refreshSessions.push(session);
    });
  }

  async getRefreshSession(id) {
    return (await this.read()).refreshSessions.find((session) => session.id === id) || null;
  }

  async deleteRefreshSession(id) {
    await this.update((data) => { data.refreshSessions = data.refreshSessions.filter((session) => session.id !== id); });
  }

  async saveNotification(notification) {
    await this.update((data) => {
      const index = data.notifications.findIndex((item) => item.id === notification.id);
      if (index >= 0) data.notifications[index] = notification;
      else data.notifications.push(notification);
    });
    return notification;
  }

  async listNotifications(userId) {
    return (await this.read()).notifications
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markNotificationRead(id, userId) {
    let updated = null;
    await this.update((data) => {
      const item = data.notifications.find((entry) => entry.id === id && entry.userId === userId);
      if (item) {
        item.readAt = new Date().toISOString();
        updated = item;
      }
    });
    return updated;
  }
}
