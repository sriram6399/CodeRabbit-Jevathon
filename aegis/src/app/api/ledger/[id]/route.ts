import { NextResponse } from "next/server";
import { getEvent } from "@/ledger/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }
  return NextResponse.json(event);
}
