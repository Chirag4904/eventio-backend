import 'dotenv/config';
import { PrismaClient, Visibility, RSVPStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

async function main() {
  console.log('Starting CSV-based seed...');

  // Clean existing data in dependency order
  console.log('Clearing existing data...');
  await prisma.eventAttendee.deleteMany();
  await prisma.eventImage.deleteMany();
  await prisma.event.deleteMany();
  await prisma.eventCategory.deleteMany();
  await prisma.user.deleteMany();

  // Load CSV files
  const dataDir = path.join(__dirname, 'mock_data');
  const usersCsv = path.join(dataDir, 'users.csv');
  const categoriesCsv = path.join(dataDir, 'categories.csv');
  const eventsCsv = path.join(dataDir, 'events.csv');
  const attendeesCsv = path.join(dataDir, 'event_attendees.csv');
  const imagesCsv = path.join(dataDir, 'event_images.csv');

  const users = parseCsv(usersCsv);
  const categories = parseCsv(categoriesCsv);
  const events = parseCsv(eventsCsv);
  const attendees = parseCsv(attendeesCsv);
  const images = parseCsv(imagesCsv);

  console.log(`Loaded: users=${users.length}, categories=${categories.length}, events=${events.length}, attendees=${attendees.length}, images=${images.length}`);

  // Seed Users
  console.log('Seeding users...');
  for (const u of users) {
    await prisma.user.create({
      data: {
        name: u.name || null,
        email: u.email || null,
        phone: u.phone || null,
        profileImage: u.profileImage || null,
        bio: u.bio || null,
        latitude: u.latitude ? parseFloat(u.latitude) : null,
        longitude: u.longitude ? parseFloat(u.longitude) : null,
        lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt) : null,
      },
    });
  }

  // Seed Categories
  console.log('Seeding categories...');
  for (const c of categories) {
    if (!c.name) continue;
    await prisma.eventCategory.create({ data: { name: c.name } });
  }

  // Seed Events
  console.log('Seeding events...');
  for (const e of events) {
    const createdBy = await prisma.user.findUnique({ where: { email: e.createdByEmail } });
    if (!createdBy) {
      console.warn(`Skipping event '${e.title}' - creator not found: ${e.createdByEmail}`);
      continue;
    }
    const category = e.categoryName ? await prisma.eventCategory.findUnique({ where: { name: e.categoryName } }) : null;
    const visibilityStr = (e.visibility || 'PUBLIC').toUpperCase();
    const visibility = (['PUBLIC', 'PRIVATE', 'INVITE_ONLY'].includes(visibilityStr) ? visibilityStr : 'PUBLIC') as Visibility;

    await prisma.event.create({
      data: {
        title: e.title,
        description: e.description || null,
        startTime: e.startTime ? new Date(e.startTime) : null,
        endTime: e.endTime ? new Date(e.endTime) : null,
        latitude: e.latitude ? parseFloat(e.latitude) : 0,
        longitude: e.longitude ? parseFloat(e.longitude) : 0,
        address: e.address || null,
        city: e.city || null,
        categoryId: category?.id ?? null,
        createdById: createdBy.id,
        visibility,
      },
    });
  }

  // Seed Attendees
  console.log('Seeding attendees...');
  for (const a of attendees) {
    const user = await prisma.user.findUnique({ where: { email: a.userEmail } });
    const event = await prisma.event.findFirst({
      where: { title: a.eventTitle, createdBy: { email: a.eventCreatedByEmail } },
    });
    if (!user || !event) {
      console.warn(`Skipping attendee for event='${a.eventTitle}', user='${a.userEmail}'`);
      continue;
    }
    const statusStr = (a.status || 'INTERESTED').toUpperCase();
    const status = (['INTERESTED', 'GOING'].includes(statusStr) ? statusStr : 'INTERESTED') as RSVPStatus;
    await prisma.eventAttendee.create({ data: { userId: user.id, eventId: event.id, status } });
  }

  // Seed Images
  console.log('Seeding images...');
  for (const i of images) {
    const event = await prisma.event.findFirst({
      where: { title: i.eventTitle, createdBy: { email: i.eventCreatedByEmail } },
    });
    if (!event) {
      console.warn(`Skipping image for event='${i.eventTitle}'`);
      continue;
    }
    await prisma.eventImage.create({ data: { eventId: event.id, imageUrl: i.imageUrl } });
  }

  console.log('Seed completed.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });