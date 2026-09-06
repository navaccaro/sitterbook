import { NextResponse } from "next/server";
import { cancelBooking, createBookingForBlock, getAvailabilityBlocks, getBookings, getRegistrationRequests, getUserById } from "@/lib/store";
import { getCurrentSession } from "@/lib/auth";

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET() {
  const bookings = await getBookings();
  return NextResponse.json(bookings);
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication is required before booking." }, { status: 401 });
  }

  const body = (await request.json()) as {
    blockId?: string;
    parentId?: string;
    parentName?: string;
    parentEmail?: string;
    start?: string;
    end?: string;
    notes?: string;
  };

  if (!body.blockId || !body.parentId || !body.parentName || !body.parentEmail || !body.start || !body.end) {
    return NextResponse.json({ error: "Missing booking details." }, { status: 400 });
  }

  const user = await getUserById(body.parentId);
  const requests = await getRegistrationRequests();
  const approvedRequest = requests.find(
    (request) => normaliseEmail(request.email) === normaliseEmail(body.parentEmail ?? "") && request.status === "approved",
  );
  const isMatchingSession = session.userId === body.parentId && normaliseEmail(session.email) === normaliseEmail(body.parentEmail);
  const isApprovedFamily = isMatchingSession && user?.role === "parent" && user.approved && normaliseEmail(user.email) === normaliseEmail(body.parentEmail);

  if (!isMatchingSession || (!isApprovedFamily && !approvedRequest)) {
    return NextResponse.json({ error: "Family approval is required before booking." }, { status: 403 });
  }

  const blocks = await getAvailabilityBlocks();
  const block = blocks.find((item) => item.id === body.blockId);

  if (!block) {
    return NextResponse.json({ error: "Availability block not found." }, { status: 404 });
  }

  try {
    const booking = await createBookingForBlock(
      block,
      body.parentId,
      body.parentName,
      body.start,
      body.end,
      body.notes ?? "",
    );

    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: "Booking conflicts with existing reservations." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication is required before cancelling." }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string; parentId?: string; parentEmail?: string };

  if (!body.id || !body.parentId || !body.parentEmail) {
    return NextResponse.json({ error: "Booking id and family identity are required." }, { status: 400 });
  }

  const bookings = await getBookings();
  const booking = bookings.find((item) => item.id === body.id);
  const user = await getUserById(body.parentId);
  const requests = await getRegistrationRequests();
  const approvedRequest = requests.find(
    (request) => normaliseEmail(request.email) === normaliseEmail(body.parentEmail ?? "") && request.status === "approved",
  );
  const isMatchingSession = session.userId === body.parentId && normaliseEmail(session.email) === normaliseEmail(body.parentEmail);
  const isApprovedFamily = isMatchingSession && user?.role === "parent" && user.approved && normaliseEmail(user.email) === normaliseEmail(body.parentEmail);

  if (!booking || booking.parentId !== body.parentId || !isMatchingSession || (!isApprovedFamily && !approvedRequest)) {
    return NextResponse.json({ error: "Booking not found for this family." }, { status: 404 });
  }

  const cancelled = await cancelBooking(booking.id);

  if (!cancelled) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  return NextResponse.json(cancelled);
}
