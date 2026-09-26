import { NextResponse } from "next/server";
import { communityBoard, fileFeedback, parseFeedback } from "@/community/feedback";

export async function GET() {
  return NextResponse.json(await communityBoard());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseFeedback(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const result = await fileFeedback(parsed.value);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.feedback);
}
