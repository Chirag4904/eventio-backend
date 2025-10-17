import type { Socket } from "socket.io";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../utils/auth.ts";
import { logger } from "../utils/logger.ts";
import type { SocketData } from "./types.ts";

export async function socketAuthMiddleware(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void
) {
  try {
    const rawHeaders = socket.handshake.headers as Record<
      string,
      string | string[] | undefined
    >;
    const headers = fromNodeHeaders(rawHeaders);


    // Prefer the cookie header explicitly to avoid any header conversion edge cases
    const cookieHeader = Array.isArray(rawHeaders.cookie)
      ? rawHeaders.cookie.join("; ")
      : rawHeaders.cookie;

    // Allow non-browser clients to pass the session token via handshake auth or query
    const authToken =
      (socket.handshake as any).auth?.sessionToken ??
      (socket.handshake.query?.sessionToken as string | undefined);

    // First attempt: use cookie header directly if present; otherwise use converted headers
    let session = await auth.api.getSession({
      headers: cookieHeader ? { cookie: cookieHeader } : headers,
    });

    // Fallback: if session missing but auth token provided, construct a cookie and retry
    if ((!session || !session.user) && authToken) {
      session = await auth.api.getSession({
        headers: { cookie: `better-auth.session_token=${authToken}` },
      });
    }

    if (!session || !session.user) {
      logger.warn(
        {
          sid: socket.id,
          hasCookie: !!cookieHeader,
          hasAuthToken: !!authToken,
        },
        "Socket auth failed: no session"
      );
      return next(new Error("unauthorized"));
    }

    const { id, email, name } = session.user as any;
    socket.data.user = { id, email, name };
    return next();
  } catch (err) {
    logger.error({ err }, "Socket auth error");
    return next(new Error("internal_auth_error"));
  }
}
