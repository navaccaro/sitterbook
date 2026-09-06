import { getGoogleTokens, saveGoogleTokens } from "@/lib/store";

const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleCalendarApi = "https://www.googleapis.com/calendar/v3";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

export function googleAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Google token exchange failed.");
  }

  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}

export async function getGoogleProfile(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Google profile lookup failed.");
  }

  return response.json() as Promise<{ name?: string; email?: string }>;
}

async function refreshAccessToken(userId: string, refreshToken: string) {
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Google token refresh failed.");
  }

  const tokens = (await response.json()) as { access_token: string; expires_in?: number };
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
  await saveGoogleTokens(userId, { accessToken: tokens.access_token, expiresAt });
  return tokens.access_token;
}

export async function getGoogleAccessToken(userId: string) {
  const tokens = await getGoogleTokens(userId);

  if (!tokens?.googleAccessToken) {
    throw new Error("Google Calendar is not connected.");
  }

  if (tokens.googleTokenExpiry && tokens.googleTokenExpiry.getTime() < Date.now() + 60_000 && tokens.googleRefreshToken) {
    return refreshAccessToken(userId, tokens.googleRefreshToken);
  }

  return tokens.googleAccessToken;
}

export async function createGoogleCalendarEvent(userId: string, event: { summary: string; description: string; start: string; end: string }) {
  return saveGoogleCalendarEvent(userId, undefined, event);
}

export async function saveGoogleCalendarEvent(userId: string, eventId: string | undefined, event: { summary: string; description: string; start: string; end: string }) {
  const accessToken = await getGoogleAccessToken(userId);
  const response = await fetch(`${googleCalendarApi}/calendars/primary/events${eventId ? `/${encodeURIComponent(eventId)}` : ""}`, {
    method: eventId ? "PUT" : "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: { dateTime: `${event.start}Z`, timeZone: "UTC" },
      end: { dateTime: `${event.end}Z`, timeZone: "UTC" },
    }),
  });

  if (!response.ok) {
    throw new Error("Google Calendar event creation failed.");
  }

  return response.json() as Promise<{ id?: string; htmlLink?: string }>;
}

export async function getGoogleCalendarEvent(userId: string, eventId: string) {
  const accessToken = await getGoogleAccessToken(userId);
  const response = await fetch(`${googleCalendarApi}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Google Calendar event lookup failed.");
  }

  return response.json() as Promise<{
    status?: string;
    start?: { dateTime?: string };
    end?: { dateTime?: string };
  }>;
}
