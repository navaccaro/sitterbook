import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getGoogleCalendarEvent, googleConfigured, saveGoogleCalendarEvent } from "@/lib/google";
import { getBookings, getBookingById, saveGoogleEventId, updateBookingSchedule } from "@/lib/store";

export async function POST(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 503 });
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in with Google before syncing calendar events." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { bookingId?: string };
  const bookings = body.bookingId ? [await getBookingById(body.bookingId)] : await getBookings();
  const familyBookings = bookings.filter((booking) => booking?.parentId === session.userId && booking.status !== "cancelled");

  if (familyBookings.length === 0) {
    return NextResponse.json({ synced: 0, message: "No active family bookings to sync." });
  }

  try {
    const synced = [];
    for (const booking of familyBookings) {
      if (!booking) continue;
      let currentBooking = booking;

      if (currentBooking.googleEventId) {
        const googleEvent = await getGoogleCalendarEvent(session.userId, currentBooking.googleEventId);

        if (googleEvent?.status === "cancelled") {
          currentBooking = await updateBookingSchedule(currentBooking.id, { status: "cancelled" });
        } else if (googleEvent?.start?.dateTime && googleEvent.end?.dateTime) {
          const googleStart = googleEvent.start.dateTime.replace(/Z$/, "");
          const googleEnd = googleEvent.end.dateTime.replace(/Z$/, "");

          if (googleStart !== currentBooking.start || googleEnd !== currentBooking.end) {
            currentBooking = await updateBookingSchedule(currentBooking.id, { start: googleStart, end: googleEnd });
          }
        }
      }

      if (currentBooking.status === "cancelled") continue;
      const event = await saveGoogleCalendarEvent(session.userId, booking.googleEventId, {
        summary: `SitterBook: ${currentBooking.parentName}`,
        description: currentBooking.notes || "SitterBook booking",
        start: currentBooking.start,
        end: currentBooking.end,
      });

      if (event.id && event.id !== currentBooking.googleEventId) {
        await saveGoogleEventId(currentBooking.id, event.id);
      }
      synced.push({ bookingId: currentBooking.id, eventId: event.id, htmlLink: event.htmlLink });
    }

    return NextResponse.json({ synced: synced.length, events: synced });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
