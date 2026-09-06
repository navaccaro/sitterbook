import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/store", () => ({
  getBookings: vi.fn(),
  getUserById: vi.fn(),
  getAvailabilityBlocks: vi.fn(),
  getRegistrationRequests: vi.fn(),
  createBookingForBlock: vi.fn(),
  cancelBooking: vi.fn(),
  isConnected: vi.fn(),
}));

import { getCurrentSession } from "@/lib/auth";
import { getAvailabilityBlocks, getBookings, getRegistrationRequests, getUserById, isConnected } from "@/lib/store";
import { GET, POST } from "@/app/api/bookings/route";

const bookings = [
  {
    id: "b1",
    availabilityId: "block-1",
    parentId: "parent-1",
    sitterId: "charlotte",
    start: "2026-09-11T18:00:00",
    end: "2026-09-11T20:00:00",
    status: "confirmed",
    parentName: "The Smiths",
    notes: "Smiths' private notes",
  },
  {
    id: "b2",
    availabilityId: "block-2",
    parentId: "parent-2",
    sitterId: "emma",
    start: "2026-09-12T18:00:00",
    end: "2026-09-12T20:00:00",
    status: "confirmed",
    parentName: "The Lopez Family",
    notes: "Lopez private notes",
  },
];

beforeEach(() => {
  vi.mocked(getCurrentSession).mockReset();
  vi.mocked(getBookings).mockReset();
  vi.mocked(getUserById).mockReset();
  vi.mocked(getBookings).mockResolvedValue(bookings as never);
});

describe("GET /api/bookings", () => {
  it("requires authentication", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("redacts notes and parent name for bookings that do not belong to the caller", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "parent-1", email: "smiths@sitterbook.app" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "parent-1", role: "parent", approved: true } as never);

    const data = (await (await GET()).json()) as typeof bookings;
    const own = data.find((booking) => booking.id === "b1")!;
    const other = data.find((booking) => booking.id === "b2")!;

    expect(own.notes).toBe("Smiths' private notes");
    expect(other.notes).toBe("");
    expect(other.parentName).toBe("Reserved");
  });

  it("returns full details for admins regardless of ownership", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "admin-1", email: "admin@sitterbook.app" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "admin-1", role: "admin", approved: true } as never);

    const data = (await (await GET()).json()) as typeof bookings;
    expect(data.every((booking) => booking.notes !== "")).toBe(true);
  });

  it("returns full details for the sitter who owns the booking", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "emma", email: "emma@sitterbook.app" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "emma", role: "sitter", approved: true } as never);

    const data = (await (await GET()).json()) as typeof bookings;
    const owned = data.find((booking) => booking.id === "b2")!;
    const other = data.find((booking) => booking.id === "b1")!;

    expect(owned.notes).toBe("Lopez private notes");
    expect(other.notes).toBe("");
  });
});

describe("POST /api/bookings", () => {
  const parentSession = { userId: "parent-1", email: "smiths@sitterbook.app" };
  const block = {
    id: "block-1",
    sitterId: "charlotte",
    start: "2026-09-20T10:00:00",
    end: "2026-09-20T12:00:00",
    status: "open",
    label: "Saturday morning",
  };

  function postRequest(body: unknown) {
    return new Request("http://localhost/api/bookings", { method: "POST", body: JSON.stringify(body) });
  }

  beforeEach(() => {
    vi.mocked(getAvailabilityBlocks).mockReset();
    vi.mocked(getRegistrationRequests).mockReset();
    vi.mocked(isConnected).mockReset();
    vi.mocked(getAvailabilityBlocks).mockResolvedValue([block] as never);
    vi.mocked(getRegistrationRequests).mockResolvedValue([] as never);
    vi.mocked(getCurrentSession).mockResolvedValue(parentSession as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "parent-1", role: "parent", approved: true, email: "smiths@sitterbook.app" } as never);
  });

  const bookingBody = {
    blockId: "block-1",
    parentId: "parent-1",
    parentName: "The Smiths",
    parentEmail: "smiths@sitterbook.app",
    start: "2026-09-20T10:00:00",
    end: "2026-09-20T11:00:00",
  };

  it("rejects booking a sitter the family is not connected to", async () => {
    vi.mocked(isConnected).mockResolvedValue(false);

    const response = await POST(postRequest(bookingBody));
    expect(response.status).toBe(403);
    expect(isConnected).toHaveBeenCalledWith("charlotte", "parent-1");
  });

  it("allows booking once the family and sitter are connected", async () => {
    vi.mocked(isConnected).mockResolvedValue(true);
    const { createBookingForBlock } = await import("@/lib/store");
    vi.mocked(createBookingForBlock).mockResolvedValue({ id: "booking-new" } as never);

    const response = await POST(postRequest(bookingBody));
    expect(response.status).toBe(200);
  });
});
