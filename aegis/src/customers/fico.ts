import type { Customer } from "./book";

export type FicoFactors = {
  paymentHistory: number;
  utilization: number;
  historyLength: number;
  newCredit: number;
  creditMix: number;
};

export type FicoResult = {
  score: number;
  factors: FicoFactors;
  weights: FicoFactors;
};

/**
 * A transparent FICO-shaped score from the file, not a bureau pull.
 * Weights follow the published factor mix: 35 / 30 / 15 / 10 / 10.
 */
export function calculateFico(customer: Customer): FicoResult {
  const weights: FicoFactors = {
    paymentHistory: 0.35,
    utilization: 0.3,
    historyLength: 0.15,
    newCredit: 0.1,
    creditMix: 0.1,
  };
  const factors: FicoFactors = {
    paymentHistory: clamp01(customer.onTimeRate),
    utilization: clamp01(1 - customer.utilization),
    historyLength: clamp01(customer.oldestAccountYears / 15),
    newCredit: clamp01(1 - customer.hardInquiries / 6),
    creditMix: clamp01(customer.creditMix / 4),
  };
  const quality =
    factors.paymentHistory * weights.paymentHistory +
    factors.utilization * weights.utilization +
    factors.historyLength * weights.historyLength +
    factors.newCredit * weights.newCredit +
    factors.creditMix * weights.creditMix;
  return {
    score: Math.round(300 + quality * 550),
    factors,
    weights,
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
