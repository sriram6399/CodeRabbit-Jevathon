"use client";

import { useEffect, useRef, useState } from "react";
import type { Decision } from "@/sdk/types";

export const DECISION_META: Record<
  Decision,
  { text: string; bg: string; dot: string; ring: string; shadow: string; label: string }
> = {
  ALLOW: {
    text: "text-allow",
    bg: "bg-allow/10",
    dot: "bg-allow",
    ring: "ring-allow/30",
    shadow: "shadow-glow-allow",
    label: "Released",
  },
  FLAG: {
    text: "text-flag",
    bg: "bg-flag/10",
    dot: "bg-flag",
    ring: "ring-flag/30",
    shadow: "shadow-glow-flag",
    label: "Released · flagged for oversight",
  },
  BLOCK: {
    text: "text-block",
    bg: "bg-block/10",
    dot: "bg-block",
    ring: "ring-block/30",
    shadow: "shadow-glow-block",
    label: "Withheld",
  },
};

export function pct(n: number) {
  return `${Math.round(Math.max(0, Math.min(1, n)) * 100)}%`;
}

export function Badge({ decision, size = "sm" }: { decision: Decision; size?: "sm" | "md" }) {
  const meta = DECISION_META[decision];
  const pad = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-medium tracking-wide ${pad} ${meta.bg} ${meta.text} ring-1 ${meta.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {decision}
    </span>
  );
}

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[10.5px] uppercase tracking-[0.22em] text-fog ${className}`}>
      {children}
    </p>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-rim bg-panel/90 shadow-panel backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

export function Meter({ value, risk = true }: { value: number; risk?: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  const color = risk
    ? v >= 0.6
      ? "bg-block"
      : v >= 0.35
        ? "bg-flag"
        : "bg-allow"
    : v >= 0.6
      ? "bg-allow"
      : v >= 0.35
        ? "bg-flag"
        : "bg-block";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-500 ease-out`}
        style={{ width: pct(v) }}
      />
    </div>
  );
}

export function MeterRow({
  label,
  hint,
  value,
  risk = true,
}: {
  label: string;
  hint?: string;
  value: number;
  risk?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[13px] text-mist">{label}</span>
          {hint && <span className="ml-2 font-mono text-[10.5px] text-fog">{hint}</span>}
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-fog">{pct(value)}</span>
      </div>
      <Meter value={value} risk={risk} />
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded-md border border-rim bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-fog transition hover:border-rim2 hover:text-white"
      aria-live="polite"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function CodeBlock({
  code,
  language,
  filename,
}: {
  code: string;
  language: string;
  filename?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-rim bg-void">
      <div className="flex items-center justify-between border-b border-rim px-4 py-2">
        <div className="flex items-center gap-3 font-mono text-[11px] text-fog">
          <span className="text-mist">{filename ?? language}</span>
          {filename && <span className="text-fog/60">{language}</span>}
        </div>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-6 text-mist">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] text-fog">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulseDot" />
        <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulseDot [animation-delay:200ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulseDot [animation-delay:400ms]" />
      </span>
      {label}
    </span>
  );
}
