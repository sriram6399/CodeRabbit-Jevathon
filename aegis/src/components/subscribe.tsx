"use client";

import { useCallback, useEffect, useState } from "react";
import type { SubscriptionRow } from "@/platform/store";
import type { PlanId } from "@/platform/whop";
import { Eyebrow, Panel, Spinner } from "./ui";

type Plan = {
  id: PlanId;
  name: string;
  price: number;
  agents: string;
  turns: string;
  blurb: string;
};

export function Subscribe() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [configured, setConfigured] = useState(false);
  const [recent, setRecent] = useState<SubscriptionRow | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/platform", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as {
      billing: { configured: boolean; plans: Plan[]; recent: SubscriptionRow[] };
    };
    setPlans(data.billing.plans);
    setConfigured(data.billing.configured);
    setRecent(data.billing.recent[0] ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function subscribe(planId: PlanId) {
    setBusy(planId);
    setNotice(null);
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, email }),
      });
      const data = (await response.json()) as { error?: string; note?: string; checkoutUrl?: string | null };
      if (!response.ok) throw new Error(data.error ?? "Checkout failed.");
      setNotice(data.note ?? "Checkout saved.");
      if (data.checkoutUrl) window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <Panel className="p-8">
        <Spinner label="loading plans" />
      </Panel>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Eyebrow>Subscription</Eyebrow>
        <h2 className="mt-2 font-serif text-[40px] leading-none text-white">Wrap the agents you already run.</h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-mist">
          A seat is permission to put production agents behind Aegis. Whop takes the card payment. The playground on
          this machine stays open either way.
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
          {configured ? "Whop checkout is live" : "Whop key is not set · a seat is saved as pending"}
        </p>
      </div>

      <label className="block max-w-md">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fog">Billing email</span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="billing@company.com"
          className="mt-2 w-full rounded-lg border border-rim bg-void px-3 py-2.5 text-[14px] text-white placeholder:text-fog/60 focus:outline-none"
        />
      </label>

      {notice && <p className="text-[13.5px] leading-6 text-mist">{notice}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Panel key={plan.id} className="flex flex-col p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog">{plan.name}</div>
            <div className="mt-3 font-serif text-[40px] leading-none text-white">
              ${plan.price}
              <span className="ml-1 font-sans text-[14px] text-fog">/mo</span>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-mist">{plan.blurb}</p>
            <p className="mt-3 text-[12.5px] leading-5 text-fog">
              {plan.agents}
              <br />
              {plan.turns}
            </p>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void subscribe(plan.id)}
              className="mt-5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-void transition hover:bg-mist disabled:opacity-40"
            >
              {busy === plan.id ? "Opening…" : `Subscribe to ${plan.name}`}
            </button>
          </Panel>
        ))}
      </div>

      {recent && (
        <p className="text-[12.5px] leading-5 text-fog">
          Latest seat: {recent.email} · {recent.planId} · {recent.status}
          {recent.checkoutUrl && (
            <>
              {" · "}
              <a className="text-signal" href={recent.checkoutUrl}>
                Open checkout
              </a>
            </>
          )}
          {recent.note ? ` · ${recent.note}` : ""}
        </p>
      )}
    </div>
  );
}
