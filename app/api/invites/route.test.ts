import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sitter-auth", () => ({ getCurrentSitter: vi.fn() }));
vi.mock("@/lib/store", () => ({
  createInvite: vi.fn(),
  getInvitesForSitter: vi.fn(),
  revokeInvite: vi.fn(),
}));

import { getCurrentSitter } from "@/lib/sitter-auth";
import { createInvite, getInvitesForSitter, revokeInvite } from "@/lib/store";
import { DELETE, GET, POST } from "@/app/api/invites/route";

function deleteRequest(token: string) {
  return new Request(`http://localhost/api/invites?token=${encodeURIComponent(token)}`, { method: "DELETE" });
}

beforeEach(() => {
  vi.mocked(getCurrentSitter).mockReset();
  vi.mocked(createInvite).mockReset();
  vi.mocked(getInvitesForSitter).mockReset();
  vi.mocked(revokeInvite).mockReset();
});

describe("GET /api/invites", () => {
  it("requires an authenticated sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue(null);
    expect((await GET()).status).toBe(403);
  });

  it("returns the sitter's invites", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue({ userId: "emma" } as never);
    vi.mocked(getInvitesForSitter).mockResolvedValue([{ token: "t1" }] as never);

    const data = await (await GET()).json();
    expect(data).toEqual([{ token: "t1" }]);
  });
});

describe("POST /api/invites", () => {
  it("requires an authenticated sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue(null);
    expect((await POST()).status).toBe(403);
  });

  it("creates a new invite for the calling sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue({ userId: "emma" } as never);
    vi.mocked(createInvite).mockResolvedValue({ token: "t1", sitterId: "emma" } as never);

    const response = await POST();
    expect(response.status).toBe(201);
    expect(createInvite).toHaveBeenCalledWith("emma");
  });
});

describe("DELETE /api/invites", () => {
  it("requires an authenticated sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue(null);
    expect((await DELETE(deleteRequest("t1"))).status).toBe(403);
  });

  it("rejects revoking an invite that does not belong to the sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue({ userId: "emma" } as never);
    vi.mocked(revokeInvite).mockResolvedValue(null);

    const response = await DELETE(deleteRequest("t1"));
    expect(response.status).toBe(404);
  });

  it("revokes an owned invite", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue({ userId: "emma" } as never);
    vi.mocked(revokeInvite).mockResolvedValue({ token: "t1", revoked: true } as never);

    const response = await DELETE(deleteRequest("t1"));
    expect(response.status).toBe(200);
  });
});
