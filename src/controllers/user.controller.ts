import type { Request, Response } from "express";
import * as userService from "../services/user.service.ts";

let apicallCount = 0;

/**
 * Get the authenticated user's full profile with mocked stats
 */
export async function getMyProfile(req: Request, res: Response) {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("coming herererere");

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Mocked statistics for now
    const stats = {
      eventsHosted: 24,
      eventsAttended: 47,
      connections: 156,
    };

    return res.json({ user, stats });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get a public profile of another user (limited fields)
 */
export async function getPublicUserProfile(req: Request, res: Response) {
  try {
    const { userID } = req.params;
    if (!userID) {
      return res.status(400).json({ error: "User ID required" });
    }

    const publicUser = await userService.getPublicUserById(userID);
    if (!publicUser) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(publicUser);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
