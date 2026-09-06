import { NextResponse } from "next/server";
import {
  createAvailabilityBlock,
  getAvailabilityBlocks,
  saveAvailabilityBlocks,
  updateAvailabilityBlock,
} from "@/lib/store";

export async function GET() {
  const blocks = await getAvailabilityBlocks();
  return NextResponse.json(blocks);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    sitterId?: string;
    start?: string;
    end?: string;
    status?: "open" | "partial" | "booked";
    label?: string;
  };

  if (!body.id && (!body.sitterId || !body.start || !body.end || !body.label)) {
    return NextResponse.json({ error: "Missing availability data." }, { status: 400 });
  }

  if (body.id) {
    const updated = await updateAvailabilityBlock(body.id, {
      label: body.label,
      start: body.start,
      end: body.end,
      status: body.status,
    });

    if (!updated) {
      return NextResponse.json({ error: "Availability block not found." }, { status: 404 });
    }

    return NextResponse.json(updated);
  }

  const block = {
    id: body.id ?? `block-${Date.now()}`,
    sitterId: body.sitterId ?? "charlotte",
    start: body.start ?? new Date().toISOString(),
    end: body.end ?? new Date().toISOString(),
    status: body.status ?? "open",
    label: body.label ?? "New availability",
  };

  const created = await createAvailabilityBlock(block);
  return NextResponse.json(created);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing availability id." }, { status: 400 });
  }

  const current = await getAvailabilityBlocks();
  const remaining = current.filter((block) => block.id !== id);
  const blocks = await saveAvailabilityBlocks(remaining);
  return NextResponse.json(blocks);
}
