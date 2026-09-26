import { NextResponse } from "next/server";
import { verifyTurn } from "@/sdk/core";
import type { GateMode } from "@/sdk/types";

const MODES: GateMode[] = ["gated", "observe", "block"];

/**
 * POST /api/verify
 * Body: { agent, input, reasoning, output, mode? }
 * Governs a turn produced by any external agent and writes it to the ledger.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      agent?: string;
      input?: string;
      reasoning?: string;
      output?: string;
      mode?: string;
    };

    const agent = body.agent?.trim();
    const input = body.input?.trim();
    if (!agent || !input) {
      return NextResponse.json(
        { error: "`agent` and `input` are required." },
        { status: 400 },
      );
    }

    const mode = MODES.includes(body.mode as GateMode)
      ? (body.mode as GateMode)
      : "gated";

    const result = await verifyTurn({
      agent,
      input,
      reasoning: body.reasoning ?? "",
      output: body.output ?? "",
      mode,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verify failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
