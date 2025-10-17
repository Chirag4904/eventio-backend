import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  NotificationSubscribePayload,
  NotificationMessagePayload,
  EventCreatedPayload,
} from "./types.ts";
import { PubSubManager } from "./pubsub.ts";
import { logger } from "../utils/logger.ts";

interface Deps {
  pubSub: PubSubManager;
}

export function registerNotificationSocketHandlers(
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  deps: Deps
) {
  // Auto-subscribe all users to the default notification channels (e.g., events)
  (async () => {
    const defaultChannels = ["events"];
    for (const channel of defaultChannels) {
      try {
        const room = deps.pubSub.roomFor(channel);
        socket.join(room);
        await deps.pubSub.subscribe(channel);
        logger.debug({ sid: socket.id, channel }, "Auto-subscribed to channel");
      } catch (err: any) {
        logger.error({ err, channel }, "Failed to auto-subscribe to channel");
      }
    }
  })();

  // Manual subscription API
  socket.on(
    "notification:subscribe",
    async (payload: NotificationSubscribePayload) => {
      if (!Array.isArray(payload.channels)) return;
      for (const channel of payload.channels) {
        // Join room for channel so server broadcasts reach this socket
        const room = deps.pubSub.roomFor(channel);
        socket.join(room);
        try {
          await deps.pubSub.subscribe(channel);
        } catch (err: any) {
          logger.error({ err, channel }, "Failed to subscribe to channel");
          socket.emit(
            "system:error",
            "SUBSCRIBE_FAILED",
            err.message || "Failed to subscribe"
          );
        }
      }
    }
  );

  // Client ACK for notifications (no-op placeholder)
  socket.on("notification:ack", (id: string) => {
    logger.debug({ id }, "Notification ack received");
  });

  // Listen for new events created by any client and broadcast a notification
  socket.on("event:new", async (payload: EventCreatedPayload, ack) => {
    try {
      if (!socket.data.user) throw new Error("unauthorized");

      const creatorId = socket.data.user.id;
      const notif: NotificationMessagePayload = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: "event-created",
        title: `New Event: ${payload.title}`,
        body: payload.description || undefined,
        createdAt: new Date().toISOString(),
        data: {
          event: {
            id: payload.id,
            title: payload.title,
            description: payload.description,
            startTimeIso: payload.startTimeIso,
            endTimeIso: payload.endTimeIso,
            latitude: payload.latitude,
            longitude: payload.longitude,
          },
          creatorId,
        },
      };

      // Publish to the 'events' channel so all auto-subscribed sockets receive it
      await deps.pubSub.publish("events", notif);
      ack?.(true);
    } catch (err: any) {
      logger.error({ err }, "Failed to publish event-created notification");
      socket.emit(
        "system:error",
        "NOTIFICATION_PUBLISH_FAILED",
        err.message || "Failed to publish notification"
      );
      ack?.(false);
    }
  });
}
