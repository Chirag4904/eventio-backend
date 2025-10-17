import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  NotificationSubscribePayload,
} from "./types.ts";
import { PubSubManager } from "./pubsub.ts";
import { logger } from "../utils/logger.ts";

interface Deps {
  pubSub: PubSubManager;
}

export function registerNotificationSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  deps: Deps
) {
  socket.on("notification:subscribe", async (payload: NotificationSubscribePayload) => {
    if (!Array.isArray(payload.channels)) return;
    for (const channel of payload.channels) {
      // Join room for channel so server broadcasts reach this socket
      const room = deps.pubSub.roomFor(channel);
      socket.join(room);
      try {
        await deps.pubSub.subscribe(channel);
      } catch (err: any) {
        logger.error({ err, channel }, "Failed to subscribe to channel");
        socket.emit("system:error", "SUBSCRIBE_FAILED", err.message || "Failed to subscribe");
      }
    }
  });

  socket.on("notification:ack", (id: string) => {
    // No-op for now; could be used to update read-state in DB later
    logger.debug({ id }, "Notification ack received");
  });
}