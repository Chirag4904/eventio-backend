import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  ChatJoinPayload,
  ChatLeavePayload,
  ChatMessagePayload,
} from "./types.ts";
import { logger } from "../utils/logger.ts";

interface Deps {}

/**
 * Placeholder chat handlers for future expansion.
 * NOTE: No chat persistence/models yet; messages are ephemeral and room-based.
 */
export function registerChatSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  _deps: Deps
) {
  // Join a chat room
  socket.on("chat:join", (payload: ChatJoinPayload, ack) => {
    if (!socket.data.user) {
      ack?.(false);
      return;
    }
    const room = `chat:${payload.roomId}`;
    socket.join(room);
    io.to(socket.id).emit("chat:joined", payload.roomId);
    ack?.(true);
  });

  // Leave a chat room
  socket.on("chat:leave", (payload: ChatLeavePayload) => {
    const room = `chat:${payload.roomId}`;
    socket.leave(room);
    io.to(socket.id).emit("chat:left", payload.roomId);
  });

  // Broadcast a chat message to the room (ephemeral)
  socket.on("chat:message", (payload: ChatMessagePayload, ack) => {
    if (!socket.data.user) {
      ack?.(false);
      return;
    }
    const trimmed = (payload.message || "").trim();
    if (trimmed.length === 0 || trimmed.length > 2000) {
      io.to(socket.id).emit("system:error", "CHAT_VALIDATION_ERROR", "Invalid message length");
      ack?.(false);
      return;
    }
    const room = `chat:${payload.roomId}`;
    const eventPayload = {
      roomId: payload.roomId,
      message: trimmed,
      clientMsgId: payload.clientMsgId,
      serverMsgId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
    logger.debug({ room, userId: socket.data.user.id }, "Chat message broadcast");
    io.to(room).emit("chat:message:new", eventPayload);
    ack?.(true);
  });
}