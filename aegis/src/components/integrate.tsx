"use client";

import { useState } from "react";
import { SNIPPETS } from "@/content/snippets";
import { CodeBlock, Eyebrow, Panel } from "./ui";

const STEPS = [
  {
    n: "01",
    title: "Capture the triple",
    body: "Aegis needs three things from every turn: the user input, the agent's reasoning trace, and the final output. The SDK forces the reasoning step; the REST endpoint accepts it from any framework.",
  },
  {
    n: "02",
    title: "Jev judges the turn",
    body: "Two parallel System One calls. Gate 1 screens the input for Article 5 and Annex III risk. Gate 2 judges reasoning and output for grounding, discrimination, data exposure, and oversight.",
  },
  {
    n: "03",
    title: "Gate, log, prove",
    body: "Confidence-gated ALLOW, FLAG, or BLOCK. Blocked outputs never reach the caller. Every decision is appended to a SHA-256 chained ledger for Article 12 record-keeping.",
  },
];

export function Integrate() {
  const [activeId, setActiveId] = useState(SNIPPETS[0].id);
  const active = SNIPPETS.find((s) => s.id === activeId) ?? SNIPPETS[0];

  return (
    <div className="space-y-6">
      <p className="text-[13.5px] leading-6 text-fog">
        Production wraps are sold on{" "}
        <a href="#subscribe" className="text-signal">
          Subscribe
        </a>
        . Whop takes the payment, and the SDK below is what the seat unlocks.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step) => (
          <Panel key={step.n} className="p-5">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] text-signal">{step.n}</span>
              <h3 className="text-[14px] font-medium text-white">{step.title}</h3>
            </div>
            <p className="mt-2 text-[12.5px] leading-[1.4rem] text-fog">{step.body}</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel className="self-start overflow-hidden">
          <div className="border-b border-rim px-4 py-3">
            <Eyebrow>Connect a live agent</Eyebrow>
          </div>
          <ul className="p-2">
            {SNIPPETS.map((snippet) => {
              const selected = snippet.id === activeId;
              return (
                <li key={snippet.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(snippet.id)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                      selected ? "bg-white/[0.06] text-white" : "text-fog hover:bg-white/[0.03] hover:text-mist"
                    }`}
                  >
                    <div className="text-[13px] font-medium">{snippet.title}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="min-w-0 space-y-3 animate-rise" key={active.id}>
          <p className="text-[13.5px] leading-6 text-mist">{active.summary}</p>
          <CodeBlock code={active.code} language={active.language} filename={active.filename} />
        </div>
      </div>

      <Panel className="p-5">
        <Eyebrow className="mb-3">Response contract</Eyebrow>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="text-[13px] leading-6 text-fog">
            <p>
              Both the SDK and <span className="font-mono text-mist">/api/verify</span> return the same object.
              Branch on <span className="font-mono text-mist">released</span>; show{" "}
              <span className="font-mono text-mist">reason</span> to reviewers; store{" "}
              <span className="font-mono text-mist">log.hash</span> with your own records.
            </p>
            <p className="mt-3">
              Thresholds and question text live in a single policy file so legal and engineering review the same
              artifact.
            </p>
          </div>
          <CodeBlock
            language="json"
            code={`{
  "decision": "ALLOW" | "FLAG" | "BLOCK",
  "released": boolean,
  "reason": string,
  "input": string,
  "reasoning": string | null,
  "output": string | null,
  "inputGate":  { "answers": { ... }, "model": "jev-1.13.0", "latencyMs": 180 },
  "outputGate": { "answers": { ... }, "model": "jev-1.13.0", "latencyMs": 210 },
  "log": { "prevHash": string, "hash": string }
}`}
          />
        </div>
      </Panel>
    </div>
  );
}
