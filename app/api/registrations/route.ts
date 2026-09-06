import { NextResponse } from "next/server";
import {
  getRegistrationRequests,
  updateRegistrationStatus,
  upsertRegistrationRequest,
} from "@/lib/store";
import { getCurrentAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (email) {
    const requests = await getRegistrationRequests();
    const match = requests.find((request) => request.email.trim().toLowerCase() === email.trim().toLowerCase());
    return NextResponse.json(match ? [match] : []);
  }

  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const requests = await getRegistrationRequests();
  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    provider?: "google";
    primaryContactName?: string;
    primaryPhone?: string;
    secondaryContactName?: string;
    secondaryPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    additionalInfo?: string;
  };

  if (!body.name || !body.email || !body.primaryContactName || !body.primaryPhone || !body.addressLine1 || !body.city || !body.state || !body.postalCode) {
    return NextResponse.json({ error: "Family name, primary contact, phone, and complete address are required." }, { status: 400 });
  }

  const next = await upsertRegistrationRequest(
    {
      name: body.name,
      email: body.email,
      primaryContactName: body.primaryContactName ?? "",
      primaryPhone: body.primaryPhone ?? "",
      secondaryContactName: body.secondaryContactName ?? "",
      secondaryPhone: body.secondaryPhone ?? "",
      addressLine1: body.addressLine1 ?? "",
      addressLine2: body.addressLine2 ?? "",
      city: body.city ?? "",
      state: body.state ?? "",
      postalCode: body.postalCode ?? "",
      additionalInfo: body.additionalInfo ?? "",
    },
    body.provider ?? "google",
  );

  return NextResponse.json(next);
}

export async function PATCH(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

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
