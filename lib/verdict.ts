import { THRESHOLDS } from "./questions";
import type { Decision, JevAnswers } from "./types";

export function decide(answers: JevAnswers): { decision: Decision; reason: string } {
  if (answers.secrets.noul >= THRESHOLDS.secrets) {
    return {
      decision: "BLOCK",
      reason: "Possible secrets or credentials in the diff.",
    };
  }

  if (answers.security.noul >= THRESHOLDS.security) {
    return {
      decision: "BLOCK",
      reason: "Security risk is above the auto-merge threshold.",
    };
  }

  if (answers.risk.score >= THRESHOLDS.riskBlock) {
    return {
      decision: "BLOCK",
      reason: "Production risk is too high to ship without a senior pass.",
    };
  }

  if (
    answers.ship.noul >= THRESHOLDS.ship &&
    answers.escalate.noul < THRESHOLDS.escalate
  ) {
    return {
      decision: "SHIP",
      reason: "Jev is confident this can merge. Easy cases stay automated.",
    };
  }

  return {
    decision: "HOLD",
    reason:
      answers.escalate.noul >= THRESHOLDS.escalate
        ? "Uncertainty is high — route to a human, do not auto-merge."
        : "Not clearly safe enough to ship as-is.",
  };
}
