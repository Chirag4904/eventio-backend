import { Router } from "express";
import {
  createEvent,
  getNearbyEvents,
  getEventsInBounds,
  getEventById,
} from "../controllers/event.controller.ts";

const router = Router();

//get events
router.get("/", getEventsInBounds);

// POST /api/events
router.post("/", createEvent);

// GET /api/events/nearby?lat=12.9&lng=77.6
router.get("/nearby", getNearbyEvents);

//GET /api/events/:eventID
router.get("/:eventID", getEventById);

export default router;
