"use client";

import { useMemo, useState } from "react";
import { SAMPLE_DIFFS, SAMPLE_PRS } from "@/lib/samples";
import type { Decision, VerdictResult } from "@/lib/types";

const TONE: Record<Decision, { label: string; color: string; glow: string }> = {
  SHIP: { label: "SHIP", color: "text-ship", glow: "shadow-[0_0_80px_rgba(61,255,154,0.18)]" },
  HOLD: { label: "HOLD", color: "text-hold", glow: "shadow-[0_0_80px_rgba(255,197,61,0.16)]" },
  BLOCK: { label: "BLOCK", color: "text-block", glow: "shadow-[0_0_80px_rgba(255,92,106,0.18)]" },
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function Meter({ value, invert = false }: { value: number; invert?: boolean }) {
  const tone =
    (invert ? 1 - value : value) > 0.66
      ? "bg-block"
      : (invert ? 1 - value : value) > 0.4
        ? "bg-hold"
        : "bg-ship";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full ${tone}`} style={{ width: pct(value) }} />
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState(SAMPLE_PRS[0].url);
  const [title, setTitle] = useState("");
  const [diff, setDiff] = useState("");
  const [mode, setMode] = useState<"pr" | "diff">("pr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerdictResult | null>(null);

  const tone = result ? TONE[result.decision] : null;

  const actions = useMemo(() => {
    if (!result) return [];
    const { answers } = result;
    return [
      {
        title: "Auto-merge",
        on: result.decision === "SHIP",
        detail: `ship ${pct(answers.ship.noul)} · escalate ${pct(answers.escalate.noul)}`,
      },
      {
        title: "Ask Devin to fix",
        on: answers.agent_fix.noul >= 0.55 && result.decision !== "SHIP",
        detail: `agent_fix ${pct(answers.agent_fix.noul)}`,
      },
      {
        title: "Human review",
        on: result.decision !== "SHIP",
        detail: result.decision === "BLOCK" ? "hard stop" : "confidence-gated hold",
      },
    ];
  }, [result]);

  async function run(payload?: { url?: string; title?: string; diff?: string }) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: payload?.url ?? url,
          title: payload?.title ?? title,
          diff: payload?.diff ?? (mode === "diff" ? diff : ""),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Verdict failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verdict failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid-fade min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-mute">
              Jevathon · TypeSafe × CodeRabbit
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              Verdict
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
              LLMs write reviews. Jev decides. Twelve typed questions, one
              200ms call, a ship / hold / block you can actually put in code.
            </p>
          </div>
          <div className="font-mono text-xs text-mute">
            {result ? (
              <div className="rounded-lg border border-line bg-panel px-3 py-2">
                {result.mocked ? "mock mode · set TYPESAFE_API_KEY" : result.model}
                <span className="mx-2 text-white/20">·</span>
                {result.latencyMs}ms
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-panel px-3 py-2">
                state in · typed decision out
              </div>
            )}
          </div>
        </header>

        <section className="rounded-2xl border border-line bg-panel/80 p-5 backdrop-blur">
          <div className="mb-4 flex gap-2 font-mono text-[11px]">
            <button
              onClick={() => setMode("pr")}
              className={`rounded-full px-3 py-1 ${mode === "pr" ? "bg-white text-ink" : "text-mute"}`}
            >
              GitHub PR
            </button>
            <button
              onClick={() => setMode("diff")}
              className={`rounded-full px-3 py-1 ${mode === "diff" ? "bg-white text-ink" : "text-mute"}`}
            >
              Paste diff
            </button>
          </div>

          {mode === "pr" ? (
            <>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/org/repo/pull/123"
                  className="w-full rounded-xl border border-line bg-ink px-4 py-3 font-mono text-sm outline-none ring-ship/40 focus:ring-2"
                />
                <button
                  onClick={() => run()}
                  disabled={loading}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  {loading ? "Judging…" : "Ask Jev"}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {SAMPLE_PRS.map((sample) => (
                  <button
                    key={sample.url}
                    onClick={() => {
                      setUrl(sample.url);
                      void run({ url: sample.url, diff: "" });
                    }}
                    className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-mute hover:text-white"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="PR title"
                className="mb-3 w-full rounded-xl border border-line bg-ink px-4 py-3 font-mono text-sm outline-none"
              />
              <textarea
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                placeholder="Paste a unified diff"
                rows={8}
                className="w-full rounded-xl border border-line bg-ink px-4 py-3 font-mono text-xs outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => run()}
                  disabled={loading || !diff.trim()}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  {loading ? "Judging…" : "Ask Jev"}
                </button>
                {SAMPLE_DIFFS.map((sample) => (
                  <button
                    key={sample.label}
                    onClick={() => {
                      setTitle(sample.title);
                      setDiff(sample.diff);
                      void run({ title: sample.title, diff: sample.diff });
                    }}
                    className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-mute hover:text-white"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {error && <p className="mt-3 text-sm text-block">{error}</p>}
        </section>

        {result && tone && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className={`rounded-2xl border border-line bg-panel p-6 ${tone.glow}`}>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mute">
                Confidence-gated decision
              </p>
              <div className={`mt-3 font-mono text-7xl font-semibold ${tone.color}`}>
                {tone.label}
              </div>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/80">
                {result.reason}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {actions.map((action) => (
                  <div
                    key={action.title}
                    className={`rounded-xl border px-3 py-3 ${
                      action.on
                        ? "border-white/20 bg-white/5"
                        : "border-line text-mute"
                    }`}
                  >
                    <div className="text-sm font-medium">{action.title}</div>
                    <div className="mt-1 font-mono text-[11px]">{action.detail}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-4">
                <NoulRow
                  label="Ship as-is"
                  value={result.answers.ship.noul}
                />
                <NoulRow
                  label="Security risk"
                  value={result.answers.security.noul}
                  invert
                />
                <NoulRow label="Secrets in diff" value={result.answers.secrets.noul} invert />
                <NoulRow label="Breaking change" value={result.answers.breaking.noul} invert />
                <NoulRow label="Tests missing" value={result.answers.tests_needed.noul} invert />
                <NoulRow label="Escalate to human" value={result.answers.escalate.noul} invert />
                <NoulRow label="Devin should auto-fix" value={result.answers.agent_fix.noul} />
                <NoulRow label="Review-ready" value={result.answers.review_ready.noul} />
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-line bg-panel p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mute">
                  {result.pr.owner}/{result.pr.repo}#{result.pr.number || "diff"}
                </p>
                <h2 className="mt-2 text-lg font-medium leading-snug">
                  {result.pr.title}
                </h2>
                <p className="mt-3 font-mono text-xs text-mute">
                  +{result.pr.additions} / −{result.pr.deletions} · {result.pr.changedFiles} files · {result.answers.category.choice}
                </p>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between font-mono text-[11px] text-mute">
                    <span>Risk</span>
                    <span>{result.answers.risk.score.toFixed(1)} / 4</span>
                  </div>
                  <Meter value={result.answers.risk.score / 4} invert />
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between font-mono text-[11px] text-mute">
                    <span>Blast radius</span>
                    <span>{result.answers.blast_radius.score.toFixed(1)} / 3</span>
                  </div>
                  <Meter value={result.answers.blast_radius.score / 3} invert />
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-panel p-5">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-mute">
                  Files Jev saw
                </p>
                <ul className="space-y-2 font-mono text-[11px]">
                  {result.pr.files.map((file) => (
                    <li key={file.filename} className="flex justify-between gap-3 text-mute">
                      <span className="truncate text-white/80">{file.filename}</span>
                      <span>
                        +{file.additions}/−{file.deletions}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {result.pr.reviews.length > 0 && (
                <div className="rounded-2xl border border-line bg-panel p-5">
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-mute">
                    Review signals
                  </p>
                  <ul className="space-y-3">
                    {result.pr.reviews.slice(0, 3).map((review, i) => (
                      <li key={`${review.author}-${i}`}>
                        <p className="font-mono text-[11px] text-hold">
                          {review.source === "coderabbit" ? "CodeRabbit" : review.author}
                        </p>
                        <p className="mt-1 line-clamp-4 text-xs leading-5 text-mute">
                          {review.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl border border-line bg-panel p-5 font-mono text-[11px] leading-5 text-mute">
                Jev does not generate text. It returns calibrated probabilities
                your code can branch on. Thresholds live in{" "}
                <span className="text-white/70">lib/questions.ts</span>.
                {result.usage && (
                  <>
                    {" "}
                    {result.usage.input_tokens} in / {result.usage.output_tokens} out.
                  </>
                )}
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}

function NoulRow({
  label,
  value,
  invert = false,
}: {
  label: string;
  value: number;
  invert?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/80">{label}</span>
        <span className="font-mono text-mute">{pct(value)}</span>
      </div>
      <Meter value={value} invert={invert} />
    </div>
  );
}
