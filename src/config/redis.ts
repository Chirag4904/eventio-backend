import IORedis from "ioredis";
import type { RedisOptions } from "ioredis";
import { env } from "./env.ts";
import { logger } from "../utils/logger.ts";

type RedisClient = InstanceType<typeof IORedis>;

let pubClient: RedisClient | null = null;
let subClient: RedisClient | null = null;
let generalClient: RedisClient | null = null;

export const isRedisEnabled = !!env.redisUrl && env.redisUrl.length > 0;

function makeOptions(): RedisOptions {
  return {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 2000);
      return delay; // milliseconds
    },
    reconnectOnError(err: Error) {
      const targetErrors = ["READONLY", "ETIMEDOUT", "ECONNRESET"];
      if (targetErrors.some((e) => err.message.includes(e))) {
        logger.warn({ err }, "Redis reconnectOnError triggered");
        return true;
      }
      return false;
    },
  };
}

function addEventLogging(client: RedisClient, name: string) {
  client.on("connect", () => logger.info({ name }, "Redis connected"));
  client.on("ready", () => logger.info({ name }, "Redis ready"));
  client.on("error", (err: Error) => logger.error({ name, err }, "Redis error"));
  client.on("reconnecting", () => logger.warn({ name }, "Redis reconnecting"));
  client.on("end", () => logger.warn({ name }, "Redis connection closed"));
}

function createClient(label: string): RedisClient {
  const client = new IORedis(env.redisUrl!, makeOptions());
  addEventLogging(client, label);
  return client;
}

export function getAdapterClients(): { pubClient: RedisClient | null; subClient: RedisClient | null } {
  if (!isRedisEnabled) {
    logger.warn("Redis is not enabled (REDIS_URL missing). Using in-memory adapter.");
    return { pubClient: null, subClient: null };
  }
  if (!pubClient) pubClient = createClient("pubClient");
  if (!subClient) subClient = createClient("subClient");
  return { pubClient, subClient };
}

export function getRedis(): RedisClient | null {
  if (!isRedisEnabled) return null;
  if (!generalClient) generalClient = createClient("generalClient");
  return generalClient;
}

export async function shutdownRedis() {
  const tasks: Promise<void>[] = [];
  for (const client of [pubClient, subClient, generalClient]) {
    if (client) {
      tasks.push(client.quit().catch((err: unknown) => logger.error({ err }, "Redis quit error")));
    }
  }
  await Promise.all(tasks);
}