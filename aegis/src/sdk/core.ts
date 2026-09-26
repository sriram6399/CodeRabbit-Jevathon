import { alertRecipients, sendDecisionAlert } from "@/alerts/photon";
import { applyMode, decideInput, decideOutput } from "@/compliance/decide";
import { evaluateInput, evaluateOutput } from "@/compliance/jev";
import { appendEvent } from "@/ledger/store";
import type {
  Channel,
  Decision,
  GateMode,
  GateResult,
  GovernedResult,
  InputAnswers,
  VerifyRequest,
} from "./types";

export const REFUSAL =
  "Aegis withheld this response. The agent output was not released to the caller. A human reviewer can inspect the ledger.";

export async function screenInput(agent: string, input: string, mode: GateMode) {
  const inputGate = await evaluateInput(input, agent);
  const judged = decideInput(inputGate.answers);
  return {
    inputGate,
    decision: applyMode(mode, judged.decision),
    reason: judged.reason,
  };
}

export async function judgeTurn(params: {
  agent: string;
  channel: Channel;
  input: string;
  reasoning: string;
  output: string;
  browser?: GovernedResult["browser"];
  customer?: GovernedResult["customer"];
  alert?: GovernedResult["alert"];
  mode: GateMode;
  inputGate: GateResult<InputAnswers>;
  inputDecision: Decision;
}): Promise<GovernedResult> {
  const outputGate = await evaluateOutput({
    agent: params.agent,
    input: params.input,
    reasoning: params.reasoning,
    output: params.output,
  });

  const judged = decideOutput(params.inputGate.answers, outputGate.answers);
  const decision = applyMode(params.mode, judged.decision);
  const released = decision !== "BLOCK";
  const reason =
    decision === "BLOCK"
      ? `${judged.reason} ${REFUSAL}`
      : params.inputDecision === "FLAG"
        ? `${judged.reason} Input was already flagged for oversight.`
        : judged.reason;
  const alert =
    params.alert ??
    (params.channel === "wrap"
      ? await sendDecisionAlert({
          recipients: alertRecipients(params.input, params.customer?.email),
          decision,
          summary: [
            params.customer ? `${params.customer.name} · calculated FICO ${params.customer.fico}` : null,
            reason,
            released ? params.output : "Output withheld.",
          ]
            .filter(Boolean)
            .join("\n"),
        })
      : null);

  return appendEvent({
    agent: params.agent,
    channel: params.channel,
    input: params.input,
    reasoning: params.reasoning,
    output: params.output,
    browser: params.browser ?? null,
    customer: params.customer ?? null,
    alert,
    decision,
    reason,
    released,
    blockedBeforeAgent: false,
    inputGate: params.inputGate,
    outputGate,
  });
}

/**
 * Govern a turn that an external agent has already produced.
 * Used by the REST endpoint and by any SDK that reports a finished triple.
 */
export async function verifyTurn(request: VerifyRequest): Promise<GovernedResult> {
  const mode = request.mode ?? "gated";
  const screen = await screenInput(request.agent, request.input, mode);

  if (screen.decision === "BLOCK") {
    return appendEvent({
      agent: request.agent,
      channel: "verify",
      input: request.input,
      reasoning: request.reasoning,
      output: request.output,
      browser: null,
      customer: null,
      alert: null,
      decision: "BLOCK",
      reason: `${screen.reason} ${REFUSAL}`,
      released: false,
      blockedBeforeAgent: false,
      inputGate: screen.inputGate,
      outputGate: null,
    });
  }

  if (!request.reasoning.trim()) {
    return appendEvent({
      agent: request.agent,
      channel: "verify",
      input: request.input,
      reasoning: null,
      output: request.output,
      browser: null,
      customer: null,
      alert: null,
      decision: "BLOCK",
      reason: `Incomplete turn: no reasoning trace was supplied. ${REFUSAL}`,
      released: false,
      blockedBeforeAgent: false,
      inputGate: screen.inputGate,
      outputGate: null,
    });
  }

  return judgeTurn({
    agent: request.agent,
    channel: "verify",
    input: request.input,
    reasoning: request.reasoning,
    output: request.output,
    mode,
    inputGate: screen.inputGate,
    inputDecision: screen.decision,
  });
}
