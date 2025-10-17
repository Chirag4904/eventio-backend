import { Router } from "express";
import {
    getMyProfile,
    getPublicUserProfile,
} from "../controllers/user.controller.ts";

const router = Router();

// Authenticated: get my full profile
router.get("/me", getMyProfile);

// Public: get another user's public profile
router.get("/:userID/public", getPublicUserProfile);

export default router;
