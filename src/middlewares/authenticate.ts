import type { Request, Response, NextFunction } from "express";
import { auth } from "../utils/auth.ts";              // your Better Auth instance
import { fromNodeHeaders } from "better-auth/node"; // header converter helper

// Extend Express Request interface to include the session / user
declare global {
    namespace Express {
        interface Request {
            authSession?: Awaited<ReturnType<typeof auth.api.getSession>>;
            authUser?: typeof auth.api.getSession extends Promise<infer U> ? U extends { user: infer V } ? V : any : any;
        }
    }
}

/**
 * Middleware to require a logged-in user.
 * If session is valid, attaches it to req and calls next().
 * Otherwise, responds with 401.
 */
export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        // No session or no user inside it
        if (!session || !session.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Attach session and user to req
        req.authSession = session;
        req.authUser = session.user;


        return next();
    } catch (err) {
        console.error("Auth middleware error:", err);
        return res.status(500).json({ error: "Internal authentication error" });
    }
}
