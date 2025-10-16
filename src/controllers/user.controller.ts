import type { Request, Response } from "express";
import * as userService from "../services/user.service.ts";

let apicallCount = 0;

/**
 * Get event by ID
 */
export async function getUserProfile(req: Request, res: Response) {
    try {
        const { userID } = req.params;

        if (!userID) {
            return res.status(400).json({ error: "User ID required" });
        }

        const user = await userService.getUserById(userID);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
