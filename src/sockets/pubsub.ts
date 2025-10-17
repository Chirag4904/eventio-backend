import type { Server } from "socket.io";
import type { NotificationMessagePayload, ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from "./types.ts";
type RedisClient = InstanceType<typeof import("ioredis").default>;
import { logger } from "../utils/logger.ts";

export class PubSubManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private pubRedis: RedisClient | null;
  private subRedis: RedisClient | null;
  private subscribed = new Set<string>();

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    redis: RedisClient | null
  ) {
    this.io = io;
    this.pubRedis = redis;
    this.subRedis = redis ? redis.duplicate() : null;

    if (this.subRedis) {
      this.subRedis.on("message", (channel: string, message: string) => {
        try {
          const payload: NotificationMessagePayload = JSON.parse(message);
          // Broadcast to sockets subscribed to this channel, skipping creator if present
          this.emitToChannel(channel, payload);
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

  // Emit to a channel room, skipping the creator (if provided in payload.data.creatorId)
  private emitToChannel(channel: string, payload: NotificationMessagePayload) {
    const roomName = this.roomFor(channel);
    const room = this.io.sockets.adapter.rooms.get(roomName);
    if (!room) return;

    const creatorId = (payload.data && (payload.data as any).creatorId) as string | undefined;
    for (const sid of room) {
      const s = this.io.sockets.sockets.get(sid);
      const uid = s?.data.user?.id;
      if (creatorId && uid === creatorId) continue;
      s?.emit("notification:new", payload);
    }
  }

  public async subscribe(channel: string) {
    if (this.subscribed.has(channel)) return;
    if (this.subRedis) {
      await this.subRedis.subscribe(channel);
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
    if (this.subRedis) {
      await this.subRedis.unsubscribe(channel);
      this.subscribed.delete(channel);
      logger.info({ channel }, "Unsubscribed from Redis channel");
    } else {
      this.subscribed.delete(channel);
      logger.info({ channel }, "Unsubscribed (no Redis)");
    }
  }

  // pubsub.ts
  public async publish(channel: string, payload: any) {
    if (!this.pubRedis) {
      // Local fallback: still respect creator skip
      this.emitToChannel(channel, payload as NotificationMessagePayload);
      logger.warn("Redis not enabled, broadcasting locally only");
      return;
    }
    await this.pubRedis.publish(channel, JSON.stringify(payload));
    logger.info({ channel }, "Published to Redis");
  }
}