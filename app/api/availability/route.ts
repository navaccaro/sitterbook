import { NextResponse } from "next/server";
import {
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  getAvailabilityBlocks,
  updateAvailabilityBlock,
} from "@/lib/store";
import { getCurrentSitter } from "@/lib/sitter-auth";

export async function GET() {
  const blocks = await getAvailabilityBlocks();
  return NextResponse.json(blocks);
}

export async function POST(request: Request) {
  const sitter = await getCurrentSitter();

  if (!sitter) {
    return NextResponse.json({ error: "Sitter access is required." }, { status: 403 });
  }

  const body = (await request.json()) as {
    id?: string;
    start?: string;
    end?: string;
    status?: "open" | "partial" | "booked";
    label?: string;
  };

  if (body.id) {
    const blocks = await getAvailabilityBlocks();
    const existing = blocks.find((block) => block.id === body.id);

    if (!existing || existing.sitterId !== sitter.userId) {
      return NextResponse.json({ error: "Availability block not found." }, { status: 404 });
    }

    const updated = await updateAvailabilityBlock(body.id, {
      label: body.label,
      start: body.start,
      end: body.end,
      status: body.status,
    });

    return NextResponse.json(updated);
  }

  if (!body.start || !body.end || !body.label) {
    return NextResponse.json({ error: "Missing availability data." }, { status: 400 });
  }

  const block = {
    id: `block-${Date.now()}`,
    sitterId: sitter.userId,
    start: body.start,
    end: body.end,
    status: body.status ?? "open",
    label: body.label,
  };

  const created = await createAvailabilityBlock(block);
  return NextResponse.json(created);
}

export async function DELETE(request: Request) {
  const sitter = await getCurrentSitter();

  if (!sitter) {
    return NextResponse.json({ error: "Sitter access is required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing availability id." }, { status: 400 });
  }

  const blocks = await getAvailabilityBlocks();
  const existing = blocks.find((block) => block.id === id);

  if (!existing || existing.sitterId !== sitter.userId) {
    return NextResponse.json({ error: "Availability block not found." }, { status: 404 });
  }

  const remaining = await deleteAvailabilityBlock(id);
  return NextResponse.json(remaining);
}
