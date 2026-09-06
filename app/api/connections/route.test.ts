import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/store", () => ({
  acceptConnectionRequest: vi.fn(),
  declineConnectionRequest: vi.fn(),
  getConnectionsForParent: vi.fn(),
  getConnectionsForSitter: vi.fn(),
  getUserById: vi.fn(),
  requestConnection: vi.fn(),
}));

import { getCurrentSession } from "@/lib/auth";
import {
  acceptConnectionRequest,
  declineConnectionRequest,
  getConnectionsForParent,
  getConnectionsForSitter,
  getUserById,
  requestConnection,
} from "@/lib/store";
import { GET, PATCH, POST } from "@/app/api/connections/route";

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/connections", { method: "PATCH", body: JSON.stringify(body) });
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/connections", { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.mocked(getCurrentSession).mockReset();
  vi.mocked(getUserById).mockReset();
  vi.mocked(getConnectionsForParent).mockReset();
  vi.mocked(getConnectionsForSitter).mockReset();
  vi.mocked(requestConnection).mockReset();
  vi.mocked(acceptConnectionRequest).mockReset();
  vi.mocked(declineConnectionRequest).mockReset();
});

describe("GET /api/connections", () => {
  it("requires authentication", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns the sitter's connections for a sitter session", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "emma" } as never);
    vi.mocked(getUserById).mockImplementation(async (id: string) =>
      (id === "emma" ? { id: "emma", role: "sitter", approved: true } : { id, name: "The Smiths", email: "smiths@sitterbook.app" }) as never,
    );
    vi.mocked(getConnectionsForSitter).mockResolvedValue([{ id: "c1", sitterId: "emma", parentId: "parent-1", status: "active" }] as never);

    const data = await (await GET()).json();
    expect(data).toEqual([{ id: "c1", sitterId: "emma", parentId: "parent-1", status: "active", counterpartName: "The Smiths", counterpartEmail: "smiths@sitterbook.app" }]);
  });

  it("returns the family's connections for a parent session", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "parent-1" } as never);
    vi.mocked(getUserById).mockImplementation(async (id: string) =>
      (id === "parent-1" ? { id: "parent-1", role: "parent", approved: true } : { id, name: "Emma", email: "emma@sitterbook.app" }) as never,
    );
    vi.mocked(getConnectionsForParent).mockResolvedValue([{ id: "c2", sitterId: "emma", parentId: "parent-1", status: "pending" }] as never);

    const data = await (await GET()).json();
    expect(data).toEqual([{ id: "c2", sitterId: "emma", parentId: "parent-1", status: "pending", counterpartName: "Emma", counterpartEmail: "emma@sitterbook.app" }]);
  });

  it("rejects an admin session", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "admin-1" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "admin-1", role: "admin", approved: true } as never);

    expect((await GET()).status).toBe(403);
  });
});

describe("POST /api/connections", () => {
  it("requires an approved parent session", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "emma" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "emma", role: "sitter", approved: true } as never);

    const response = await POST(postRequest({ sitterEmail: "emma@sitterbook.app" }));
    expect(response.status).toBe(403);
  });

  it("rejects a missing sitter email", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "parent-1" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "parent-1", role: "parent", approved: true } as never);

    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
  });

  it("creates a pending connection request", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "parent-1" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "parent-1", role: "parent", approved: true } as never);
    vi.mocked(requestConnection).mockResolvedValue({ id: "c1", status: "pending" } as never);

    const response = await POST(postRequest({ sitterEmail: "emma@sitterbook.app" }));
    expect(response.status).toBe(201);
    expect(requestConnection).toHaveBeenCalledWith("parent-1", "emma@sitterbook.app");
  });

  it("surfaces store errors as a 409", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "parent-1" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "parent-1", role: "parent", approved: true } as never);
    vi.mocked(requestConnection).mockRejectedValue(new Error("No sitter was found with that email."));

    const response = await POST(postRequest({ sitterEmail: "nope@sitterbook.app" }));
    expect(response.status).toBe(409);
  });
});

describe("PATCH /api/connections", () => {
  it("requires an approved sitter session", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "parent-1" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "parent-1", role: "parent", approved: true } as never);

    const response = await PATCH(patchRequest({ id: "c1", accept: true }));
    expect(response.status).toBe(403);
  });

  it("accepts a pending request", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "emma" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "emma", role: "sitter", approved: true } as never);
    vi.mocked(acceptConnectionRequest).mockResolvedValue({ id: "c1", status: "active" } as never);

    const response = await PATCH(patchRequest({ id: "c1", accept: true }));
    expect(response.status).toBe(200);
  });

  it("returns 404 when accepting a request that does not belong to the sitter", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "emma" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "emma", role: "sitter", approved: true } as never);
    vi.mocked(acceptConnectionRequest).mockResolvedValue(null);

    const response = await PATCH(patchRequest({ id: "c1", accept: true }));
    expect(response.status).toBe(404);
  });

  it("declines a pending request", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "emma" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "emma", role: "sitter", approved: true } as never);
    vi.mocked(declineConnectionRequest).mockResolvedValue(true);

    const response = await PATCH(patchRequest({ id: "c1", accept: false }));
    expect(response.status).toBe(200);
  });
});
