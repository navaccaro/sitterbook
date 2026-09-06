import { NextResponse } from "next/server";
import { acceptInvite, getInviteByToken, getUserById } from "@/lib/store";
import { getCurrentSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite || invite.revoked) {
    return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });
  }

  const sitter = await getUserById(invite.sitterId);
  return NextResponse.json({ sitterName: sitter?.name ?? "Your sitter" });
}

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const user = await getUserById(session.userId);

  if (user?.role !== "parent" || !user.approved) {
    return NextResponse.json({ error: "Family approval is required before joining a circle." }, { status: 403 });
  }

  try {
    const connection = await acceptInvite(token, session.userId);
    return NextResponse.json(connection);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to accept invite.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
