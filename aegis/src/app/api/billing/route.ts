import { NextResponse } from "next/server";
import { isPlanId, startCheckout } from "@/platform/whop";

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { planId?: string; email?: string } | null;
  const planId = body?.planId?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!isPlanId(planId)) {
    return NextResponse.json({ error: "Choose a Wrap, Team, or Firm plan." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A billing email is required." }, { status: 400 });
  }
  const subscription = await startCheckout(planId, email);
  return NextResponse.json(subscription);
}
