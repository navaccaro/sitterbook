import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({
  getGoogleTokens: vi.fn(),
  saveGoogleTokens: vi.fn(),
}));

import { getGoogleTokens, saveGoogleTokens } from "@/lib/store";
import {
  createGoogleCalendarEvent,
  exchangeGoogleCode,
  getGoogleAccessToken,
  getGoogleCalendarEvent,
  getGoogleProfile,
  googleAuthorizationUrl,
  googleConfigured,
  saveGoogleCalendarEvent,
} from "@/lib/google";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  vi.mocked(getGoogleTokens).mockReset();
  vi.mocked(saveGoogleTokens).mockReset();
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
  vi.stubEnv("GOOGLE_REDIRECT_URI", "https://sitterbook.app/api/auth/google/callback");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("googleConfigured", () => {
  it("is true when all required env vars are set", () => {
    expect(googleConfigured()).toBe(true);
  });

  it("is false when any required env var is missing", () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(googleConfigured()).toBe(false);
  });
});

describe("googleAuthorizationUrl", () => {
  it("builds an authorization URL carrying the state and calendar scope", () => {
    const url = new URL(googleAuthorizationUrl("csrf-state"));

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("state")).toBe("csrf-state");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("scope")).toContain("calendar.events");
    expect(url.searchParams.get("access_type")).toBe("offline");
  });
});

describe("exchangeGoogleCode", () => {
  it("returns the parsed token payload on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ access_token: "at", refresh_token: "rt", expires_in: 3600 })));

    const tokens = await exchangeGoogleCode("auth-code");
    expect(tokens.access_token).toBe("at");
  });

  it("throws when the token endpoint responds with an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 400 })));

    await expect(exchangeGoogleCode("bad-code")).rejects.toThrow("Google token exchange failed.");
  });
});

describe("getGoogleProfile", () => {
  it("returns the parsed profile on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ name: "Charlotte", email: "charlotte@sitterbook.app" })));

    const profile = await getGoogleProfile("access-token");
    expect(profile.email).toBe("charlotte@sitterbook.app");
  });

  it("throws when the profile lookup fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 401 })));

    await expect(getGoogleProfile("bad-token")).rejects.toThrow("Google profile lookup failed.");
  });
});

describe("getGoogleAccessToken", () => {
  it("throws when Google Calendar has not been connected", async () => {
    vi.mocked(getGoogleTokens).mockResolvedValue(null);

    await expect(getGoogleAccessToken("charlotte")).rejects.toThrow("Google Calendar is not connected.");
  });

  it("returns the stored access token when it is not close to expiring", async () => {
    vi.mocked(getGoogleTokens).mockResolvedValue({
      googleAccessToken: "still-valid",
      googleRefreshToken: "refresh-token",
      googleTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      googleCalendarId: null,
    });

    const token = await getGoogleAccessToken("charlotte");
    expect(token).toBe("still-valid");
  });

  it("refreshes the access token when it is about to expire", async () => {
    vi.mocked(getGoogleTokens).mockResolvedValue({
      googleAccessToken: "about-to-expire",
      googleRefreshToken: "refresh-token",
      googleTokenExpiry: new Date(Date.now() + 1000),
      googleCalendarId: null,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ access_token: "refreshed-token", expires_in: 3600 })));

    const token = await getGoogleAccessToken("charlotte");

    expect(token).toBe("refreshed-token");
    expect(saveGoogleTokens).toHaveBeenCalledWith("charlotte", expect.objectContaining({ accessToken: "refreshed-token" }));
  });

  it("returns the existing token without refreshing when there is no refresh token", async () => {
    vi.mocked(getGoogleTokens).mockResolvedValue({
      googleAccessToken: "expiring-soon",
      googleRefreshToken: null,
      googleTokenExpiry: new Date(Date.now() + 1000),
      googleCalendarId: null,
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const token = await getGoogleAccessToken("charlotte");

    expect(token).toBe("expiring-soon");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("saveGoogleCalendarEvent / createGoogleCalendarEvent", () => {
  beforeEach(() => {
    vi.mocked(getGoogleTokens).mockResolvedValue({
      googleAccessToken: "access-token",
      googleRefreshToken: "refresh-token",
      googleTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      googleCalendarId: null,
    });
  });

  it("POSTs to create a new event when no eventId is given", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ id: "event-1", htmlLink: "https://calendar" }));
    vi.stubGlobal("fetch", fetchSpy);

    const event = await createGoogleCalendarEvent("charlotte", {
      summary: "SitterBook: The Smiths",
      description: "Confirmed booking",
      start: "2026-09-11T18:00:00",
      end: "2026-09-11T20:00:00",
    });

    expect(event.id).toBe("event-1");
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    expect(init.method).toBe("POST");
  });

  it("PUTs to the specific event URL when an eventId is given", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ id: "event-1" }));
    vi.stubGlobal("fetch", fetchSpy);

    await saveGoogleCalendarEvent("charlotte", "event-1", {
      summary: "Updated",
      description: "",
      start: "2026-09-11T18:00:00",
      end: "2026-09-11T20:00:00",
    });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events/event-1");
    expect(init.method).toBe("PUT");
  });

  it("throws when the calendar API responds with an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));

    await expect(
      createGoogleCalendarEvent("charlotte", { summary: "x", description: "", start: "2026-09-11T18:00:00", end: "2026-09-11T20:00:00" }),
    ).rejects.toThrow("Google Calendar event creation failed.");
  });
});

describe("getGoogleCalendarEvent", () => {
  beforeEach(() => {
    vi.mocked(getGoogleTokens).mockResolvedValue({
      googleAccessToken: "access-token",
      googleRefreshToken: "refresh-token",
      googleTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      googleCalendarId: null,
    });
  });

  it("returns null when the event no longer exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 404 })));

    expect(await getGoogleCalendarEvent("charlotte", "missing-event")).toBeNull();
  });

  it("throws for other error statuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));

    await expect(getGoogleCalendarEvent("charlotte", "event-1")).rejects.toThrow("Google Calendar event lookup failed.");
  });

  it("returns the parsed event on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ status: "confirmed" })));

    const event = await getGoogleCalendarEvent("charlotte", "event-1");
    expect(event?.status).toBe("confirmed");
  });
});
