import { NextResponse } from "next/server";
import { cancelBooking, createBookingForBlock, getAvailabilityBlocks, getBookings, getRegistrationRequests, getUserById, isConnected } from "@/lib/store";
import { getCurrentSession } from "@/lib/auth";

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const [bookings, user] = await Promise.all([getBookings(), getUserById(session.userId)]);
  const isPrivileged = user?.role === "admin";

  const visible = bookings.map((booking) => {
    if (isPrivileged || booking.parentId === session.userId || booking.sitterId === session.userId) {
      return booking;
    }

    return { ...booking, notes: "", parentName: "Reserved" };
  });

  return NextResponse.json(visible);
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

  if (!(await isConnected(block.sitterId, body.parentId))) {
    return NextResponse.json({ error: "Connect with this sitter before booking their time." }, { status: 403 });
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
