import { randomUUID } from "crypto";
import { latestSubscriptions, saveSubscription } from "./store";

export const PLANS = [
  {
    id: "wrap",
    name: "Wrap",
    price: 29,
    billingPeriod: 30,
    agents: "1 production agent",
    turns: "10,000 governed turns / month",
    blurb: "Put one existing agent behind Aegis. Input, reasoning, and output are judged before release.",
  },
  {
    id: "team",
    name: "Team",
    price: 99,
    billingPeriod: 30,
    agents: "10 production agents",
    turns: "100,000 governed turns / month",
    blurb: "Share one ledger across a small fleet of wrapped agents.",
  },
  {
    id: "firm",
    name: "Firm",
    price: 249,
    billingPeriod: 30,
    agents: "Unlimited agents",
    turns: "Ledger export and a named oversight desk",
    blurb: "For teams that need the chain outside the console.",
  },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

export function isPlanId(value: string): value is PlanId {
  return PLANS.some((plan) => plan.id === value);
}

export function billingStatus() {
  return {
    provider: "whop" as const,
    configured: Boolean(process.env.WHOP_API_KEY?.trim() && process.env.WHOP_ACCOUNT_ID?.trim()),
    plans: PLANS,
    recent: latestSubscriptions(),
  };
}

export async function startCheckout(planId: PlanId, email: string) {
  const plan = PLANS.find((item) => item.id === planId)!;
  const apiKey = process.env.WHOP_API_KEY?.trim();
  const accountId = process.env.WHOP_ACCOUNT_ID?.trim();
  const productId = process.env.WHOP_PRODUCT_ID?.trim();

  if (!apiKey || !accountId) {
    return saveSubscription({
      planId,
      email,
      status: "pending",
      checkoutUrl: null,
      note: "Whop is not connected. Set WHOP_API_KEY and WHOP_ACCOUNT_ID (biz_…) to open a hosted checkout for this seat.",
    });
  }

  const response = await fetch("https://api.whop.com/api/v1/checkout_configurations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Api-Version-Date": "2026-08-05-1",
      "Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      account_id: accountId,
      mode: "payment",
      metadata: { product: "aegis", plan: planId, email },
      plan: {
        account_id: accountId,
        ...(productId ? { product_id: productId } : {}),
        plan_type: "renewal",
        billing_period: plan.billingPeriod,
        currency: "usd",
        initial_price: 0,
        renewal_price: plan.price,
        title: `Aegis ${plan.name}`,
        description: plan.blurb,
        visibility: "hidden",
        release_method: "buy_now",
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    purchase_url?: string | null;
    error?: { message?: string };
    message?: string;
  } | null;

  if (!response.ok || !payload?.purchase_url) {
    const message = payload?.error?.message || payload?.message || `Whop returned ${response.status}.`;
    return saveSubscription({
      planId,
      email,
      status: "error",
      checkoutUrl: null,
      note: message.slice(0, 280),
    });
  }

  return saveSubscription({
    planId,
    email,
    status: "checkout",
    checkoutUrl: payload.purchase_url,
    note: `Whop checkout is open for Aegis ${plan.name} at $${plan.price}/month.`,
  });
}
