import type { Request, Response } from "express";
import * as eventService from "../services/event.service.ts";

let apicallCount = 0;

/**
 * Get event by ID
 */
export async function getEventById(req: Request, res: Response) {
  try {
    const { eventID } = req.params;

    if (!eventID) {
      return res.status(400).json({ error: "Event ID required" });
    }

    const event = await eventService.getEventById(parseInt(eventID));
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function createEvent(req: Request, res: Response) {
  try {
    const event = await eventService.createEvent(req.body);
    res.status(201).json(event);
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

export async function getNearbyEvents(req: Request, res: Response) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng)
      return res.status(400).json({ error: "lat and lng required" });

    const events = await eventService.getNearbyEvents(
      parseFloat(lat as string),
      parseFloat(lng as string)
    );
    res.json(events);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get events within a bounding box
 */
export async function getEventsInBounds(req: Request, res: Response) {
  try {
    const { swLat, swLng, neLat, neLng } = req.query;

    if (!swLat || !swLng || !neLat || !neLng) {
      return res.status(400).json({ error: "Bounding box params required" });
    }

    const events = await eventService.getEventsInBounds(
      parseFloat(swLat as string),
      parseFloat(swLng as string),
      parseFloat(neLat as string),
      parseFloat(neLng as string)
    );

    // Match frontend expectations
    res.json({ events });

    console.log("return events", events, apicallCount++);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
