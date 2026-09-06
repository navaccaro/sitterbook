export type UserRole = "admin" | "sitter" | "parent";
export type AvailabilityStatus = "open" | "partial" | "booked";
export type BookingStatus = "confirmed" | "pending" | "cancelled";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  approved: boolean;
};

export type AvailabilityBlock = {
  id: string;
  sitterId: string;
  start: string;
  end: string;
  status: AvailabilityStatus;
  label: string;
};

export type Booking = {
  id: string;
  availabilityId: string;
  parentId: string;
  sitterId: string;
  start: string;
  end: string;
  status: BookingStatus;
  parentName: string;
};

export const users: User[] = [
  {
    id: "admin-1",
    name: "Mom Admin",
    email: "admin@sitterbook.app",
    role: "admin",
    approved: true,
  },
  {
    id: "charlotte",
    name: "Charlotte",
    email: "charlotte@sitterbook.app",
    role: "sitter",
    approved: true,
  },
  {
    id: "emma",
    name: "Emma",
    email: "emma@sitterbook.app",
    role: "sitter",
    approved: true,
  },
  {
    id: "parent-1",
    name: "The Smiths",
    email: "smiths@example.com",
    role: "parent",
    approved: true,
  },
  {
    id: "parent-2",
    name: "The Lopez Family",
    email: "lopez@example.com",
    role: "parent",
    approved: false,
  },
];

export const availabilityBlocks: AvailabilityBlock[] = [
  {
    id: "block-1",
    sitterId: "charlotte",
    start: "2026-09-11T16:00:00",
    end: "2026-09-11T23:00:00",
    status: "partial",
    label: "Friday evening availability",
  },
  {
    id: "block-2",
    sitterId: "charlotte",
    start: "2026-09-12T13:00:00",
    end: "2026-09-12T16:00:00",
    status: "open",
    label: "Saturday afternoon availability",
  },
  {
    id: "block-3",
    sitterId: "emma",
    start: "2026-09-13T18:00:00",
    end: "2026-09-13T22:00:00",
    status: "open",
    label: "Sunday evening slot",
  },
];

export const bookings: Booking[] = [
  {
    id: "booking-1",
    availabilityId: "block-1",
    parentId: "parent-1",
    sitterId: "charlotte",
    start: "2026-09-11T18:00:00",
    end: "2026-09-11T20:30:00",
    status: "confirmed",
    parentName: "The Smiths",
  },
  {
    id: "booking-2",
    availabilityId: "block-3",
    parentId: "parent-1",
    sitterId: "emma",
    start: "2026-09-13T19:00:00",
    end: "2026-09-13T21:00:00",
    status: "pending",
    parentName: "The Smiths",
  },
];

export function getUserById(id: string) {
  return users.find((user) => user.id === id);
}
