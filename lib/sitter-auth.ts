import { getCurrentSession } from "@/lib/auth";
import { getUserById, type Session } from "@/lib/store";

export async function getCurrentSitter(): Promise<Session | null> {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const user = await getUserById(session.userId);
  return user?.role === "sitter" && user.approved ? session : null;
}
