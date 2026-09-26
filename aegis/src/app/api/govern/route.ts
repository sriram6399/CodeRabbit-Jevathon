import { NextResponse } from "next/server";
import { loanApproval } from "@/agents/loan-approval";
import { wrapAgent } from "@/sdk/wrap-agent";

const run = wrapAgent(
  {
    name: "loan-approval",
    frameworks: ["eu-ai-act"],
    mode: "gated",
  },
  loanApproval,
);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { input?: string };
    const input = body.input?.trim();
    if (!input) {
      return NextResponse.json({ error: "Input is required." }, { status: 400 });
    }
    const result = await run(input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Govern failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
