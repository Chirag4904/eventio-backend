import prisma from "../config/prisma.ts";

interface EventInput {
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  latitude: number;
  longitude: number;
  createdById: number;
}
/**
 * Get event by ID
 */
export async function getEventById(eventID: number) {
  return prisma.event.findUnique({
    where: { id: eventID },
  });
}

export async function createEvent(data: EventInput) {
  return prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      latitude: data.latitude,
      longitude: data.longitude,
      createdById: data.createdById,
    },
  });
}

// Simple distance filter (approximate)
export async function getNearbyEvents(lat: number, lng: number, radiusKm = 5) {
  const R = 6371; // Earth radius in km
  const latRange = (radiusKm / R) * (180 / Math.PI);
  const lngRange =
    (radiusKm / (R * Math.cos((Math.PI * lat) / 180))) * (180 / Math.PI);

  return prisma.event.findMany({
    where: {
      latitude: { gte: lat - latRange, lte: lat + latRange },
      longitude: { gte: lng - lngRange, lte: lng + lngRange },
    },
  });
}

export async function getEventsInBounds(
  swLat: number,
  swLng: number,
  neLat: number,
  neLng: number
) {
  return prisma.event.findMany({
    where: {
      latitude: { gte: swLat, lte: neLat },
      longitude: { gte: swLng, lte: neLng },
    },
    include: {
      category: true,
    },
  });
}
