import type { Booking, AvailabilityBlock } from "@/lib/mock-data";

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

export function getBlockDurationHours(block: AvailabilityBlock) {
  return (
    (new Date(block.end).getTime() - new Date(block.start).getTime()) / 3600000
  );
}

export function canBookBlock(
  block: AvailabilityBlock,
  candidateStart: string,
  candidateEnd: string,
  existing: Booking[],
) {
  if (new Date(candidateEnd) <= new Date(candidateStart)) {
    return false;
  }

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

