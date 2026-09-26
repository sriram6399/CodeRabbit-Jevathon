import { NextResponse } from "next/server";
import { getDb } from "@/ledger/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = getDb().prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM runs").get();
    return NextResponse.json({ ok: true, runs: row?.n ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "database unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
