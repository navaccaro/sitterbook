import { NextResponse } from "next/server";
import { createInvite, getInvitesForSitter, revokeInvite } from "@/lib/store";
import { getCurrentSitter } from "@/lib/sitter-auth";

export async function GET() {
  const sitter = await getCurrentSitter();

  if (!sitter) {
    return NextResponse.json({ error: "Sitter access is required." }, { status: 403 });
  }

  return NextResponse.json(await getInvitesForSitter(sitter.userId));
}

export async function POST() {
  const sitter = await getCurrentSitter();

  if (!sitter) {
    return NextResponse.json({ error: "Sitter access is required." }, { status: 403 });
  }

  const invite = await createInvite(sitter.userId);
  return NextResponse.json(invite, { status: 201 });
}

export async function DELETE(request: Request) {
  const sitter = await getCurrentSitter();

  if (!sitter) {
    return NextResponse.json({ error: "Sitter access is required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
  }

  const revoked = await revokeInvite(token, sitter.userId);

  if (!revoked) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  return NextResponse.json(revoked);
}
