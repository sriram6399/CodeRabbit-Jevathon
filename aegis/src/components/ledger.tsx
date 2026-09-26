"use client";

import { useMemo, useState } from "react";
import type { Decision, GovernedResult } from "@/sdk/types";
import { Badge, Eyebrow, Panel } from "./ui";

export type LedgerEvent = GovernedResult & { createdAt: string };

const FILTERS: Array<Decision | "ALL"> = ["ALL", "ALLOW", "FLAG", "BLOCK"];

function timeOf(iso: string) {
  const t = iso.indexOf("T");
  return t >= 0 ? iso.slice(t + 1, t + 9) : iso;
}

function dateOf(iso: string) {
  return iso.slice(0, 10);
}

export function Ledger({
  events,
  intact,
  selectedId,
  onSelect,
}: {
  events: LedgerEvent[];
  intact: boolean | null;
  selectedId: string | null;
  onSelect: (event: LedgerEvent) => void;
}) {
  const [filter, setFilter] = useState<Decision | "ALL">("ALL");

  const visible = useMemo(
    () => (filter === "ALL" ? events : events.filter((e) => e.decision === filter)),
    [events, filter],
  );

  const counts = useMemo(() => {
    const c: Record<Decision, number> = { ALLOW: 0, FLAG: 0, BLOCK: 0 };
    for (const e of events) c[e.decision] += 1;
    return c;
  }, [events]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Runs" value={String(events.length)} />
        <Stat label="Released" value={String(counts.ALLOW + counts.FLAG)} tone="text-allow" />
        <Stat label="Withheld" value={String(counts.BLOCK)} tone="text-block" />
        <Stat
          label="Chain"
          value={intact === null ? "…" : intact ? "Intact" : "Broken"}
          tone={intact === false ? "text-block" : "text-allow"}
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rim px-5 py-3">
          <Eyebrow>Article 12 record · local SQLite · SHA-256 chained</Eyebrow>
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-1 font-mono text-[10.5px] transition ${
                  filter === f ? "bg-white text-void" : "text-fog hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="font-serif text-lg text-mist">No events{filter !== "ALL" ? ` marked ${filter}` : ""}</p>
            <p className="mt-1 text-sm text-fog">Run a turn in the agent view and it will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-rim">
            {visible.map((event) => {
              const selected = event.id === selectedId;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(event)}
                    className={`grid w-full grid-cols-[88px_1fr_auto] items-start gap-4 px-5 py-3.5 text-left transition sm:grid-cols-[88px_120px_1fr_auto] ${
                      selected ? "bg-signal/[0.06]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="pt-0.5">
                      <Badge decision={event.decision} />
                    </div>
                    <div className="hidden font-mono text-[11px] leading-5 text-fog sm:block">
                      <div>{event.agent}</div>
                      <div className="text-fog/60">{event.channel}</div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-mist">{event.input}</p>
                      <p className="mt-0.5 truncate text-[12px] text-fog">{event.reason}</p>
                    </div>
                    <div className="text-right font-mono text-[10.5px] leading-5 text-fog">
                      <div>{timeOf(event.createdAt)}</div>
                      <div className="text-fog/60">{dateOf(event.createdAt)}</div>
                      <div className="text-fog/40">{event.log.hash.slice(0, 10)}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <Panel className="px-4 py-3.5">
      <Eyebrow>{label}</Eyebrow>
      <div className={`mt-1.5 font-mono text-2xl font-medium tracking-tight ${tone}`}>{value}</div>
    </Panel>
  );
}
