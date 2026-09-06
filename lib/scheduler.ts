import { bookings, type Booking, type AvailabilityBlock } from "@/lib/mock-data";

export function toMinutes(value: string) {
  const date = new Date(value);
  return date.getTime() / 1000 / 60;
}

export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

export function getExistingBookingsForBlock(blockId: string) {
  return bookings.filter((booking) => booking.availabilityId === blockId);
}

export function canBookBlock(
  block: AvailabilityBlock,
  candidateStart: string,
  candidateEnd: string,
  existing: Booking[] = bookings,
) {
  const withinWindow =
    toMinutes(candidateStart) >= toMinutes(block.start) &&
    toMinutes(candidateEnd) <= toMinutes(block.end);

  if (!withinWindow) {
    return false;
  }

  return !existing.some(
    (booking) =>
      booking.availabilityId === block.id &&
      booking.status !== "cancelled" &&
      overlaps(candidateStart, candidateEnd, booking.start, booking.end),
  );
}
