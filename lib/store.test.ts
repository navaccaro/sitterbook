import { beforeEach, describe, expect, it, vi } from "vitest";

type Where = Record<string, unknown> | undefined;
type Select = Record<string, boolean> | undefined;

function matches(record: Record<string, unknown>, where: Where) {
  if (!where) {
    return true;
  }
  return Object.entries(where).every(([key, value]) => record[key] === value);
}

function project(record: Record<string, unknown>, select: Select) {
  if (!select) {
    return { ...record };
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(select)) {
    result[key] = record[key];
  }
  return result;
}

function createModel() {
  const table = new Map<string, Record<string, unknown>>();

  return {
    count: async () => table.size,
    findFirst: async ({ where }: { where?: Where } = {}) => {
      for (const record of table.values()) {
        if (matches(record, where)) {
          return { ...record };
        }
      }
      return null;
    },
    findUnique: async ({ where, select }: { where: Where; select?: Select }) => {
      for (const record of table.values()) {
        if (matches(record, where)) {
          return project(record, select);
        }
      }
      return null;
    },
    findMany: async ({ where, orderBy }: { where?: Where; orderBy?: Record<string, "asc" | "desc"> } = {}) => {
      const records = [...table.values()].filter((record) => matches(record, where)).map((record) => ({ ...record }));

      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        records.sort((a, b) => {
          const left = a[field];
          const right = b[field];
          const diff = left! > right! ? 1 : left! < right! ? -1 : 0;
          return direction === "desc" ? -diff : diff;
        });
      }

      return records;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      table.set(String(data.id), { ...data });
      return { ...data };
    },
    createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
      for (const item of data) {
        table.set(String(item.id), { ...item });
      }
      return { count: data.length };
    },
    update: async ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
      for (const [key, record] of table.entries()) {
        if (matches(record, where)) {
          const changes = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
          const updated = { ...record, ...changes };
          table.set(key, updated);
          return { ...updated };
        }
      }
      throw new Error("Record to update not found.");
    },
    deleteMany: async ({ where }: { where?: Where } = {}) => {
      let count = 0;
      for (const [key, record] of table.entries()) {
        if (matches(record, where)) {
          table.delete(key);
          count += 1;
        }
      }
      return { count };
    },
  };
}

function createFakePrisma() {
  return {
    user: createModel(),
    registrationRequest: createModel(),
    availabilityBlock: createModel(),
    booking: createModel(),
    session: createModel(),
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  };
}

async function loadStore() {
  vi.resetModules();
  vi.doMock("@/lib/prisma", () => ({ prisma: createFakePrisma() }));
  return import("@/lib/store");
}

beforeEach(() => {
  vi.stubEnv("TOKEN_ENCRYPTION_KEY", "test-token-encryption-key");
});

describe("seeding", () => {
  it("seeds sitters from mock data on first read", async () => {
    const store = await loadStore();
    const sitters = await store.getSitters();

    expect(sitters.map((sitter) => sitter.id).sort()).toEqual(["charlotte", "emma"]);
  });
});

describe("createSitter", () => {
  it("creates a new sitter with a derived id", async () => {
    const store = await loadStore();
    const sitter = await store.createSitter({ name: "New Sitter", email: "New.Sitter@Sitterbook.app" });

    expect(sitter.role).toBe("sitter");
    expect(sitter.approved).toBe(true);
    expect(sitter.email).toBe("new.sitter@sitterbook.app");
  });

  it("rejects a duplicate email regardless of case", async () => {
    const store = await loadStore();
    await store.createSitter({ name: "New Sitter", email: "dup@sitterbook.app" });

    await expect(store.createSitter({ name: "Someone Else", email: "DUP@sitterbook.app" })).rejects.toThrow(
      "A user with that email already exists.",
    );
  });
});

describe("setSitterApproved", () => {
  it("toggles approval for an existing sitter", async () => {
    const store = await loadStore();
    const updated = await store.setSitterApproved("charlotte", false);

    expect(updated?.approved).toBe(false);
  });

  it("returns null for a non-existent user", async () => {
    const store = await loadStore();
    expect(await store.setSitterApproved("no-such-user", true)).toBeNull();
  });

  it("returns null when targeting a non-sitter user", async () => {
    const store = await loadStore();
    expect(await store.setSitterApproved("parent-1", false)).toBeNull();
  });
});

describe("createSession", () => {
  it("resolves to an existing user's id regardless of role", async () => {
    const store = await loadStore();
    const session = await store.createSession({ name: "Mom Admin", email: "admin@sitterbook.app" });

    expect(session.userId).toBe("admin-1");
  });

  it("resolves an existing sitter by email", async () => {
    const store = await loadStore();
    const session = await store.createSession({ name: "Charlotte", email: "charlotte@sitterbook.app" });

    expect(session.userId).toBe("charlotte");
  });

  it("fabricates a family id for an unrecognised email", async () => {
    const store = await loadStore();
    const session = await store.createSession({ name: "New Family", email: "newfamily@sitterbook.app" });

    expect(session.userId).toBe("family-newfamily-sitterbook-app");
  });
});

describe("getSession", () => {
  it("returns the session while still valid", async () => {
    const store = await loadStore();
    const created = await store.createSession({ name: "New Family", email: "expired@sitterbook.app" });

    expect(await store.getSession(created.token)).not.toBeNull();
  });

  it("returns null once the session has expired", async () => {
    vi.useFakeTimers();
    try {
      const store = await loadStore();
      const created = await store.createSession({ name: "New Family", email: "expired@sitterbook.app" });

      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

      expect(await store.getSession(created.token)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns null for an unknown token", async () => {
    const store = await loadStore();
    expect(await store.getSession("does-not-exist")).toBeNull();
  });
});

describe("availability blocks", () => {
  it("creates, updates, and deletes a block", async () => {
    const store = await loadStore();
    const created = await store.createAvailabilityBlock({
      id: "block-new",
      sitterId: "charlotte",
      start: "2026-09-20T10:00:00",
      end: "2026-09-20T12:00:00",
      status: "open",
      label: "Sunday morning",
    });
    expect(created.id).toBe("block-new");

    const updated = await store.updateAvailabilityBlock("block-new", { label: "Updated label" });
    expect(updated?.label).toBe("Updated label");

    const remaining = await store.deleteAvailabilityBlock("block-new");
    expect(remaining.some((block) => block.id === "block-new")).toBe(false);
  });

  it("returns null when updating a block that does not exist", async () => {
    const store = await loadStore();
    expect(await store.updateAvailabilityBlock("missing-block", { label: "x" })).toBeNull();
  });
});

describe("createBookingForBlock", () => {
  it("creates a booking within an open window", async () => {
    const store = await loadStore();
    const blocks = await store.getAvailabilityBlocks();
    const block = blocks.find((item) => item.id === "block-2")!;

    const booking = await store.createBookingForBlock(
      block,
      "parent-1",
      "The Smiths",
      "2026-09-12T13:00:00",
      "2026-09-12T15:00:00",
      "Notes",
    );

    expect(booking.status).toBe("confirmed");
    expect(booking.availabilityId).toBe(block.id);
  });

  it("throws when the requested time conflicts with an existing booking", async () => {
    const store = await loadStore();
    const blocks = await store.getAvailabilityBlocks();
    const block = blocks.find((item) => item.id === "block-1")!;

    await expect(
      store.createBookingForBlock(block, "parent-1", "The Smiths", "2026-09-11T18:00:00", "2026-09-11T20:00:00", ""),
    ).rejects.toThrow("Booking request conflicts with the availability window.");
  });
});

describe("cancelBooking", () => {
  it("marks an existing booking as cancelled", async () => {
    const store = await loadStore();
    const cancelled = await store.cancelBooking("booking-1");

    expect(cancelled?.status).toBe("cancelled");
  });

  it("returns null for a booking that does not exist", async () => {
    const store = await loadStore();
    expect(await store.cancelBooking("no-such-booking")).toBeNull();
  });
});

describe("registration requests", () => {
  it("creates a new registration request for a new email", async () => {
    const store = await loadStore();
    const created = await store.upsertRegistrationRequest({
      name: "The Garcias",
      email: "garcias@sitterbook.app",
      primaryContactName: "Ana Garcia",
      primaryPhone: "555-0100",
      secondaryContactName: "",
      secondaryPhone: "",
      addressLine1: "1 Main St",
      addressLine2: "",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      additionalInfo: "",
    });

    expect(created.status).toBe("pending");
    expect(created.email).toBe("garcias@sitterbook.app");
  });

  it("updates status for an existing request", async () => {
    const store = await loadStore();
    const requests = await store.getRegistrationRequests();
    const pending = requests.find((request) => request.status === "pending")!;

    const updated = await store.updateRegistrationStatus(pending.id, "approved");
    expect(updated?.status).toBe("approved");
  });

  it("returns null when updating a request that does not exist", async () => {
    const store = await loadStore();
    expect(await store.updateRegistrationStatus("missing-request", "approved")).toBeNull();
  });
});

describe("google tokens", () => {
  it("round-trips encrypted google tokens through save and get", async () => {
    const store = await loadStore();
    await store.saveGoogleTokens("charlotte", { accessToken: "access-123", refreshToken: "refresh-456" });

    const tokens = await store.getGoogleTokens("charlotte");
    expect(tokens?.googleAccessToken).toBe("access-123");
    expect(tokens?.googleRefreshToken).toBe("refresh-456");
  });

  it("preserves the existing refresh token when a new one is not provided", async () => {
    const store = await loadStore();
    await store.saveGoogleTokens("charlotte", { accessToken: "access-1", refreshToken: "refresh-1" });
    await store.saveGoogleTokens("charlotte", { accessToken: "access-2" });

    const tokens = await store.getGoogleTokens("charlotte");
    expect(tokens?.googleAccessToken).toBe("access-2");
    expect(tokens?.googleRefreshToken).toBe("refresh-1");
  });
});
