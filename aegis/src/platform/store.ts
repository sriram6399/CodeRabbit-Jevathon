import { randomUUID } from "crypto";
import { getDb } from "@/ledger/db";

export type ReviewRow = {
  id: string;
  createdAt: string;
  status: string;
  summary: string;
  output: string | null;
};

export type SubscriptionRow = {
  id: string;
  createdAt: string;
  planId: string;
  email: string;
  status: string;
  checkoutUrl: string | null;
  note: string | null;
};

export type HandoffRow = {
  id: string;
  createdAt: string;
  task: string;
  status: string;
  prompt: string;
  sessionUrl: string | null;
  note: string | null;
};

export function saveReview(input: Omit<ReviewRow, "id" | "createdAt">) {
  const row: ReviewRow = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  getDb()
    .prepare(
      `INSERT INTO reviews (id, created_at, status, summary, output)
       VALUES (@id, @createdAt, @status, @summary, @output)`,
    )
    .run(row);
  return row;
}

export function latestReview(): ReviewRow | null {
  const row = getDb()
    .prepare<[], { id: string; created_at: string; status: string; summary: string; output: string | null }>(
      "SELECT id, created_at, status, summary, output FROM reviews ORDER BY created_at DESC LIMIT 1",
    )
    .get();
  if (!row) return null;
  return { id: row.id, createdAt: row.created_at, status: row.status, summary: row.summary, output: row.output };
}

export function saveSubscription(input: Omit<SubscriptionRow, "id" | "createdAt">) {
  const row: SubscriptionRow = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  getDb()
    .prepare(
      `INSERT INTO subscriptions (id, created_at, plan_id, email, status, checkout_url, note)
       VALUES (@id, @createdAt, @planId, @email, @status, @checkoutUrl, @note)`,
    )
    .run(row);
  return row;
}

export function latestSubscriptions(limit = 6): SubscriptionRow[] {
  const rows = getDb()
    .prepare<[number], {
      id: string;
      created_at: string;
      plan_id: string;
      email: string;
      status: string;
      checkout_url: string | null;
      note: string | null;
    }>("SELECT id, created_at, plan_id, email, status, checkout_url, note FROM subscriptions ORDER BY created_at DESC LIMIT ?")
    .all(limit);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    planId: row.plan_id,
    email: row.email,
    status: row.status,
    checkoutUrl: row.checkout_url,
    note: row.note,
  }));
}

export function saveHandoff(input: Omit<HandoffRow, "id" | "createdAt">) {
  const row: HandoffRow = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  getDb()
    .prepare(
      `INSERT INTO handoffs (id, created_at, task, status, prompt, session_url, note)
       VALUES (@id, @createdAt, @task, @status, @prompt, @sessionUrl, @note)`,
    )
    .run(row);
  return row;
}

export function latestHandoff(): HandoffRow | null {
  const row = getDb()
    .prepare<
      [],
      {
        id: string;
        created_at: string;
        task: string;
        status: string;
        prompt: string;
        session_url: string | null;
        note: string | null;
      }
    >("SELECT id, created_at, task, status, prompt, session_url, note FROM handoffs ORDER BY created_at DESC LIMIT 1")
    .get();
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    task: row.task,
    status: row.status,
    prompt: row.prompt,
    sessionUrl: row.session_url,
    note: row.note,
  };
}

export type FeedbackRow = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  eventId: string | null;
  eventName: string | null;
  eventUrl: string | null;
  rating: number;
  message: string;
  status: string;
  note: string | null;
};

export function saveFeedback(input: Omit<FeedbackRow, "id" | "createdAt">) {
  const row: FeedbackRow = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  getDb()
    .prepare(
      `INSERT INTO feedback (
         id, created_at, name, email, event_id, event_name, event_url, rating, message, status, note
       ) VALUES (
         @id, @createdAt, @name, @email, @eventId, @eventName, @eventUrl, @rating, @message, @status, @note
       )`,
    )
    .run(row);
  return row;
}

export function latestFeedback(limit = 8): FeedbackRow[] {
  const rows = getDb()
    .prepare<
      [number],
      {
        id: string;
        created_at: string;
        name: string;
        email: string;
        event_id: string | null;
        event_name: string | null;
        event_url: string | null;
        rating: number;
        message: string;
        status: string;
        note: string | null;
      }
    >(
      `SELECT id, created_at, name, email, event_id, event_name, event_url, rating, message, status, note
       FROM feedback ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    email: row.email,
    eventId: row.event_id,
    eventName: row.event_name,
    eventUrl: row.event_url,
    rating: row.rating,
    message: row.message,
    status: row.status,
    note: row.note,
  }));
}

export function recordUsage(input: {
  runId: string | null;
  agent: string;
  provider: string;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
  note: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO agent_usage (
         id, created_at, run_id, agent, provider, model, prompt_tokens, completion_tokens, note
       ) VALUES (
         @id, @createdAt, @runId, @agent, @provider, @model, @promptTokens, @completionTokens, @note
       )`,
    )
    .run({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    });
}

export function usageTotals(agent = "loan-approval") {
  const measured = getDb()
    .prepare<[string], { runs: number; prompt: number; completion: number }>(
      `SELECT COUNT(*) AS runs,
              COALESCE(SUM(prompt_tokens), 0) AS prompt,
              COALESCE(SUM(completion_tokens), 0) AS completion
       FROM agent_usage
       WHERE agent = ? AND provider = 'gmi'`,
    )
    .get(agent) ?? { runs: 0, prompt: 0, completion: 0 };

  const estimated = getDb()
    .prepare<[string], { runs: number; prompt: number; completion: number }>(
      `SELECT COUNT(*) AS runs,
              COALESCE(SUM(prompt_tokens), 0) AS prompt,
              COALESCE(SUM(completion_tokens), 0) AS completion
       FROM agent_usage
       WHERE agent = ? AND provider = 'estimate'`,
    )
    .get(agent) ?? { runs: 0, prompt: 0, completion: 0 };

  const turns = getDb()
    .prepare<[string], { runs: number; chars: number }>(
      `SELECT COUNT(*) AS runs,
              COALESCE(SUM(
                LENGTH(COALESCE(input, '')) +
                LENGTH(COALESCE(reasoning, '')) +
                LENGTH(COALESCE(output, ''))
              ), 0) AS chars
       FROM runs WHERE agent = ?`,
    )
    .get(agent) ?? { runs: 0, chars: 0 };

  return { measured, estimated, turns };
}
