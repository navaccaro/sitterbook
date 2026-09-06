import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/store", () => ({ getUserById: vi.fn() }));

import { getCurrentSession } from "@/lib/auth";
import { getUserById } from "@/lib/store";
import { getCurrentSitter } from "@/lib/sitter-auth";

const session = {
  token: "token-1",
  userId: "charlotte",
  name: "Charlotte",
  email: "charlotte@sitterbook.app",
  createdAt: "2026-09-06T00:00:00.000Z",
  expiresAt: "2026-09-13T00:00:00.000Z",
};

beforeEach(() => {
  vi.mocked(getCurrentSession).mockReset();
  vi.mocked(getUserById).mockReset();
});

describe("getCurrentSitter", () => {
  it("returns null when there is no session", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    expect(await getCurrentSitter()).toBeNull();
    expect(getUserById).not.toHaveBeenCalled();
  });

  it("returns null when the session user is not a sitter", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    vi.mocked(getUserById).mockResolvedValue({ id: "charlotte", role: "parent", approved: true } as never);

    expect(await getCurrentSitter()).toBeNull();
  });

  it("returns null when the sitter has been deactivated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    vi.mocked(getUserById).mockResolvedValue({ id: "charlotte", role: "sitter", approved: false } as never);

    expect(await getCurrentSitter()).toBeNull();
  });

  it("returns the session when the user is an approved sitter", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(session);
    vi.mocked(getUserById).mockResolvedValue({ id: "charlotte", role: "sitter", approved: true } as never);

    expect(await getCurrentSitter()).toBe(session);
  });
});
