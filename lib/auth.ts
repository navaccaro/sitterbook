import { cookies } from "next/headers";
import { getSession, type Session } from "@/lib/store";

export const sessionCookieName = "sitterbook.session";

export async function getCurrentSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  return getSession(token);
}
