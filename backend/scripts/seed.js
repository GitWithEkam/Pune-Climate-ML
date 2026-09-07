import fs from "node:fs/promises";

const baseUrl = process.env.API_URL || "http://localhost:4000/api";
const fixture = JSON.parse(await fs.readFile(new URL("../examples/mock-assessment.json", import.meta.url), "utf8"));
const suppliedMl = JSON.parse(await fs.readFile(new URL("../examples/mock-assessment-with-ml.json", import.meta.url), "utf8"));

async function post(path, body) {
  return apiRequest(path, { method: "POST", body });
}

async function apiRequest(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  return data;
}

try {
  const credentials = { email: "demo@puneclimate.local", password: "ClimateDemo123!" };
  try {
    await post("/v1/auth/register", { name: "Demo Urban Planner", ...credentials });
  } catch (error) {
    if (!error.message.startsWith("409:")) throw error;
  }
  const session = await post("/v1/auth/login", credentials);
  const first = await apiRequest("/v1/assessments", { method: "POST", body: fixture, token: session.accessToken });
  const second = await apiRequest("/v1/assessments", { method: "POST", body: suppliedMl, token: session.accessToken });
  const optimized = await apiRequest(`/v1/assessments/${second.id}/optimize`, { method: "POST", body: {}, token: session.accessToken });

  console.table([
    { id: first.id, project: first.projectName, climateScore: first.climateScore, source: first.ml.source },
    { id: second.id, project: second.projectName, climateScore: second.climateScore, source: second.ml.source },
  ]);
  console.log(`Optimization: ${optimized.baseline.climateScore} -> ${optimized.optimized.climateScore}`);
  console.log(`Open: ${baseUrl}/v1/assessments/${second.id}`);
  console.log(`PDF:  ${baseUrl}/v1/assessments/${second.id}/report`);
  console.log(`Demo login: ${credentials.email} / ${credentials.password}`);
} catch (error) {
  console.error(`Seed failed. Start the API first with "npm run dev".\n${error.message}`);
  process.exitCode = 1;
}
