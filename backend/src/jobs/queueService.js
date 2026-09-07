import IORedis from "ioredis";
import { Queue } from "bullmq";

export class QueueService {
  constructor(redisUrl) {
    this.enabled = Boolean(redisUrl);
    if (!this.enabled) return;
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: 1, enableReadyCheck: false });
    this.analysis = new Queue("assessment-analysis", { connection: this.connection });
    this.notifications = new Queue("notifications", { connection: this.connection });
  }

  async addAssessment(data) {
    if (!this.enabled) throw new Error("Redis is not configured");
    return this.analysis.add("analyze", data, { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 100, removeOnFail: 500 });
  }

  async addNotification(data) {
    if (!this.enabled) return null;
    return this.notifications.add("deliver", data, { attempts: 5, backoff: { type: "exponential", delay: 3000 }, removeOnComplete: 500, removeOnFail: 1000 });
  }

  async status(queueName, id) {
    const queue = queueName === "notifications" ? this.notifications : this.analysis;
    const job = await queue.getJob(id);
    if (!job) return null;
    return {
      id: job.id, name: job.name, ownerId: job.data.ownerId || job.data.userId,
      state: await job.getState(), progress: job.progress, result: job.returnvalue, failedReason: job.failedReason || null,
    };
  }

  async close() {
    if (!this.enabled) return;
    await Promise.all([this.analysis.close(), this.notifications.close()]);
    this.connection.disconnect();
  }
}
