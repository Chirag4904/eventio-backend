import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./types.ts";

import { env } from "../config/env.ts";
import {
  getAdapterClients,
  getRedis,
  isRedisEnabled,
} from "../config/redis.ts";
import { logger } from "../utils/logger.ts";
import { socketAuthMiddleware } from "./middleware.ts";
import { registerUserSocketHandlers } from "./user.socket.ts";
import { registerNotificationSocketHandlers } from "./notification.socket.ts";
import { registerChatSocketHandlers } from "./chat.socket.ts";
import { PubSubManager } from "./pubsub.ts";
import type { PrismaClient } from "@prisma/client";

interface Deps {
  prisma: PrismaClient;
}

export function initSocket(httpServer: HttpServer, deps: Deps) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: env.sioCorsOrigin,
      credentials: true,
    },
    pingTimeout: env.sioPingTimeout,
    pingInterval: env.sioPingInterval,
    serveClient: false,
  });

  // Redis adapter for scale-out pub/sub
  const { pubClient, subClient } = getAdapterClients();
  if (isRedisEnabled && pubClient && subClient) {
    try {
      io.adapter(createAdapter(pubClient, subClient));
      logger.info("Socket.IO Redis adapter enabled");
    } catch (err) {
      logger.error(
        { err },
        "Failed to initialize Redis adapter; falling back to in-memory adapter"
      );
    }
  } else {
    logger.warn("Socket.IO using in-memory adapter (Redis not configured)");
  }

  // PubSub manager for notifications
  const pubSub = new PubSubManager(io, getRedis());

  // Better-auth session validation
  io.use(socketAuthMiddleware);

  // Connection state tracking
  const userSockets = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    const userName = socket.data.user?.name;
    const userId = socket.data.user?.id;
    logger.info({ sid: socket.id, userId, userName }, "Socket connected");

    if (userId) {
      const set = userSockets.get(userId) ?? new Set();
      set.add(socket.id);
      userSockets.set(userId, set);

      console.log("user sockets",userSockets)
      // Welcome message only to the connecting socket
      socket.emit("system:welcome", "Connected to realtime service");
    }

    // Register handlers
    registerUserSocketHandlers(io, socket, { prisma: deps.prisma });
    registerNotificationSocketHandlers(io, socket, { pubSub });
    registerChatSocketHandlers(io, socket, {});

    socket.on("disconnect", async (reason) => {
      const uid = socket.data.user?.id;
      logger.info({ sid: socket.id, uid, reason }, "Socket disconnected");
      if (uid) {
        const set = userSockets.get(uid);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) userSockets.delete(uid);
        }
        // Broadcast presence offline for this user
        io.emit("user:presence:update", uid, { status: "offline" });
        // connection state management: update lastActiveAt
        try {
          await deps.prisma.user.update({
            where: { id: uid },
            data: { lastActiveAt: new Date() },
          });
        } catch (err) {
          logger.warn({ err }, "Failed to update lastActiveAt on disconnect");
        }
      }
    });
  });

  io.engine.on("connection_error", (err) => {
    logger.error({ err }, "Socket.IO engine connection error");
  });

  logger.info("Socket.IO initialized");
  return io;
}
