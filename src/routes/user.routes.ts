import { Router } from "express";
import {
    getUserProfile,
} from "../controllers/user.controller.ts";

const router = Router();

//get events
router.get("/profile", getUserProfile);



export default router;
