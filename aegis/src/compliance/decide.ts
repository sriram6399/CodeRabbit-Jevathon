import { THRESHOLDS } from "./eu-ai-act";
import type { Decision, InputAnswers, OutputAnswers } from "@/sdk/types";

export function decideInput(answers: InputAnswers): {
  decision: Decision;
  reason: string;
} {
  if (answers.prohibited.noul >= THRESHOLDS.prohibitedBlock) {
    return {
      decision: "BLOCK",
      reason: "Article 5: prompt requests a prohibited practice.",
    };
  }
  if (
    answers.human_first.noul >= THRESHOLDS.humanFirstBlock &&
    answers.prohibited.noul >= 0.35
  ) {
    return {
      decision: "BLOCK",
      reason: "Article 14: human oversight is required before the agent may run.",
    };
  }
  if (answers.human_first.noul >= THRESHOLDS.escalateFlag) {
    return {
      decision: "FLAG",
      reason: "High-risk prompt — agent may run, but a human should watch the turn.",
    };
  }
  return {
    decision: "ALLOW",
    reason: "Input cleared the Article 5 / 6 / 14 screen.",
  };
}

export function decideOutput(
  input: InputAnswers,
  output: OutputAnswers,
): { decision: Decision; reason: string } {
  if (output.discrimination.noul >= THRESHOLDS.discriminationBlock) {
    return {
      decision: "BLOCK",
      reason: "Discriminatory reasoning or protected-class proxy in the decision.",
    };
  }
  if (output.pii_leak.noul >= THRESHOLDS.piiLeakBlock) {
    return {
      decision: "BLOCK",
      reason: "Output leaks personal data beyond operational need.",
    };
  }
  if (output.grounded.noul <= THRESHOLDS.ungroundedBlock) {
    return {
      decision: "BLOCK",
      reason: "Article 15: output is not grounded in the provided state.",
    };
  }
  if (output.compliance.score <= THRESHOLDS.complianceBlock) {
    return {
      decision: "BLOCK",
      reason: "Overall compliance score is in the violation band.",
    };
  }
  if (
    output.escalate.noul >= THRESHOLDS.escalateFlag ||
    output.overconfident.noul >= THRESHOLDS.overconfidentFlag ||
    output.compliance.score <= THRESHOLDS.complianceFlag ||
    input.high_risk.noul >= 0.7
  ) {
    return {
      decision: "FLAG",
      reason:
        input.high_risk.noul >= 0.7 && output.escalate.noul < THRESHOLDS.escalateFlag
          ? "Annex III high-risk use — log and keep a human in the loop."
          : "Uncertainty or accuracy risk — pass through flagged for review.",
    };
  }
  return {
    decision: "ALLOW",
    reason: "Turn is within policy. Evidence written to the ledger.",
  };
}

export function applyMode(
  mode: "gated" | "observe" | "block",
  decision: Decision,
): Decision {
  if (mode === "observe") return decision === "BLOCK" ? "FLAG" : decision;
  if (mode === "block" && decision === "FLAG") return "BLOCK";
  return decision;
}
