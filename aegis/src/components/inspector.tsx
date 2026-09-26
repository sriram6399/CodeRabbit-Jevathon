"use client";

import type { GovernedResult } from "@/sdk/types";
import { AegisMark } from "./logo";
import { DECISION_META, Eyebrow, MeterRow, Panel } from "./ui";

const ARTICLE_LABEL: Record<string, string> = {
  art5: "Article 5 · prohibited practices",
  art6: "Article 6 · Annex III high-risk",
  art12: "Article 12 · record-keeping",
  art14: "Article 14 · human oversight",
  art15: "Article 15 · accuracy",
  art50: "Article 50 · transparency",
  none: "No article at risk",
};

const CLASS_LABEL: Record<string, string> = {
  credit: "Creditworthiness",
  employment: "Employment",
  education: "Education",
  essential: "Essential services",
  general: "General assistance",
  prohibited: "Prohibited practice",
};

export function Inspector({
  event,
  emptyHint = "Send a message to the agent. Aegis will capture the reasoning and output, judge the turn, and show the evidence here.",
}: {
  event: GovernedResult | null;
  emptyHint?: string;
}) {
  if (!event) {
    return (
      <Panel className="flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center">
        <div className="halo mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
          <AegisMark size={36} glow />
        </div>
        <p className="font-serif text-xl text-mist">Nothing inspected yet</p>
        <p className="mt-2 max-w-xs text-sm leading-6 text-fog">{emptyHint}</p>
      </Panel>
    );
  }

  const meta = DECISION_META[event.decision];
  const totalLatency = event.inputGate.latencyMs + (event.outputGate?.latencyMs ?? 0);
  const mocked = event.inputGate.mocked || Boolean(event.outputGate?.mocked);
  const out = event.outputGate?.answers;

  return (
    <div className="space-y-4 animate-rise" key={event.id}>
      <Panel className={`p-6 ${meta.shadow}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow>{meta.label}</Eyebrow>
            <div className={`mt-2 font-mono text-5xl font-medium tracking-tight ${meta.text}`}>
              {event.decision}
            </div>
          </div>
          <div className="text-right font-mono text-[11px] leading-5 text-fog">
            <div>{mocked ? "mock judge" : event.inputGate.model}</div>
            <div>{totalLatency} ms</div>
            <div className="text-fog/60">{event.channel === "wrap" ? "sdk wrap" : "rest verify"}</div>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-6 text-mist">{event.reason}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-[12px]">
          <Fact label="Use class" value={CLASS_LABEL[event.inputGate.answers.use_class.choice] ?? event.inputGate.answers.use_class.choice} />
          <Fact
            label="Primary concern"
            value={out ? ARTICLE_LABEL[out.primary_article.choice] ?? out.primary_article.choice : "Input gate refused"}
          />
          <Fact
            label="Compliance score"
            value={out ? `${out.compliance.score.toFixed(1)} / 4` : "—"}
          />
          <Fact label="Agent" value={event.agent} mono />
        </div>
      </Panel>

      <Panel className="p-5">
        <Eyebrow className="mb-4">Captured triple</Eyebrow>
        <div className="space-y-4">
          <Triple label="Input" body={event.input} />
          <Triple
            label="Reasoning"
            hint="captured by Aegis"
            body={event.reasoning ?? "The agent never ran. The input gate refused the turn."}
            muted={!event.reasoning}
          />
          <Triple
            label={event.released ? "Output" : "Output · withheld from caller"}
            body={event.output ?? "No output was generated."}
            muted={!event.released}
          />
        </div>
      </Panel>

      {event.customer && <CustomerCard customer={event.customer} />}
      {event.browser && <BrowserCard evidence={event.browser} />}
      {event.alert && <AlertCard alert={event.alert} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <Eyebrow>Gate 1 · input</Eyebrow>
            <span className="font-mono text-[10.5px] text-fog">{event.inputGate.latencyMs} ms</span>
          </div>
          <div className="space-y-3.5">
            <MeterRow label="Prohibited practice" hint="Art. 5" value={event.inputGate.answers.prohibited.noul} />
            <MeterRow label="High-risk use" hint="Art. 6" value={event.inputGate.answers.high_risk.noul} />
            <MeterRow label="Personal data in prompt" value={event.inputGate.answers.pii_in_prompt.noul} />
            <MeterRow label="Human review first" hint="Art. 14" value={event.inputGate.answers.human_first.noul} />
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <Eyebrow>Gate 2 · reasoning + output</Eyebrow>
            <span className="font-mono text-[10.5px] text-fog">
              {event.outputGate ? `${event.outputGate.latencyMs} ms` : "skipped"}
            </span>
          </div>
          {out ? (
            <div className="space-y-3.5">
              <MeterRow label="Grounded in stated facts" hint="Art. 15" value={out.grounded.noul} risk={false} />
              <MeterRow label="Discriminatory proxy" value={out.discrimination.noul} />
              <MeterRow label="Personal data leak" value={out.pii_leak.noul} />
              <MeterRow label="Overconfident reasoning" value={out.overconfident.noul} />
              <MeterRow label="Disclose AI to user" hint="Art. 50" value={out.needs_transparency.noul} />
              <MeterRow label="Escalate to human" hint="Art. 14" value={out.escalate.noul} />
            </div>
          ) : (
            <p className="text-sm leading-6 text-fog">
              Not evaluated. The turn was stopped before the agent produced an output.
            </p>
          )}
        </Panel>
      </div>

      <Panel className="p-5">
        <Eyebrow className="mb-3">Ledger proof</Eyebrow>
        <dl className="space-y-2 font-mono text-[11px]">
          <div className="flex gap-3">
            <dt className="w-14 shrink-0 text-fog">hash</dt>
            <dd className="break-all text-mist">{event.log.hash}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-14 shrink-0 text-fog">prev</dt>
            <dd className="break-all text-fog">{event.log.prevHash}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-14 shrink-0 text-fog">id</dt>
            <dd className="break-all text-fog">{event.id}</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}

function CustomerCard({ customer }: { customer: NonNullable<GovernedResult["customer"]> }) {
  const rows: Array<[string, number]> = [
    ["Payment history", customer.factors.paymentHistory],
    ["Utilization headroom", customer.factors.utilization],
    ["History length", customer.factors.historyLength],
    ["New credit", customer.factors.newCredit],
    ["Credit mix", customer.factors.creditMix],
  ];
  return (
    <Panel className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Eyebrow>LlamaIndex · customer file</Eyebrow>
        <span className="font-mono text-lg text-signal">{customer.fico}</span>
      </div>
      <p className="text-[13.5px] text-white">{customer.name}</p>
      <p className="mt-1 font-mono text-[11px] text-fog">
        {customer.email} · {customer.city} · income ${customer.income.toLocaleString()} · obligations $
        {customer.monthlyObligations.toLocaleString()}/mo
      </p>
      <div className="mt-4 space-y-2.5">
        {rows.map(([label, value]) => (
          <MeterRow key={label} label={label} value={value} risk={false} />
        ))}
      </div>
    </Panel>
  );
}

function AlertCard({ alert }: { alert: NonNullable<GovernedResult["alert"]> }) {
  const tone = alert.status === "sent" ? "text-allow" : alert.status === "error" ? "text-block" : "text-flag";
  return (
    <Panel className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Eyebrow>Photon · email alert</Eyebrow>
        <span className={`font-mono text-[11px] uppercase tracking-[0.16em] ${tone}`}>{alert.status}</span>
      </div>
      <p className="text-[13px] leading-6 text-mist">{alert.note}</p>
      <p className="mt-2 font-mono text-[11px] text-fog">{alert.to.join(", ")}</p>
      <p className="mt-3 whitespace-pre-wrap border-l-2 border-rim pl-3 text-[12.5px] leading-5 text-fog">{alert.body}</p>
    </Panel>
  );
}

function BrowserCard({ evidence }: { evidence: NonNullable<GovernedResult["browser"]> }) {
  const tone =
    evidence.status === "live" ? "text-allow" : evidence.status === "error" ? "text-block" : "text-flag";
  return (
    <Panel className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Eyebrow>Browserbase</Eyebrow>
        <span className={`font-mono text-[11px] uppercase tracking-[0.16em] ${tone}`}>{evidence.status}</span>
      </div>
      <p className="text-[13px] leading-6 text-mist">{evidence.note}</p>
      <dl className="mt-3 space-y-1.5 font-mono text-[11px] text-fog">
        <div className="flex gap-3">
          <dt className="w-16 shrink-0">page</dt>
          <dd className="min-w-0 truncate text-mist" title={evidence.pageUrl}>
            {evidence.pageUrl}
          </dd>
        </div>
        {evidence.sessionId && (
          <div className="flex gap-3">
            <dt className="w-16 shrink-0">session</dt>
            <dd className="min-w-0 truncate text-mist">{evidence.sessionId}</dd>
          </div>
        )}
        <div className="flex gap-3">
          <dt className="w-16 shrink-0">time</dt>
          <dd className="text-mist">{evidence.latencyMs} ms</dd>
        </div>
      </dl>
      {evidence.excerpt && (
        <p className="mt-3 border-l-2 border-rim pl-3 text-[12.5px] leading-5 text-fog">{evidence.excerpt}</p>
      )}
      {evidence.replayUrl && (
        <a
          href={evidence.replayUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex font-mono text-[11px] text-signal hover:text-white"
        >
          Open session replay
        </a>
      )}
    </Panel>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-rim bg-white/[0.02] px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{label}</div>
      <div className={`mt-1 truncate text-mist ${mono ? "font-mono text-[12px]" : ""}`} title={value}>
        {value}
      </div>
    </div>
  );
}

function Triple({
  label,
  hint,
  body,
  muted = false,
}: {
  label: string;
  hint?: string;
  body: string;
  muted?: boolean;
}) {
  return (
    <div className="border-l-2 border-rim pl-4">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fog">{label}</span>
        {hint && <span className="font-mono text-[10px] text-signal/80">{hint}</span>}
      </div>
      <p className={`mt-1.5 whitespace-pre-wrap text-[13px] leading-6 ${muted ? "text-fog" : "text-mist"}`}>
        {body}
      </p>
    </div>
  );
}