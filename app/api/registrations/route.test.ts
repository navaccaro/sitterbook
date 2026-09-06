import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({
  getRegistrationRequests: vi.fn(),
  updateRegistrationStatus: vi.fn(),
  upsertRegistrationRequest: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({ getCurrentAdmin: vi.fn() }));

import { getRegistrationRequests } from "@/lib/store";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { GET } from "@/app/api/registrations/route";

function registration(overrides: Record<string, unknown>) {
  return {
    id: "id",
    name: "name",
    email: "email",
    provider: "google",
    status: "pending",
    primaryContactName: "",
    primaryPhone: "",
    secondaryContactName: "",
    secondaryPhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    additionalInfo: "",
    requestedAt: "2026-09-06T00:00:00.000Z",
    ...overrides,
  };
}

const requests = [
  registration({ id: "r1", name: "The Smiths", email: "smiths@sitterbook.app", status: "approved" }),
  registration({ id: "r2", name: "The Lopez Family", email: "lopez@sitterbook.app", status: "pending" }),
];

beforeEach(() => {
  vi.mocked(getCurrentAdmin).mockReset();
  vi.mocked(getRegistrationRequests).mockReset();
  vi.mocked(getRegistrationRequests).mockResolvedValue(requests as never);
});

describe("GET /api/registrations", () => {
  it("requires admin access for the unfiltered list", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/registrations"));
    expect(response.status).toBe(403);
  });

  it("returns the full list for admins", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({ userId: "admin-1" } as never);

    const data = await (await GET(new Request("http://localhost/api/registrations"))).json();
    expect(data).toHaveLength(2);
  });

  it("returns only the matching record for an email lookup, without requiring admin access", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/registrations?email=LOPEZ@sitterbook.app"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([requests[1]]);
  });

  it("returns an empty array for an email with no matching registration", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/registrations?email=nobody@sitterbook.app"));
    const data = await response.json();

    expect(data).toEqual([]);
  });
});
