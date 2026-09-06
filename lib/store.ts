import { randomUUID } from "node:crypto";
import type { AvailabilityBlock, Booking, User } from "@/lib/mock-data";
import { availabilityBlocks as defaultAvailabilityBlocks, bookings as defaultBookings, users as defaultUsers } from "@/lib/mock-data";
import { demoRegistrationRequests, type RegistrationRequest } from "@/lib/registration";
import { canBookBlock } from "@/lib/scheduler";
import { prisma } from "@/lib/prisma";

export type Session = {
  token: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
  expiresAt: string;
};

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

function toWallClockDate(value: string) {
  return new Date(value.endsWith("Z") ? value : `${value}Z`);
}

function toWallClockString(value: Date) {
  return value.toISOString().slice(0, 19);
}

function toAvailabilityBlock(block: {
  id: string;
  sitterId: string;
  start: Date;
  end: Date;
  status: string;
  label: string;
}): AvailabilityBlock {
  return {
    id: block.id,
    sitterId: block.sitterId,
    start: toWallClockString(block.start),
    end: toWallClockString(block.end),
    status: block.status as AvailabilityBlock["status"],
    label: block.label,
  };
}

function toRegistrationRequest(request: {
  id: string;
  name: string;
  email: string;
  provider: string;
  status: string;
  requestedAt: Date;
}): RegistrationRequest {
  return {
    id: request.id,
    name: request.name,
    email: request.email,
    provider: request.provider as RegistrationRequest["provider"],
    status: request.status as RegistrationRequest["status"],
    requestedAt: request.requestedAt.toISOString(),
  };
}

function toBooking(booking: {
  id: string;
  availabilityId: string;
  parentId: string;
  sitterId: string;
  start: Date;
  end: Date;
  status: string;
  parentName: string;
}): Booking {
  return {
    id: booking.id,
    availabilityId: booking.availabilityId,
    parentId: booking.parentId,
    sitterId: booking.sitterId,
    start: toWallClockString(booking.start),
    end: toWallClockString(booking.end),
    status: booking.status as Booking["status"],
    parentName: booking.parentName,
  };
}

function toUser(user: { id: string; name: string; email: string; role: string; approved: boolean }): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as User["role"],
    approved: user.approved,
  };
}

async function ensureSeeded() {
  if (await prisma.user.count() > 0) {
    return;
  }

  await prisma.$transaction([
    prisma.user.createMany({ data: defaultUsers }),
    prisma.registrationRequest.createMany({
      data: demoRegistrationRequests.map((request) => ({
        ...request,
        requestedAt: new Date(request.requestedAt),
      })),
    }),
    prisma.availabilityBlock.createMany({
      data: defaultAvailabilityBlocks.map((block) => ({
        ...block,
        start: toWallClockDate(block.start),
        end: toWallClockDate(block.end),
      })),
    }),
    prisma.booking.createMany({
      data: defaultBookings.map((booking) => ({
        ...booking,
        start: toWallClockDate(booking.start),
        end: toWallClockDate(booking.end),
      })),
    }),
  ]);
}

export async function getRegistrationRequests(): Promise<RegistrationRequest[]> {
  await ensureSeeded();
  const requests = await prisma.registrationRequest.findMany({ orderBy: { requestedAt: "asc" } });
  return requests.map(toRegistrationRequest);
}

export async function getAvailabilityBlocks(): Promise<AvailabilityBlock[]> {
  await ensureSeeded();
  const blocks = await prisma.availabilityBlock.findMany({ orderBy: { start: "asc" } });
  return blocks.map(toAvailabilityBlock);
}

export async function getBookings(): Promise<Booking[]> {
  await ensureSeeded();
  const bookings = await prisma.booking.findMany({ orderBy: { start: "asc" } });
  return bookings.map(toBooking);
}

export async function getUserById(userId: string): Promise<User | null> {
  await ensureSeeded();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toUser(user) : null;
}

export async function upsertRegistrationRequest(
  profile: { name: string; email: string },
  provider: "google" = "google",
) {
  await ensureSeeded();
  const email = normaliseEmail(profile.email);
  const existing = await prisma.registrationRequest.findUnique({ where: { email } });

  if (existing) {
    const updated = await prisma.registrationRequest.update({
      where: { id: existing.id },
      data: { name: profile.name.trim() || existing.name, provider },
    });
    return toRegistrationRequest(updated);
  }

  const created = await prisma.registrationRequest.create({
    data: {
      id: `request-${Date.now()}`,
      name: profile.name.trim(),
      email,
      provider,
      status: "pending",
      requestedAt: new Date(),
    },
  });
  return toRegistrationRequest(created);
}

export async function updateRegistrationStatus(requestId: string, status: "approved" | "rejected") {
  await ensureSeeded();
  const current = await prisma.registrationRequest.findUnique({ where: { id: requestId } });

  if (!current) {
    return null;
  }

  return toRegistrationRequest(await prisma.registrationRequest.update({ where: { id: requestId }, data: { status } }));
}

export async function saveAvailabilityBlocks(blocks: AvailabilityBlock[]) {
  await ensureSeeded();
  await prisma.$transaction([
    prisma.availabilityBlock.deleteMany(),
    prisma.availabilityBlock.createMany({
      data: blocks.map((block) => ({
        ...block,
        start: toWallClockDate(block.start),
        end: toWallClockDate(block.end),
      })),
    }),
  ]);
  return blocks;
}

export async function createAvailabilityBlock(block: AvailabilityBlock) {
  await ensureSeeded();
  await prisma.availabilityBlock.create({
    data: { ...block, start: toWallClockDate(block.start), end: toWallClockDate(block.end) },
  });
  return block;
}

export async function updateAvailabilityBlock(blockId: string, updates: Partial<AvailabilityBlock>) {
  await ensureSeeded();
  const existing = await prisma.availabilityBlock.findUnique({ where: { id: blockId } });

  if (!existing) {
    return null;
  }

  const updated = await prisma.availabilityBlock.update({
    where: { id: blockId },
    data: {
      ...updates,
      start: updates.start ? toWallClockDate(updates.start) : undefined,
      end: updates.end ? toWallClockDate(updates.end) : undefined,
    },
  });
  return toAvailabilityBlock(updated);
}

export async function deleteAvailabilityBlock(blockId: string) {
  await ensureSeeded();
  await prisma.availabilityBlock.deleteMany({ where: { id: blockId } });
  return getAvailabilityBlocks();
}

export async function createBookingForBlock(
  block: AvailabilityBlock,
  parentId: string,
  parentName: string,
  candidateStart: string,
  candidateEnd: string,
) {
  await ensureSeeded();
  const bookings = await getBookings();

  if (!canBookBlock(block, candidateStart, candidateEnd, bookings)) {
    throw new Error("Booking request conflicts with the availability window.");
  }

  const booking = {
    id: `booking-${Date.now()}`,
    availabilityId: block.id,
    parentId,
    sitterId: block.sitterId,
    start: toWallClockDate(candidateStart),
    end: toWallClockDate(candidateEnd),
    status: "confirmed",
    parentName,
  } as const;

  await prisma.booking.create({ data: booking });
  return toBooking(booking);
}

export async function cancelBooking(bookingId: string) {
  await ensureSeeded();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) {
    return null;
  }

  return toBooking(await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
  }));
}

export async function createSession(profile: { name: string; email: string }) {
  await ensureSeeded();
  const matchingUser = await prisma.user.findFirst({
    where: { role: "parent", email: normaliseEmail(profile.email) },
  });
  const createdAt = new Date();
  const session: Session = {
    token: randomUUID(),
    userId: matchingUser?.id ?? `family-${normaliseEmail(profile.email).replace(/[^a-z0-9]+/g, "-")}`,
    name: profile.name.trim(),
    email: normaliseEmail(profile.email),
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  await prisma.session.create({ data: { ...session, createdAt, expiresAt: new Date(session.expiresAt) } });
  return session;
}

export async function getSession(token: string) {
  await ensureSeeded();
  const session = await prisma.session.findUnique({ where: { token } });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

export async function deleteSession(token: string) {
  await ensureSeeded();
  await prisma.session.deleteMany({ where: { token } });
}
