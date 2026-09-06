import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sitter-auth", () => ({ getCurrentSitter: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/store", () => ({
  createAvailabilityBlock: vi.fn(),
  deleteAvailabilityBlock: vi.fn(),
  getAvailabilityBlocks: vi.fn(),
  updateAvailabilityBlock: vi.fn(),
  getConnectionsForParent: vi.fn(),
  getUserById: vi.fn(),
}));

import { getCurrentSitter } from "@/lib/sitter-auth";
import { getCurrentSession } from "@/lib/auth";
import {
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  getAvailabilityBlocks,
  getConnectionsForParent,
  getUserById,
  updateAvailabilityBlock,
} from "@/lib/store";
import { DELETE, GET, POST } from "@/app/api/availability/route";

const charlotteSession = { userId: "charlotte", email: "charlotte@sitterbook.app" };
const emmasBlock = {
  id: "block-emma",
  sitterId: "emma",
  start: "2026-09-13T18:00:00",
  end: "2026-09-13T22:00:00",
  status: "open",
  label: "Sunday evening",
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/availability", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(getCurrentSitter).mockReset();
  vi.mocked(createAvailabilityBlock).mockReset();
  vi.mocked(deleteAvailabilityBlock).mockReset();
  vi.mocked(getAvailabilityBlocks).mockReset();
  vi.mocked(updateAvailabilityBlock).mockReset();
  vi.mocked(getCurrentSession).mockReset();
  vi.mocked(getConnectionsForParent).mockReset();
  vi.mocked(getUserById).mockReset();
  vi.mocked(getAvailabilityBlocks).mockResolvedValue([emmasBlock] as never);
  vi.mocked(getCurrentSession).mockResolvedValue(null);
});

describe("GET /api/availability", () => {
  const charlotteBlock = { ...emmasBlock, id: "block-charlotte", sitterId: "charlotte" };

  beforeEach(() => {
    vi.mocked(getAvailabilityBlocks).mockResolvedValue([emmasBlock, charlotteBlock] as never);
  });

  it("returns every block when there is no session", async () => {
    const data = (await (await GET()).json()) as Array<{ id: string }>;
    expect(data).toHaveLength(2);
  });

  it("returns every block for a sitter or admin session", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "charlotte", email: "charlotte@sitterbook.app" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "charlotte", role: "sitter", approved: true } as never);

    const data = (await (await GET()).json()) as Array<{ id: string }>;
    expect(data).toHaveLength(2);
  });

  it("filters blocks to sitters the parent is actively connected to", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: "parent-1", email: "smiths@sitterbook.app" } as never);
    vi.mocked(getUserById).mockResolvedValue({ id: "parent-1", role: "parent", approved: true } as never);
    vi.mocked(getConnectionsForParent).mockResolvedValue([
      { id: "c1", sitterId: "charlotte", parentId: "parent-1", status: "active", createdAt: "2026-08-01T00:00:00" },
      { id: "c2", sitterId: "emma", parentId: "parent-1", status: "pending", createdAt: "2026-08-01T00:00:00" },
    ] as never);

    const data = (await (await GET()).json()) as Array<{ sitterId: string }>;
    expect(data.map((block) => block.sitterId)).toEqual(["charlotte"]);
  });
});

describe("POST /api/availability", () => {
  it("requires an authenticated sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue(null);

    const response = await POST(postRequest({ start: "2026-09-20T10:00:00", end: "2026-09-20T12:00:00", label: "New" }));
    expect(response.status).toBe(403);
  });

  it("creates a new block owned by the calling sitter, ignoring any client-supplied sitterId", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue(charlotteSession as never);
    vi.mocked(createAvailabilityBlock).mockImplementation(async (block) => block as never);

    const response = await POST(
      postRequest({ sitterId: "someone-else", start: "2026-09-20T10:00:00", end: "2026-09-20T12:00:00", label: "New" }),
    );
    const data = await response.json();

    expect(data.sitterId).toBe("charlotte");
  });

  it("rejects creating a block with missing required fields", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue(charlotteSession as never);

    const response = await POST(postRequest({ label: "Missing times" }));
    expect(response.status).toBe(400);
  });

  it("rejects updating a block owned by a different sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue(charlotteSession as never);

    const response = await POST(postRequest({ id: "block-emma", label: "Hijacked" }));
    expect(response.status).toBe(404);
    expect(updateAvailabilityBlock).not.toHaveBeenCalled();
  });

  it("allows updating a block owned by the calling sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue({ userId: "emma", email: "emma@sitterbook.app" } as never);
    vi.mocked(updateAvailabilityBlock).mockResolvedValue({ ...emmasBlock, label: "Updated" } as never);

    const response = await POST(postRequest({ id: "block-emma", label: "Updated" }));
    const data = await response.json();

    expect(data.label).toBe("Updated");
  });
});

describe("DELETE /api/availability", () => {
  function deleteRequest(id: string) {
    return new Request(`http://localhost/api/availability?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  it("requires an authenticated sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue(null);

    const response = await DELETE(deleteRequest("block-emma"));
    expect(response.status).toBe(403);
  });

  it("rejects deleting a block owned by a different sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue(charlotteSession as never);

    const response = await DELETE(deleteRequest("block-emma"));
    expect(response.status).toBe(404);
    expect(deleteAvailabilityBlock).not.toHaveBeenCalled();
  });

  it("allows deleting a block owned by the calling sitter", async () => {
    vi.mocked(getCurrentSitter).mockResolvedValue({ userId: "emma", email: "emma@sitterbook.app" } as never);
    vi.mocked(deleteAvailabilityBlock).mockResolvedValue([] as never);

    const response = await DELETE(deleteRequest("block-emma"));
    expect(response.status).toBe(200);
    expect(deleteAvailabilityBlock).toHaveBeenCalledWith("block-emma");
  });
});
