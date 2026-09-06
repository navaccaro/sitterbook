import { NextResponse } from "next/server";
import {
  acceptConnectionRequest,
  declineConnectionRequest,
  getConnectionsForParent,
  getConnectionsForSitter,
  getUserById,
  requestConnection,
} from "@/lib/store";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const user = await getUserById(session.userId);

  if (user?.role === "sitter") {
    const connections = await getConnectionsForSitter(session.userId);
    const enriched = await Promise.all(
      connections.map(async (connection) => {
        const parent = await getUserById(connection.parentId);
        return { ...connection, counterpartName: parent?.name ?? "Unknown family", counterpartEmail: parent?.email ?? "" };
      }),
    );
    return NextResponse.json(enriched);
  }

  if (user?.role === "parent") {
    const connections = await getConnectionsForParent(session.userId);
    const enriched = await Promise.all(
      connections.map(async (connection) => {
        const sitter = await getUserById(connection.sitterId);
        return { ...connection, counterpartName: sitter?.name ?? "Unknown sitter", counterpartEmail: sitter?.email ?? "" };
      }),
    );
    return NextResponse.json(enriched);
  }

  return NextResponse.json({ error: "Sitter or family access is required." }, { status: 403 });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const user = await getUserById(session.userId);

  if (user?.role !== "parent" || !user.approved) {
    return NextResponse.json({ error: "Family approval is required before connecting with a sitter." }, { status: 403 });
  }

  const body = (await request.json()) as { sitterEmail?: string };

  if (!body.sitterEmail?.trim()) {
    return NextResponse.json({ error: "A sitter email is required." }, { status: 400 });
  }

  try {
    const connection = await requestConnection(session.userId, body.sitterEmail);
    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send connection request.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const user = await getUserById(session.userId);

  if (user?.role !== "sitter" || !user.approved) {
    return NextResponse.json({ error: "Sitter access is required." }, { status: 403 });
  }

  const body = (await request.json()) as { id?: string; accept?: boolean };

  if (!body.id || typeof body.accept !== "boolean") {
    return NextResponse.json({ error: "Connection id and a decision are required." }, { status: 400 });
  }

  if (body.accept) {
    const updated = await acceptConnectionRequest(body.id, session.userId);

    if (!updated) {
      return NextResponse.json({ error: "Connection request not found." }, { status: 404 });
    }

    return NextResponse.json(updated);
  }

  const declined = await declineConnectionRequest(body.id, session.userId);

  if (!declined) {
    return NextResponse.json({ error: "Connection request not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
