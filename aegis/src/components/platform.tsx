"use client";

import { useCallback, useEffect, useState } from "react";
import type { HandoffRow, ReviewRow, SubscriptionRow } from "@/platform/store";
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

type PlatformState = {
  review: {
    cli: boolean;
    authenticated: boolean;
    command: string;
    last: ReviewRow | null;
  };
  billing: {
    configured: boolean;
    plans: Plan[];
    recent: SubscriptionRow[];
  };
  cognition: {
    configured: boolean;
    last: HandoffRow | null;
  };
  runtime: {
    configured: boolean;
    model: string;
    endpoint: string;
    docker: { available: boolean; version: string | null };
    command: string;
    dedicated: Array<{ sku: string; usdPerHour: number; note: string }>;
    loanAgent: {
      turns: number;
      measuredRuns: number;
      measuredTokens: number;
      estimatedTokens: number;
      estimateNote: string;
    };
  };
};

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] ${
        ok ? "bg-allow/10 text-allow" : "bg-flag/10 text-flag"
      }`}
    >
      {label}
    </span>
  );
}

export function Platform() {
  const [state, setState] = useState<PlatformState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/platform", { cache: "no-store" });
    if (!response.ok) return;
    setState((await response.json()) as PlatformState);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(key: string, url: string, body?: unknown) {
    setBusy(key);
    setNotice(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json()) as { error?: string; summary?: string; note?: string };
      if (!response.ok) throw new Error(data.error ?? "Request failed.");
      setNotice(data.summary || data.note || "Done.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(null);
    }
  }

  if (!state) {
    return (
      <Panel className="p-8">
        <Spinner label="loading platform" />
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>Platform</Eyebrow>
        <h2 className="mt-2 font-serif text-[32px] leading-none text-white">Review, subscribe, hand off, deploy.</h2>
        <p className="mt-3 max-w-3xl text-[14px] leading-6 text-fog">
          Each control stays on this page when its credential is missing. Connecting the key turns the same button
          into a live call. Notes for a chapter gathering live on{" "}
          <a href="#feedback" className="text-signal">
            Feedback
          </a>
          .
        </p>
        {notice && <p className="mt-3 text-[13.5px] leading-6 text-mist">{notice}</p>}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Eyebrow>CodeRabbit</Eyebrow>
            <Pill ok={state.review.cli} label={state.review.cli ? "cli ready" : "cli missing"} />
          </div>
          <h3 className="text-[16px] font-medium text-white">Review this repo</h3>
          <p className="mt-2 text-[13px] leading-6 text-fog">
            Runs <span className="font-mono text-mist">{state.review.command}</span> against the git worktree. Without
            the CLI, the review is saved as unavailable and the command stays here.
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void act("review", "/api/review")}
            className="mt-4 rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-void transition hover:bg-mist disabled:opacity-40"
          >
            {busy === "review" ? "Reviewing…" : "Review this repo"}
          </button>
          {state.review.last && (
            <p className="mt-4 border-l-2 border-rim pl-3 text-[12.5px] leading-5 text-fog">
              <span className="font-mono uppercase tracking-[0.14em] text-mist">{state.review.last.status}</span>
              {" · "}
              {state.review.last.summary}
            </p>
          )}
        </Panel>

        <Panel className="flex flex-col justify-between p-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <Eyebrow>Whop · subscription</Eyebrow>
              <Pill ok={state.billing.configured} label={state.billing.configured ? "checkout live" : "key missing"} />
            </div>
            <h3 className="text-[16px] font-medium text-white">Plans live on Subscribe</h3>
            <p className="mt-2 text-[13px] leading-6 text-fog">
              Wrap, Team, and Firm are on their own page. Whop still hosts the payment.
            </p>
          </div>
          <a
            href="#subscribe"
            className="mt-4 inline-flex w-fit rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-void transition hover:bg-mist"
          >
            Open Subscribe
          </a>
        </Panel>

        <Panel className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Eyebrow>Cognition · Devin</Eyebrow>
            <Pill ok={state.cognition.configured} label={state.cognition.configured ? "api ready" : "key missing"} />
          </div>
          <h3 className="text-[16px] font-medium text-white">Hand work to Devin</h3>
          <p className="mt-2 text-[13px] leading-6 text-fog">
            Opens a Devin session to wrap an outside agent, or to fix the latest CodeRabbit findings. The prompt is
            stored either way.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void act("wrap", "/api/cognition", { task: "wrap" })}
              className="rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-void transition hover:bg-mist disabled:opacity-40"
            >
              {busy === "wrap" ? "Sending…" : "Wrap an agent"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void act("devin-review", "/api/cognition", { task: "review" })}
              className="rounded-lg border border-rim px-3.5 py-2 text-[13px] text-mist transition hover:text-white disabled:opacity-40"
            >
              {busy === "devin-review" ? "Sending…" : "Fix the review"}
            </button>
          </div>
          {state.cognition.last && (
            <p className="mt-4 border-l-2 border-rim pl-3 text-[12.5px] leading-5 text-fog">
              <span className="font-mono uppercase tracking-[0.14em] text-mist">{state.cognition.last.status}</span>
              {" · "}
              {state.cognition.last.note}
              {state.cognition.last.sessionUrl && (
                <>
                  {" "}
                  <a className="text-signal" href={state.cognition.last.sessionUrl}>
                    Open session
                  </a>
                </>
              )}
            </p>
          )}
        </Panel>

        <Panel className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Eyebrow>GMI · local deploy</Eyebrow>
            <Pill
              ok={state.runtime.docker.available}
              label={state.runtime.docker.available ? `docker ${state.runtime.docker.version}` : "docker missing"}
            />
          </div>
          <h3 className="text-[16px] font-medium text-white">Loan agent cost</h3>
          <p className="mt-2 text-[13px] leading-6 text-fog">
            The container in <span className="font-mono text-mist">docker-compose.yml</span> runs the loan agent and
            sends its reasoning to {state.runtime.model} on GMI when <span className="font-mono">GMI_API_KEY</span> is
            set.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Turns" value={String(state.runtime.loanAgent.turns)} />
            <Stat label="GMI tokens" value={state.runtime.loanAgent.measuredTokens.toLocaleString()} />
            <Stat label="Estimated" value={state.runtime.loanAgent.estimatedTokens.toLocaleString()} />
          </div>
          <p className="mt-3 text-[12px] leading-5 text-fog">{state.runtime.loanAgent.estimateNote}</p>
          <div className="mt-3 space-y-1 font-mono text-[11.5px] text-mist">
            {state.runtime.dedicated.map((rate) => (
              <div key={rate.sku}>
                {rate.sku} · ${rate.usdPerHour.toFixed(2)}/hr
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void act("deploy", "/api/deploy")}
            className="mt-4 rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-void transition hover:bg-mist disabled:opacity-40"
          >
            {busy === "deploy" ? "Checking…" : "Check local Docker"}
          </button>
          <p className="mt-3 font-mono text-[11px] text-fog">{state.runtime.command}</p>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-void/60 px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">{label}</div>
      <div className="mt-1 font-mono text-[18px] text-white">{value}</div>
    </div>
  );
}
