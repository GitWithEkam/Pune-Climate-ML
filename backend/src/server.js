import fs from "node:fs/promises";
import { config } from "./config.js";
import { createApp } from "./app.js";
import { createStore } from "./storage/index.js";
import { createObjectStorage } from "./storage/objectStorage.js";
import { AuthService } from "./services/authService.js";
import { NotificationService } from "./services/notificationService.js";
import { QueueService } from "./jobs/queueService.js";

await fs.mkdir(config.uploadDirectory, { recursive: true });
const store = await createStore(config);
const objectStorage = await createObjectStorage(config);
const jobQueue = new QueueService(config.redisUrl);
const authService = new AuthService({ config, store });
await authService.ensureBootstrapAdmin();
const notificationService = new NotificationService({ config, store, jobQueue });
const app = createApp({ config, store, authService, objectStorage, jobQueue, notificationService });

const server = app.listen(config.port, () => {
  console.log(`Pune Climate API listening on http://localhost:${config.port}`);
});

server.on("error", (error) => {
  console.error("Unable to start Pune Climate API:", error);
  process.exitCode = 1;
});

function shutdown(signal) {
  console.log(`\n${signal} received. Closing API...`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
  jobQueue.close().catch(console.error);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
