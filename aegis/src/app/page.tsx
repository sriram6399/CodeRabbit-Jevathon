"use client";

import { useCallback, useEffect, useState } from "react";
import { About } from "@/components/about";
import { Feedback } from "@/components/feedback";
import { Inspector } from "@/components/inspector";
import { Integrate } from "@/components/integrate";
import { Ledger, type LedgerEvent } from "@/components/ledger";
import { AegisMark, Wordmark } from "@/components/logo";
import { Platform } from "@/components/platform";
import { Playground } from "@/components/playground";
import { Subscribe } from "@/components/subscribe";
import type { LedgerStats } from "@/ledger/store";
import type { GovernedResult } from "@/sdk/types";

type View = "playground" | "ledger" | "integrate" | "platform" | "feedback" | "about" | "subscribe";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "playground", label: "Playground" },
  { id: "ledger", label: "Ledger" },
  { id: "integrate", label: "Integrate" },
  { id: "platform", label: "Platform" },
  { id: "feedback", label: "Feedback" },
  { id: "about", label: "About" },
  { id: "subscribe", label: "Subscribe" },
];

function isView(value: string): value is View {
  return VIEWS.some((v) => v.id === value);
}

function judgeLabel(mocked: boolean | null, model: string | null) {
  if (mocked === null || !model) return null;
  return mocked ? "mock" : model;
}

export default function Home() {
  const [view, setViewState] = useState<View>("playground");
  const [selected, setSelected] = useState<GovernedResult | null>(null);
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [intact, setIntact] = useState<boolean | null>(null);
  const [stats, setStats] = useState<LedgerStats | null>(null);

  // Deep-linkable views: #playground, #ledger, #integrate, #platform, #feedback, #about, #subscribe
  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace("#", "");
      setViewState(isView(hash) ? hash : "playground");
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const setView = useCallback((next: View) => {
    setViewState(next);
    if (typeof window !== "undefined") {
      const target = `#${next}`;
      if (window.location.hash !== target) {
        window.history.replaceState(null, "", target);
      }
    }
  }, []);

  const refreshLedger = useCallback(async () => {
    try {
      const response = await fetch("/api/ledger", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        events?: LedgerEvent[];
        intact?: boolean;
        stats?: LedgerStats;
      };
      setEvents(data.events ?? []);
      setIntact(typeof data.intact === "boolean" ? data.intact : null);
      setStats(data.stats ?? null);
    } catch {
      // keep last known state
    }
  }, []);

  useEffect(() => {
    void refreshLedger();
  }, [refreshLedger]);

  function handleEvent(event: GovernedResult) {
    setSelected(event);
    void refreshLedger();
  }

  const judge = judgeLabel(stats?.lastMocked ?? null, stats?.lastJudge ?? null);
  const total = stats?.total ?? events.length;
  const withheld = stats?.withheld ?? events.filter((e) => e.decision === "BLOCK").length;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-void/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={() => setView("playground")}
              className="flex shrink-0 items-center gap-2.5"
              aria-label="Aegis home"
            >
              <AegisMark size={26} glow />
              <Wordmark className="text-[20px] leading-none" />
            </button>
            <nav className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-all duration-200 ${
                    view === v.id
                      ? "bg-white text-void shadow-[0_0_24px_-6px_rgba(255,255,255,0.6)]"
                      : "text-fog hover:text-white"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-4 font-mono text-[11px] text-fog md:flex">
            <span>
              judge <span className="text-mist">{judge ?? "—"}</span>
            </span>
            <span className="text-rim2">|</span>
            <span>
              runs <span className="text-mist">{total}</span>
            </span>
            <span className="text-rim2">|</span>
            <span>
              avg <span className="text-mist">{stats ? `${stats.avgLatencyMs} ms` : "—"}</span>
            </span>
            <span className="text-rim2">|</span>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  intact === null ? "bg-fog" : intact ? "bg-allow shadow-[0_0_8px_rgba(74,222,156,0.9)]" : "bg-block"
                }`}
              />
              {intact === null ? "chain" : intact ? "chain intact" : "chain broken"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 pb-10 pt-6 md:px-8">
        {view === "playground" && (
          <>
            <Hero events={total} withheld={withheld} judge={judge} />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <Playground onEvent={handleEvent} selectedId={selected?.id ?? null} onSelect={setSelected} />
              <div className="lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-11rem)] lg:min-h-[560px] lg:overflow-y-auto lg:pr-1">
                <Inspector event={selected} />
              </div>
            </div>
          </>
        )}

        {view === "ledger" && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Ledger events={events} intact={intact} selectedId={selected?.id ?? null} onSelect={setSelected} />
            <div className="lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
              <Inspector
                event={selected}
                emptyHint="Select a run from the ledger to see its captured triple, both Jev gates, and the chain proof."
              />
            </div>
          </div>
        )}

        {view === "integrate" && <Integrate />}

        {view === "platform" && <Platform />}

        {view === "feedback" && <Feedback />}

        {view === "about" && <About />}

        {view === "subscribe" && <Subscribe />}
      </main>
    </div>
  );
}

function Hero({ events, withheld, judge }: { events: number; withheld: number; judge: string | null }) {
  return (
    <section className="edge relative mb-6 overflow-hidden rounded-3xl bg-slate/60 px-6 py-7 md:px-9 md:py-8">
      <div className="orb -left-20 -top-24 h-72 w-72 bg-signal/40" />
      <div className="orb -bottom-28 right-10 h-80 w-80 bg-allow/25 [animation-delay:-7s]" />

      <div className="relative flex flex-wrap items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="halo flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-2xl">
            <AegisMark size={52} glow />
          </div>
          <div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-4">
              <Wordmark className="text-[56px] leading-none md:text-[64px]" />
              <span className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.28em] text-fog">
                runtime governance
              </span>
            </div>
            <p className="mt-3 max-w-2xl font-serif text-[19px] leading-snug text-mist md:text-[21px]">
              Every agent decision, <span className="italic text-white">verified before release.</span>
            </p>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-fog">
              Aegis captures the reasoning and output of every turn, judges it against the EU AI Act with Jev in
              a few hundred milliseconds, and withholds anything that fails. The evidence is chained and auditable.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:min-w-[340px]">
          <Stat label="Decisions" value={String(events)} />
          <Stat label="Withheld" value={String(withheld)} tone={withheld > 0 ? "text-block" : "text-white"} />
          <Stat label="Judge" value={judge ? (judge === "mock" ? "mock" : "jev") : "—"} tone="text-signal" />
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap gap-2 font-mono text-[10.5px] text-fog">
        <Chip>Art. 5 prohibited practices</Chip>
        <Chip>Art. 6 · Annex III</Chip>
        <Chip>Art. 12 record-keeping</Chip>
        <Chip>Art. 14 human oversight</Chip>
        <Chip>Art. 15 accuracy</Chip>
        <Chip>Art. 50 transparency</Chip>
      </div>
    </section>
  );
}

function Stat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-void/60 px-3.5 py-3 backdrop-blur">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">{label}</div>
      <div className={`mt-1 font-mono text-[22px] font-medium tabular-nums leading-none ${tone}`}>{value}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 transition hover:border-signal/40 hover:text-mist">
      {children}
    </span>
  );
}
