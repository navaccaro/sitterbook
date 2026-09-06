import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, deleteSession, getRegistrationRequests, getUserById } from "@/lib/store";
import { getCurrentSession, sessionCookieName } from "@/lib/auth";

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 60 * 60,
};

async function getSessionStatus(email: string) {
  const requests = await getRegistrationRequests();
  return requests.find((request) => request.email.trim().toLowerCase() === email.trim().toLowerCase())?.status ?? "pending";
}

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await getUserById(session.userId);
  const status = user?.role === "parent" && user.approved ? "approved" : await getSessionStatus(session.email);

  return NextResponse.json({
    session: {
      userId: session.userId,
      name: session.name,
      email: session.email,
    },
    status,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; email?: string };

  if (!body.name?.trim() || !body.email?.trim()) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const session = await createSession({ name: body.name, email: body.email });
  const response = NextResponse.json({
    session: {
      userId: session.userId,
      name: session.name,
      email: session.email,
    },
    status: await getSessionStatus(session.email),
  });

  response.cookies.set(sessionCookieName, session.token, sessionCookieOptions);
  return response;
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(sessionCookieName);
  return response;
}
