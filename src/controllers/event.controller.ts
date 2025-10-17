import type { Request, Response } from "express";
import * as eventService from "../services/event.service.ts";
// import {Event} from "../config/prisma.ts/client";

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
    const { id: createdById } = req.authUser;
    const event = await eventService.createEvent({
      ...req.body,
      createdById,
    });
    res.status(201).json(event);
    console.log("coming here");
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

    // const mockEvents = [
    //   {
    //     id: 1,
    //     title: "House Party",
    //     description: "House Party for Strangers",
    //     address: "Bengaluru, Karnataka, India",
    //     startTime: new Date("2023-01-01T12:00:00Z"),
    //     endTime: new Date("2023-01-01T14:00:00Z"),
    //     // category:{
    //     //   id: 1,
    //     //   name: "Category 1",
    //     // },
    //     city: "Bengaluru",
    //     visibility: "PUBLIC",
    //     latitude: 12.9716,
    //     longitude: 77.5946,
    //     updatedAt: new Date(),
    //     createdAt: new Date(),
    //     category: {
    //       id: 1,
    //       // name: "Category 1",
    //     },
    //     createdById: "124124214dfesg",
    //   },
    //   {
    //     id: 2,
    //     title: "Visit Jawaharlal Nehru Planetarium",
    //     description: "Visit Jawaharlal Nehru Planetarium",
    //     address: "Bengaluru, Karnataka, India",
    //     startTime: new Date("2023-01-02T12:00:00Z"),
    //     endTime: new Date("2023-01-02T14:00:00Z"),
    //     // category:{
    //     //   id: 1,
    //     //   name: "Category 1",
    //     // },
    //     city: "Bengaluru",
    //     visibility: "PUBLIC",
    //     latitude: 12.98491,
    //     longitude: 77.58964,
    //     updatedAt: new Date(),
    //     createdAt: new Date(),
    //     category: {
    //       id: 3,
    //       // name: "photography",
    //     },
    //     createdById: "124124214dfesg",
    //   },
    //   //create a mumbai event
    //   {
    //     id: 3,
    //     title: "Visit Mumbai Gateway of India",
    //     description: "Visit Mumbai Gateway of India",
    //     address: "Mumbai, Maharashtra, India",
    //     startTime: new Date("2023-01-03T12:00:00Z"),
    //     endTime: new Date("2023-01-03T14:00:00Z"),
    //     // category:{
    //     //   id: 1,
    //     //   name: "Category 1",
    //     // },
    //     city: "Mumbai",
    //     visibility: "PUBLIC",
    //     latitude: 18.92217,
    //     longitude: 72.83387,
    //     updatedAt: new Date(),
    //     createdAt: new Date(),
    //     category: {
    //       id: 2,
    //       // name: "music",
    //     },
    //     createdById: "124124214dfesg",
    //   },
    // ];

    // Match frontend expectations
    res.status(200).json({ events });
    // res.json({ events });

    console.log("events found", events, req.authUser);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
