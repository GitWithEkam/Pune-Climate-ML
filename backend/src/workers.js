import IORedis from "ioredis";
import { Worker } from "bullmq";
import { config } from "./config.js";
import { createStore } from "./storage/index.js";
import { createAssessment } from "./services/assessmentService.js";
import { NotificationService } from "./services/notificationService.js";

if (!config.redisUrl) throw new Error("REDIS_URL is required to start workers");
const store = await createStore(config);
const notificationService = new NotificationService({ config, store });
const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

const analysisWorker = new Worker("assessment-analysis", async (job) => {
  await job.updateProgress(10);
  const project = await createAssessment({ ...job.data, config, store, notificationService });
  await job.updateProgress(100);
  return { assessmentId: project.id, climateScore: project.scoring.climateScore };
}, { connection, concurrency: 2 });

const notificationWorker = new Worker("notifications", async (job) => {
  const notifications = await store.listNotifications(job.data.userId);
  const notification = notifications.find((item) => item.id === job.data.notificationId);
  if (!notification) throw new Error("Notification not found");
  await notificationService.deliver(notification, job.data.channels);
  return { notificationId: notification.id, delivery: notification.delivery };
}, { connection, concurrency: 5 });

for (const worker of [analysisWorker, notificationWorker]) {
  worker.on("completed", (job) => console.log(`${worker.name} job ${job.id} completed`));
  worker.on("failed", (job, error) => console.error(`${worker.name} job ${job?.id} failed`, error));
}

async function shutdown() {
  await Promise.all([analysisWorker.close(), notificationWorker.close()]);
  connection.disconnect();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

console.log("BullMQ analysis and notification workers are running");
