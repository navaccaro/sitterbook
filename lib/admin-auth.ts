import { getCurrentSession } from "@/lib/auth";
import { getUserById, type Session } from "@/lib/store";

export async function getCurrentAdmin(): Promise<Session | null> {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const user = await getUserById(session.userId);
  return user?.role === "admin" && user.approved ? session : null;
}
