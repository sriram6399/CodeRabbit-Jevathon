import { NextResponse } from "next/server";
import { listEvents, stats, verifyChain } from "@/ledger/store";
import type { Decision } from "@/sdk/types";

const DECISIONS: Decision[] = ["ALLOW", "FLAG", "BLOCK"];

/**
 * GET /api/ledger?limit=100&decision=BLOCK&agent=loan-approval
 * Returns recent runs, chain integrity, and aggregate stats from the local database.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? 100);
  const decisionRaw = url.searchParams.get("decision") ?? undefined;
  const agent = url.searchParams.get("agent") ?? undefined;

  const decision = DECISIONS.includes(decisionRaw as Decision) ? (decisionRaw as Decision) : undefined;

  const [events, chain, summary] = await Promise.all([
    listEvents({ limit: Number.isFinite(limitRaw) ? limitRaw : 100, decision, agent }),
    verifyChain(),
    stats(),
  ]);

  return NextResponse.json({
    events,
    count: events.length,
    intact: chain.intact,
    chain,
    stats: summary,
  });
}
