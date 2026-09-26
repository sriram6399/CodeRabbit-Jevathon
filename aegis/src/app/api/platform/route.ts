import { NextResponse } from "next/server";
import { COLLECTIVE_CALENDAR_URL } from "@/community/collective";
import { coderabbitStatus } from "@/platform/coderabbit";
import { cognitionStatus } from "@/platform/devin";
import { runtimeStatus } from "@/platform/gmi";
import { latestFeedback } from "@/platform/store";
import { billingStatus } from "@/platform/whop";

export async function GET() {
  const [review, runtime] = await Promise.all([coderabbitStatus(), runtimeStatus()]);
  return NextResponse.json({
    review,
    billing: billingStatus(),
    cognition: cognitionStatus(),
    runtime,
    community: {
      provider: "aicollective" as const,
      calendarUrl: COLLECTIVE_CALENDAR_URL,
      recent: latestFeedback(1)[0] ?? null,
    },
  });
}
