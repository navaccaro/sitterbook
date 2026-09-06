import { NextResponse } from "next/server";
import {
  getRegistrationRequests,
  updateRegistrationStatus,
  upsertRegistrationRequest,
} from "@/lib/store";

export async function GET() {
  const requests = await getRegistrationRequests();
  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; email?: string; provider?: "google" };

  if (!body.name || !body.email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const next = await upsertRegistrationRequest(
    { name: body.name, email: body.email },
    body.provider ?? "google",
  );

  return NextResponse.json(next);
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: string; status?: "approved" | "rejected" };

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "Request id and status are required." }, { status: 400 });
  }

  const updated = await updateRegistrationStatus(body.id, body.status);

  if (!updated) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  return NextResponse.json(updated);
}
