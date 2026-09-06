import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, saveGoogleTokens, upsertGoogleUser } from "@/lib/store";
import { exchangeGoogleCode, getGoogleProfile, googleConfigured } from "@/lib/google";
import { sessionCookieName } from "@/lib/auth";

const stateCookie = "sitterbook.google-state";

export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/auth?error=google-not-configured", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(stateCookie)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/auth?error=google-state", request.url));
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const profile = await getGoogleProfile(tokens.access_token);

    if (!profile.email) {
      throw new Error("Google did not return an email address.");
    }

    const user = await upsertGoogleUser({
      name: profile.name ?? "Google family",
      email: profile.email,
    });
    await saveGoogleTokens(user.id, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
    });
    const session = await createSession({ name: user.name, email: user.email });
    const response = NextResponse.redirect(new URL("/auth", request.url));
    response.cookies.set(sessionCookieName, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    response.cookies.delete(stateCookie);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/auth?error=google-sign-in", request.url));
  }
}
