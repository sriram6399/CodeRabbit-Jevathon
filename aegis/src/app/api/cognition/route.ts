import { NextResponse } from "next/server";
import { handoffToDevin } from "@/platform/devin";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { task?: string } | null;
  const task = body?.task === "review" ? "review" : body?.task === "wrap" ? "wrap" : null;
  if (!task) {
    return NextResponse.json({ error: "Task must be wrap or review." }, { status: 400 });
  }
  const handoff = await handoffToDevin(task);
  return NextResponse.json(handoff);
}
