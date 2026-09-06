import { describe, expect, it } from "vitest";
import { canBookBlock, getBlockDurationHours, overlaps, toMinutes } from "@/lib/scheduler";
import type { AvailabilityBlock, Booking } from "@/lib/mock-data";

const block: AvailabilityBlock = {
  id: "block-1",
  sitterId: "charlotte",
  start: "2026-09-11T16:00:00",
  end: "2026-09-11T20:00:00",
  status: "open",
  label: "Friday evening",
};

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    availabilityId: block.id,
    parentId: "parent-1",
    sitterId: block.sitterId,
    start: "2026-09-11T17:00:00",
    end: "2026-09-11T18:00:00",
    status: "confirmed",
    parentName: "The Smiths",
    notes: "",
    ...overrides,
  };
}

describe("toMinutes", () => {
  it("converts an ISO wall-clock string to minutes since epoch", () => {
    expect(toMinutes("2026-09-11T16:00:00")).toBe(toMinutes("2026-09-11T16:00:00"));
    expect(toMinutes("2026-09-11T17:00:00") - toMinutes("2026-09-11T16:00:00")).toBe(60);
  });
});

describe("overlaps", () => {
  it("detects overlapping ranges", () => {
    expect(overlaps("2026-09-11T16:00:00", "2026-09-11T18:00:00", "2026-09-11T17:00:00", "2026-09-11T19:00:00")).toBe(true);
  });

  it("treats touching but non-overlapping ranges as not overlapping", () => {
    expect(overlaps("2026-09-11T16:00:00", "2026-09-11T17:00:00", "2026-09-11T17:00:00", "2026-09-11T18:00:00")).toBe(false);
  });

  it("returns false for ranges that do not intersect at all", () => {
    expect(overlaps("2026-09-11T16:00:00", "2026-09-11T17:00:00", "2026-09-11T20:00:00", "2026-09-11T21:00:00")).toBe(false);
  });
});

describe("getBlockDurationHours", () => {
  it("computes the duration of a block in hours", () => {
    expect(getBlockDurationHours(block)).toBe(4);
  });
});

describe("canBookBlock", () => {
  it("allows a booking fully within the block window with no conflicts", () => {
    expect(canBookBlock(block, "2026-09-11T16:00:00", "2026-09-11T18:00:00", [])).toBe(true);
  });

  it("rejects a candidate end at or before the candidate start", () => {
    expect(canBookBlock(block, "2026-09-11T17:00:00", "2026-09-11T17:00:00", [])).toBe(false);
    expect(canBookBlock(block, "2026-09-11T18:00:00", "2026-09-11T17:00:00", [])).toBe(false);
  });

  it("rejects a candidate that starts before the block window", () => {
    expect(canBookBlock(block, "2026-09-11T15:00:00", "2026-09-11T17:00:00", [])).toBe(false);
  });

  it("rejects a candidate that ends after the block window", () => {
    expect(canBookBlock(block, "2026-09-11T19:00:00", "2026-09-11T21:00:00", [])).toBe(false);
  });

  it("rejects a candidate that overlaps an existing confirmed booking", () => {
    const existing = [booking({ start: "2026-09-11T17:00:00", end: "2026-09-11T18:00:00" })];
    expect(canBookBlock(block, "2026-09-11T17:30:00", "2026-09-11T18:30:00", existing)).toBe(false);
  });

  it("allows a candidate that overlaps a cancelled booking", () => {
    const existing = [booking({ start: "2026-09-11T17:00:00", end: "2026-09-11T18:00:00", status: "cancelled" })];
    expect(canBookBlock(block, "2026-09-11T17:30:00", "2026-09-11T18:30:00", existing)).toBe(true);
  });

  it("ignores bookings tied to a different availability block", () => {
    const existing = [booking({ availabilityId: "block-other", start: "2026-09-11T17:00:00", end: "2026-09-11T18:00:00" })];
    expect(canBookBlock(block, "2026-09-11T17:00:00", "2026-09-11T18:00:00", existing)).toBe(true);
  });

  it("allows adjacent (back-to-back) bookings that do not overlap", () => {
    const existing = [booking({ start: "2026-09-11T16:00:00", end: "2026-09-11T17:00:00" })];
    expect(canBookBlock(block, "2026-09-11T17:00:00", "2026-09-11T18:00:00", existing)).toBe(true);
  });
});
