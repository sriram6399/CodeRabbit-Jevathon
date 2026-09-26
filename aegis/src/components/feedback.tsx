"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeedbackRow } from "@/platform/store";
import { Eyebrow, Panel, Spinner } from "./ui";

type CollectiveEvent = {
  id: string;
  name: string;
  startAt: string;
  city: string | null;
  url: string;
  hosts: string[];
};

type Board = {
  calendarUrl: string;
  calendarName: string;
  events: CollectiveEvent[];
  note: string | null;
  recent: FeedbackRow[];
  photon: boolean;
};

function when(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Feedback() {
  const [board, setBoard] = useState<Board | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const [picked, setPicked] = useState(false);
  const [rating, setRating] = useState(4);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/community", { cache: "no-store" });
    if (!response.ok) return;
    setBoard((await response.json()) as Board);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!board || picked || eventId || board.events.length === 0) return;
    const jev = board.events.find((event) => event.url.endsWith("/aic-jev") || /jevathon/i.test(event.name));
    setEventId((jev ?? board.events[0]).id);
  }, [board, picked, eventId]);

  function choose(id: string) {
    setPicked(true);
    setEventId(id);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, eventId, rating, message }),
      });
      const data = (await response.json()) as FeedbackRow & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not file that note.");
      setNotice(data.note ?? `Filed as ${data.status}.`);
      setMessage("");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not file that note.");
    } finally {
      setBusy(false);
    }
  }

  if (!board) {
    return (
      <Panel className="p-8">
        <Spinner label="loading the calendar" />
      </Panel>
    );
  }

  const selected = board.events.find((event) => event.id === eventId) ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Eyebrow>The AI Collective</Eyebrow>
        <h2 className="mt-2 font-serif text-[40px] leading-none text-white">Leave a note for the room.</h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-mist">
          Upcoming gatherings come from the public{" "}
          <a className="text-signal" href={board.calendarUrl} target="_blank" rel="noreferrer">
            {board.calendarName} calendar
          </a>
          . Pick one, say what the gate got right or wrong, and Aegis keeps the note. A copy goes to the operator
          through Photon when that key is set.
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
          {board.photon ? "Photon copy is live" : "Photon key is not set · the note is stored on this machine"}
          {board.note ? ` · ${board.note}` : ""}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel className="p-5">
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <label className="block">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fog">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ram Guttikonda"
                className="mt-2 w-full rounded-lg border border-rim bg-void px-3 py-2.5 text-[14px] text-white placeholder:text-fog/60 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fog">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="mt-2 w-full rounded-lg border border-rim bg-void px-3 py-2.5 text-[14px] text-white placeholder:text-fog/60 focus:outline-none"
              />
            </label>
            <div>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fog">Rating</span>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`h-9 w-9 rounded-lg border text-[13px] ${
                      rating === value
                        ? "border-white bg-white text-void"
                        : "border-rim bg-void text-mist hover:border-rim2"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fog">
                {selected ? selected.name : "Note"}
              </span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                placeholder="What should the next chapter gathering know about this gate?"
                className="mt-2 w-full resize-y rounded-lg border border-rim bg-void px-3 py-2.5 text-[14px] leading-6 text-white placeholder:text-fog/60 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-void transition hover:bg-mist disabled:opacity-40"
            >
              {busy ? "Filing…" : "File this note"}
            </button>
            {notice && <p className="text-[13.5px] leading-6 text-mist">{notice}</p>}
          </form>
        </Panel>

        <div className="space-y-3">
          <Eyebrow>Upcoming</Eyebrow>
          {board.events.length === 0 && (
            <Panel className="p-5">
              <p className="text-[13.5px] leading-6 text-mist">
                No events are loaded. A note can still be filed without one.
              </p>
            </Panel>
          )}
          {board.events.map((event) => {
            const active = event.id === eventId;
            return (
              <div
                key={event.id}
                className={`rounded-2xl border p-4 transition ${
                  active ? "border-signal/50 bg-signal/[0.06]" : "border-rim bg-panel/90"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[15px] font-medium text-white">{event.name}</h3>
                  <button
                    type="button"
                    onClick={() => choose(event.id)}
                    className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-fog hover:text-white"
                  >
                    {active ? "selected" : "select"}
                  </button>
                </div>
                <p className="mt-1 font-mono text-[11.5px] text-mist">
                  {when(event.startAt)}
                  {event.city ? ` · ${event.city}` : ""}
                </p>
                {event.hosts.length > 0 && (
                  <p className="mt-2 text-[12.5px] leading-5 text-fog">{event.hosts.join(", ")}</p>
                )}
                <a href={event.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12.5px] text-signal">
                  Open on Luma
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {board.recent.length > 0 && (
        <Panel className="p-5">
          <Eyebrow>Filed here</Eyebrow>
          <ul className="mt-3 space-y-3">
            {board.recent.map((row) => (
              <li key={row.id} className="border-l-2 border-rim pl-3">
                <p className="text-[13.5px] leading-6 text-mist">
                  <span className="text-white">{row.name}</span>
                  {" · "}
                  {row.rating}/5
                  {row.eventName ? ` · ${row.eventName}` : ""}
                  {" · "}
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fog">{row.status}</span>
                </p>
                <p className="text-[13px] leading-6 text-fog">{row.message}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
