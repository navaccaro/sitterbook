import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/store", () => ({
  acceptInvite: vi.fn(),
  getInviteByToken: vi.fn(),
  getUserById: vi.fn(),
}));

import { getCurrentSession } from "@/lib/auth";
import { acceptInvite, getInviteByToken, getUserById } from "@/lib/store";
import { GET, POST } from "@/app/api/invites/[token]/route";

function context(token: string) {
  return { params: Promise.resolve({ token }) };
}

beforeEach(() => {
  vi.mocked(getCurrentSession).mockReset();
  vi.mocked(getUserById).mockReset();
  vi.mocked(acceptInvite).mockReset();
  vi.mocked(getInviteByToken).mockReset();
});

describe("GET /api/invites/[token]", () => {
  it("returns 404 for an unknown or revoked invite", async () => {
    vi.mocked(getInviteByToken).mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/invites/missing"), context("missing"));
    expect(response.status).toBe(404);
  });

  it("returns the inviting sitter's name", async () => {
    vi.mocked(getInviteByToken).mockResolvedValue({ token: "t1", sitterId: "emma", revoked: false } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "emma", name: "Emma" } as never);

    const data = await (await GET(new Request("http://localhost/api/invites/t1"), context("t1"))).json();
    expect(data).toEqual({ sitterName: "Emma" });
  });
});

describe("POST /api/invites/[token]", () => {
  it("requires an approved parent session", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "emma" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "emma", role: "sitter", approved: true } as never);

    const response = await POST(new Request("http://localhost/api/invites/t1", { method: "POST" }), context("t1"));
    expect(response.status).toBe(403);
  });

  it("creates an active connection for the accepting parent", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "parent-2" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "parent-2", role: "parent", approved: true } as never);
    vi.mocked(acceptInvite).mockResolvedValue({ id: "c1", status: "active" } as never);

    const response = await POST(new Request("http://localhost/api/invites/t1", { method: "POST" }), context("t1"));
    expect(response.status).toBe(200);
    expect(acceptInvite).toHaveBeenCalledWith("t1", "parent-2");
  });

  it("surfaces an invalid invite error as 409", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "parent-2" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "parent-2", role: "parent", approved: true } as never);
    vi.mocked(acceptInvite).mockRejectedValue(new Error("This invite link is no longer valid."));

    const response = await POST(new Request("http://localhost/api/invites/t1", { method: "POST" }), context("t1"));
    expect(response.status).toBe(409);
  });
});
