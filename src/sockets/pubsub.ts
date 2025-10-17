import type { Server } from "socket.io";
import type { NotificationMessagePayload, ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from "./types.ts";
type RedisClient = InstanceType<typeof import("ioredis").default>;
import { logger } from "../utils/logger.ts";

export class PubSubManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private redis: RedisClient | null;
  private subscribed = new Set<string>();

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    redis: RedisClient | null
  ) {
    this.io = io;
    this.redis = redis;

    if (this.redis) {
      this.redis.on("message", (channel: string, message: string) => {
        try {
          const payload: NotificationMessagePayload = JSON.parse(message);
          // Broadcast to sockets subscribed to this channel
          this.io.to(this.roomFor(channel)).emit("notification:new", payload);
        } catch (err: unknown) {
          logger.error({ err, channel }, "PubSub message parse error");
        }
      });
    } else {
      logger.warn("PubSubManager initialized without Redis; notifications will not receive external pub/sub messages.");
    }
  }

  public roomFor(channel: string): string {
    return `notification:${channel}`;
  }

  public async subscribe(channel: string) {
    if (this.subscribed.has(channel)) return;
    if (this.redis) {
      await this.redis.subscribe(channel);
      this.subscribed.add(channel);
      logger.info({ channel }, "Subscribed to Redis channel");
    } else {
      // No Redis: just mark subscribed to avoid repeated logs
      this.subscribed.add(channel);
      logger.info({ channel }, "Subscribed (no Redis) - using local rooms only");
    }
  }

  public async unsubscribe(channel: string) {
    if (!this.subscribed.has(channel)) return;
    if (this.redis) {
      await this.redis.unsubscribe(channel);
      this.subscribed.delete(channel);
      logger.info({ channel }, "Unsubscribed from Redis channel");
    } else {
      this.subscribed.delete(channel);
      logger.info({ channel }, "Unsubscribed (no Redis)");
    }
  }

  // pubsub.ts
  public async publish(channel: string, payload: any) {
    if (!this.redis) {
      this.io.to(this.roomFor(channel)).emit("notification:new", payload);
      logger.warn("Redis not enabled, broadcasting locally only");
      return;
    }
    await this.redis.publish(channel, JSON.stringify(payload));
    logger.info({ channel }, "Published to Redis");
  }

}