"use client";

import { useEffect, useRef, useState } from "react";
import { PRESETS } from "@/agents/presets";
import type { GovernedResult } from "@/sdk/types";
import { Badge, Eyebrow, Panel, Spinner } from "./ui";

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "agent"; status: "pending" }
  | { id: string; role: "agent"; status: "done"; event: GovernedResult }
  | { id: string; role: "agent"; status: "error"; error: string };

let counter = 0;
function nextId() {
  counter += 1;
  return `m${counter}`;
}

export function Playground({
  onEvent,
  selectedId,
  onSelect,
}: {
  onEvent: (event: GovernedResult) => void;
  selectedId: string | null;
  onSelect: (event: GovernedResult) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;

    const userId = nextId();
    const agentId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", text: prompt },
      { id: agentId, role: "agent", status: "pending" },
    ]);
    setDraft("");
    setBusy(true);

    try {
      const response = await fetch("/api/govern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: prompt }),
      });
      const data = (await response.json()) as GovernedResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The governance layer returned an error.");
      setMessages((prev) =>
        prev.map((m) => (m.id === agentId ? { id: agentId, role: "agent", status: "done", event: data } : m)),
      );
      onEvent(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed.";
      setMessages((prev) =>
        prev.map((m) => (m.id === agentId ? { id: agentId, role: "agent", status: "error", error: message } : m)),
      );
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  }

  return (
    <Panel className="flex h-[calc(100vh-11rem)] min-h-[560px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-rim px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal/15 font-mono text-[11px] font-medium text-signal">
            LA
          </div>
          <div>
            <div className="text-[13.5px] font-medium text-white">Loan Approval agent</div>
            <div className="font-mono text-[10.5px] text-fog">
              agent under test · wrapped by <span className="text-signal">AEGIS</span> · eu-ai-act · gated
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="rounded-md px-2 py-1 font-mono text-[11px] text-fog transition hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center">
            <div className="mb-6 flex gap-3">
              <Avatar />
              <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-rim bg-white/[0.02] px-4 py-3 text-[13.5px] leading-6 text-mist">
                Hello. Name a customer such as Ram Guttikonda. I pull their file through LlamaIndex, calculate a
                FICO-shaped score, and <span className="text-signal">AEGIS</span> emails the decision through Photon.
              </div>
            </div>
            <Eyebrow className="mb-3">Try a scenario</Eyebrow>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => void send(preset.prompt)}
                  className="group rounded-xl border border-rim bg-white/[0.02] p-3.5 text-left transition hover:border-rim2 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-mist group-hover:text-white">{preset.label}</span>
                    <Badge decision={preset.expect} />
                  </div>
                  <p className="mt-1.5 text-[12px] leading-5 text-fog">{preset.blurb}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} selected={m.role === "agent" && m.status === "done" && m.event.id === selectedId} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-rim p-4">
        {messages.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={busy}
                onClick={() => void send(preset.prompt)}
                className="rounded-full border border-rim px-2.5 py-1 font-mono text-[10.5px] text-fog transition hover:border-rim2 hover:text-white disabled:opacity-40"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-rim bg-void px-3 py-2 focus-within:border-signal/50">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Describe an applicant, or ask the agent anything…"
            className="flex-1 bg-transparent py-1 text-[13.5px] leading-6 text-white placeholder:text-fog/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void send(draft)}
            disabled={busy || !draft.trim()}
            className="mb-0.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-void transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <p className="mt-2 font-mono text-[10.5px] text-fog/70">
          Enter to send · Shift+Enter for a new line · every reply is verified before release
        </p>
      </div>
    </Panel>
  );
}

function Bubble({
  message,
  selected,
  onSelect,
}: {
  message: ChatMessage;
  selected: boolean;
  onSelect: (event: GovernedResult) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-rise">
        <div className="max-w-[82%] rounded-2xl rounded-br-md bg-white/[0.07] px-4 py-2.5 text-[13.5px] leading-6 text-white">
          {message.text}
        </div>
      </div>
    );
  }

  if (message.status === "pending") {
    return (
      <div className="flex gap-3 animate-rise">
        <Avatar />
        <div className="scan rounded-2xl rounded-bl-md border border-signal/25 bg-white/[0.02] px-4 py-3">
          <Spinner label="browserbase · screening input · judging output" />
        </div>
      </div>
    );
  }

  if (message.status === "error") {
    return (
      <div className="flex gap-3 animate-rise">
        <Avatar />
        <div className="rounded-2xl rounded-bl-md border border-block/30 bg-block/5 px-4 py-3 text-[13px] leading-6 text-block">
          {message.error}
        </div>
      </div>
    );
  }

  const { event } = message;
  const body = event.released
    ? event.output ?? ""
    : "A reviewer is looking at this request. The agent's response was not released.";

  return (
    <div className="flex gap-3 animate-rise">
      <Avatar />
      <button
        type="button"
        onClick={() => onSelect(event)}
        className={`max-w-[82%] rounded-2xl rounded-bl-md border px-4 py-3 text-left transition ${
          selected ? "border-signal/50 bg-signal/[0.06]" : "border-rim bg-white/[0.02] hover:border-rim2"
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <Badge decision={event.decision} />
          <span className="font-mono text-[10.5px] text-fog">
            {event.browser?.status === "live" ? "browserbase · " : ""}
            {event.blockedBeforeAgent ? "stopped before the agent ran" : event.released ? "released" : "withheld"}
            {" · "}
            {event.inputGate.latencyMs + (event.outputGate?.latencyMs ?? 0)} ms
          </span>
        </div>
        <p className={`text-[13.5px] leading-6 ${event.released ? "text-mist" : "text-fog italic"}`}>{body}</p>
        <p className="mt-2 font-mono text-[10.5px] text-fog/70">
          {selected ? "Shown in inspector" : "Click to inspect reasoning and evidence"}
        </p>
      </button>
    </div>
  );
}

function Avatar() {
  return (
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-signal/15 font-mono text-[10px] font-medium text-signal">
      LA
    </div>
  );
}
