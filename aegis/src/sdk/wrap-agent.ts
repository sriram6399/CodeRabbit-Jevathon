import { alertRecipients, sendDecisionAlert } from "@/alerts/photon";
import { appendEvent } from "@/ledger/store";
import { completeOnGmi } from "@/platform/gmi";
import { recordTurnUsage, withTurnUsage } from "@/platform/usage";
import { judgeTurn, screenInput } from "./core";
import type { CustomerBrief, Decision } from "./types";
import type {
  AgentFn,
  AgentHelpers,
  GovernedResult,
  WrapConfig,
} from "./types";

async function defaultReasoner(input: string): Promise<string> {
  try {
    const fromGmi = await completeOnGmi(input);
    if (fromGmi) return fromGmi;
  } catch {
    // fall through to OpenAI or the deterministic trace
  }

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are the reasoning trace of a loan-approval agent. Write 3-5 sentences explaining how you would decide, citing only facts present in the user message. Do not invent income, identity, or scores. Do not give the final decision yet.",
            },
            { role: "user", content: input },
          ],
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch {
      // fall through to the deterministic trace
    }
  }

  return [
    "Reasoning captured by Aegis before any decision is issued.",
    "I will rely only on attributes stated in the request: income, obligations, requested amount, and credit indicators.",
    "I will not use protected characteristics or demographic proxies.",
    `Request excerpt: ${input.slice(0, 240)}`,
  ].join(" ");
}

/**
 * Wrap any agent. Aegis screens the input, forces a reasoning trace,
 * judges the finished turn against the EU AI Act with Jev, and writes
 * a tamper-evident ledger event. Blocked outputs are never released.
 */
export function wrapAgent(config: WrapConfig, agent: AgentFn) {
  const mode = config.mode ?? "gated";
  const reasoner = config.reasoner ?? defaultReasoner;

  async function notify(
    input: string,
    decision: Decision,
    reason: string,
    output: string | null,
    customer: CustomerBrief | null,
  ) {
    return sendDecisionAlert({
      recipients: alertRecipients(input, customer?.email),
      decision,
      summary: [customer ? `${customer.name} · calculated FICO ${customer.fico}` : null, reason, output]
        .filter(Boolean)
        .join("\n"),
    });
  }

  return async function run(input: string): Promise<GovernedResult> {
    return withTurnUsage(() => execute(input));
  };

  async function execute(input: string): Promise<GovernedResult> {
    const helpers: AgentHelpers = {
      requireReasoning: (prompt) => reasoner(prompt),
    };

    const screen = await screenInput(config.name, input, mode);

    if (screen.decision === "BLOCK") {
      const alert = await notify(input, "BLOCK", screen.reason, null, null);
      return appendEvent({
        agent: config.name,
        channel: "wrap",
        input,
        reasoning: null,
        output: null,
        browser: null,
        customer: null,
        alert,
        decision: "BLOCK",
        reason: screen.reason,
        released: false,
        blockedBeforeAgent: true,
        inputGate: screen.inputGate,
        outputGate: null,
      });
    }

    const turn = await agent(input, helpers);
    const usage = {
      agent: config.name,
      input,
      reasoning: turn.reasoning ?? null,
      output: turn.output ?? null,
    };
    if (!turn.reasoning?.trim()) {
      const blocked = await appendEvent({
        agent: config.name,
        channel: "wrap",
        input,
        reasoning: null,
        output: turn.output ?? null,
        browser: turn.browser ?? null,
        customer: turn.customer ?? null,
        alert: await notify(input, "BLOCK", "Incomplete turn.", turn.output ?? null, turn.customer ?? null),
        decision: "BLOCK",
        reason: "Incomplete turn: the agent did not supply the required reasoning trace.",
        released: false,
        blockedBeforeAgent: false,
        inputGate: screen.inputGate,
        outputGate: null,
      });
      recordTurnUsage({ ...usage, runId: blocked.id });
      return blocked;
    }

    const judged = await judgeTurn({
      agent: config.name,
      channel: "wrap",
      input,
      reasoning: turn.reasoning,
      output: turn.output,
      browser: turn.browser ?? null,
      customer: turn.customer ?? null,
      mode,
      inputGate: screen.inputGate,
      inputDecision: screen.decision,
    });
    recordTurnUsage({ ...usage, runId: judged.id });
    return judged;
  };
}
