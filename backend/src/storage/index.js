import { FileStore } from "./fileStore.js";
import { PostgresStore } from "./postgresStore.js";

export async function createStore(config) {
  if (config.storageDriver === "postgres") {
    if (!config.databaseUrl) throw new Error("DATABASE_URL is required for PostgreSQL storage");
    const store = new PostgresStore(config.databaseUrl);
    await store.init();
    return store;
  }
  const store = new FileStore(config.dataFile);
  await store.init();
  return store;
}
