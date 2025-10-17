import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  UserPresencePayload,
  UserLocationUpdatePayload,
} from "./types.ts";
import type { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.ts";

interface Deps {
  prisma: PrismaClient;
}

export function registerUserSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  deps: Deps
) {
  // Presence updates
  socket.on("user:presence", (payload: UserPresencePayload) => {
    if (!socket.data.user) return;
    const userId = socket.data.user.id;
    logger.debug({ userId, payload }, "User presence update");
    io.emit("user:presence:update", userId, payload);
  });

  // Location updates -> persist lastActiveAt and coordinates
  socket.on("user:location:update", async (payload: UserLocationUpdatePayload, ack) => {
    try {
      if (!socket.data.user) throw new Error("unauthorized");
      const userId = socket.data.user.id;
      await deps.prisma.user.update({
        where: { id: userId },
        data: {
          latitude: payload.latitude,
          longitude: payload.longitude,
          lastActiveAt: new Date(),
        },
      });
      ack?.(true);
    } catch (err: any) {
      logger.error({ err }, "Location update failed");
      // Emit error to this socket
      socket.emit("system:error", "LOCATION_UPDATE_FAILED", err.message || "Failed to update location");
      ack?.(false);
    }
  });
}