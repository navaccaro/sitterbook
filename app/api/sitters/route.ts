import { NextResponse } from "next/server";
import { createSitter, getSitters, setSitterApproved } from "@/lib/store";
import { getCurrentAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const sitters = await getSitters();
  return NextResponse.json(sitters);
}

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const body = (await request.json()) as { name?: string; email?: string };

  if (!body.name?.trim() || !body.email?.trim()) {
    return NextResponse.json({ error: "Sitter name and email are required." }, { status: 400 });
  }

  try {
    const sitter = await createSitter({ name: body.name, email: body.email });
    return NextResponse.json(sitter, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create sitter.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const body = (await request.json()) as { id?: string; approved?: boolean };

  if (!body.id || typeof body.approved !== "boolean") {
    return NextResponse.json({ error: "Sitter id and approved status are required." }, { status: 400 });
  }

  const updated = await setSitterApproved(body.id, body.approved);

  if (!updated) {
    return NextResponse.json({ error: "Sitter not found." }, { status: 404 });
  }

  return NextResponse.json(updated);
}
