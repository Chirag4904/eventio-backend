// Global, shared socket event typings

export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

export interface SocketData {
  user?: AuthUser;
}

// User related events
export interface UserPresencePayload {
  status: "online" | "offline" | "away";
}

export interface UserLocationUpdatePayload {
  latitude: number;
  longitude: number;
}

// Notification related events
export interface NotificationSubscribePayload {
  channels: string[]; // e.g. ["events", "system"]
}

export interface NotificationMessagePayload {
  id: string;
  type: string; // e.g. "event-created"
  title: string;
  body?: string;
  createdAt: string; // ISO
  data?: Record<string, unknown>;
}

// Chat related events (placeholder implementations only)
// NOTE: Placeholder for future chat functionality; no chat models yet.
export interface ChatJoinPayload {
  roomId: string; // e.g. eventId or group id
}

export interface ChatLeavePayload {
  roomId: string;
}

export interface ChatMessagePayload {
  roomId: string;
  message: string;
  clientMsgId?: string; // client-generated id for ack correlation
}

// Mapping of client -> server events
export interface ClientToServerEvents {
  // user
  "user:presence": (payload: UserPresencePayload) => void;
  "user:location:update": (payload: UserLocationUpdatePayload, ack?: (ok: boolean) => void) => void;

  // notifications
  "notification:subscribe": (payload: NotificationSubscribePayload) => void;
  "notification:ack": (id: string) => void;

  // chat (placeholder)
  "chat:join": (payload: ChatJoinPayload, ack?: (ok: boolean) => void) => void;
  "chat:leave": (payload: ChatLeavePayload) => void;
  "chat:message": (payload: ChatMessagePayload, ack?: (ok: boolean) => void) => void;
}

// Mapping of server -> client events
export interface ServerToClientEvents {
  // lifecycle
  "system:welcome": (msg: string) => void;
  "system:error": (code: string, message: string) => void;

  // user
  "user:presence:update": (userId: string, payload: UserPresencePayload) => void;

  // notifications
  "notification:new": (payload: NotificationMessagePayload) => void;

  // chat (placeholder)
  "chat:joined": (roomId: string) => void;
  "chat:left": (roomId: string) => void;
  "chat:message:new": (payload: ChatMessagePayload & { serverMsgId: string }) => void;
}

// Internal events between server nodes (optional)
export interface InterServerEvents {}