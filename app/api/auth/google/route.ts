import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleAuthorizationUrl, googleConfigured } from "@/lib/google";

const stateCookie = "sitterbook.google-state";

export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 503 });
  }

  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(googleAuthorizationUrl(state));
  response.cookies.set(stateCookie, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
