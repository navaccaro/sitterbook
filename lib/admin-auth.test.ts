import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/store", () => ({ getUserById: vi.fn() }));

import { getCurrentSession } from "@/lib/auth";
import { getUserById } from "@/lib/store";
import { getCurrentAdmin } from "@/lib/admin-auth";

const session = {
  token: "token-1",
  userId: "admin-1",
  name: "Mom Admin",
  email: "admin@sitterbook.app",
  createdAt: "2026-09-06T00:00:00.000Z",
  expiresAt: "2026-09-13T00:00:00.000Z",
};

beforeEach(() => {
  vi.mocked(getCurrentSession).mockReset();
  vi.mocked(getUserById).mockReset();
});

describe("getCurrentAdmin", () => {
  it("returns null when there is no session", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    expect(await getCurrentAdmin()).toBeNull();
    expect(getUserById).not.toHaveBeenCalled();
  });

  it("returns null when the session user is not an admin", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    vi.mocked(getUserById).mockResolvedValue({ id: "admin-1", role: "sitter", approved: true } as never);

    expect(await getCurrentAdmin()).toBeNull();
  });

  it("returns null when the admin account is not approved", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    vi.mocked(getUserById).mockResolvedValue({ id: "admin-1", role: "admin", approved: false } as never);

    expect(await getCurrentAdmin()).toBeNull();
  });

  it("returns the session when the user is an approved admin", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    vi.mocked(getUserById).mockResolvedValue({ id: "admin-1", role: "admin", approved: true } as never);

    expect(await getCurrentAdmin()).toBe(session);
  });
});
