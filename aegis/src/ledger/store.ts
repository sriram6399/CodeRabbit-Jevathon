import { createHash, randomUUID } from "crypto";
import { getDb } from "./db";
import type {
  AlertReceipt,
  BrowserEvidence,
  CustomerBrief,
  Decision,
  GateResult,
  GovernedResult,
  InputAnswers,
  OutputAnswers,
} from "@/sdk/types";

export type LedgerEvent = GovernedResult & {
  createdAt: string;
};

export type LedgerQuery = {
  limit?: number;
  decision?: Decision;
  agent?: string;
};

export type LedgerStats = {
  total: number;
  byDecision: Record<Decision, number>;
  released: number;
  withheld: number;
  avgLatencyMs: number;
  agents: Array<{ agent: string; total: number; withheld: number }>;
  lastJudge: string | null;
  lastMocked: boolean | null;
};

type Row = {
  id: string;
  created_at: string;
  agent: string;
  channel: string;
  decision: Decision;
  released: number;
  blocked_before_agent: number;
  reason: string;
  input: string;
  reasoning: string | null;
  output: string | null;
  input_gate: string;
  output_gate: string | null;
  browser: string | null;
  customer: string | null;
  alert: string | null;
  prev_hash: string;
  hash: string;
};

function digest(payload: unknown, prevHash: string) {
  return createHash("sha256")
    .update(prevHash)
    .update("\n")
    .update(JSON.stringify(payload))
    .digest("hex");
}

/** The exact body that is hashed; must be stable across write and verify. */
function hashBody(event: Omit<LedgerEvent, "log">) {
  return {
    agent: event.agent,
    channel: event.channel,
    input: event.input,
    reasoning: event.reasoning,
    output: event.output,
    decision: event.decision,
    reason: event.reason,
    released: event.released,
    blockedBeforeAgent: event.blockedBeforeAgent,
    inputGate: event.inputGate,
    outputGate: event.outputGate,
    ...(event.browser ? { browser: event.browser } : {}),
    ...(event.customer ? { customer: event.customer } : {}),
    ...(event.alert ? { alert: event.alert } : {}),
    id: event.id,
    createdAt: event.createdAt,
  };
}

function rowToEvent(row: Row): LedgerEvent {
  return {
    id: row.id,
    createdAt: row.created_at,
    agent: row.agent,
    channel: row.channel as LedgerEvent["channel"],
    input: row.input,
    reasoning: row.reasoning,
    output: row.output,
    decision: row.decision,
    reason: row.reason,
    released: row.released === 1,
    blockedBeforeAgent: row.blocked_before_agent === 1,
    inputGate: JSON.parse(row.input_gate) as GateResult<InputAnswers>,
    outputGate: row.output_gate ? (JSON.parse(row.output_gate) as GateResult<OutputAnswers>) : null,
    browser: row.browser ? (JSON.parse(row.browser) as BrowserEvidence) : null,
    customer: row.customer ? (JSON.parse(row.customer) as CustomerBrief) : null,
    alert: row.alert ? (JSON.parse(row.alert) as AlertReceipt) : null,
    log: { prevHash: row.prev_hash, hash: row.hash },
  };
}

export function lastHash(): string {
  const row = getDb()
    .prepare<[], { hash: string }>("SELECT hash FROM runs ORDER BY seq DESC LIMIT 1")
    .get();
  return row?.hash ?? "genesis";
}

/**
 * Append a governed turn. Reading the previous hash and inserting happen
 * inside one transaction so concurrent turns cannot fork the chain.
 */
export async function appendEvent(
  result: Omit<GovernedResult, "id" | "log">,
): Promise<LedgerEvent> {
  const db = getDb();

  const insert = db.prepare(`
    INSERT INTO runs (
      id, created_at, agent, channel, decision, released, blocked_before_agent, reason,
      input, reasoning, output,       input_gate, output_gate, browser, customer, alert,
      judge_model, mocked, latency_ms, input_tokens, output_tokens,
      use_class, primary_article, compliance_score, prev_hash, hash
    ) VALUES (
      @id, @created_at, @agent, @channel, @decision, @released, @blocked_before_agent, @reason,
      @input, @reasoning, @output,       @input_gate, @output_gate, @browser, @customer, @alert,
      @judge_model, @mocked, @latency_ms, @input_tokens, @output_tokens,
      @use_class, @primary_article, @compliance_score, @prev_hash, @hash
    )
  `);

  const write = db.transaction((): LedgerEvent => {
    const prevHash = lastHash();
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const withMeta: Omit<LedgerEvent, "log"> = { ...result, id, createdAt };
    const hash = digest(hashBody(withMeta), prevHash);

    const usageIn =
      (result.inputGate.usage?.input_tokens ?? 0) + (result.outputGate?.usage?.input_tokens ?? 0);
    const usageOut =
      (result.inputGate.usage?.output_tokens ?? 0) + (result.outputGate?.usage?.output_tokens ?? 0);

    insert.run({
      id,
      created_at: createdAt,
      agent: result.agent,
      channel: result.channel,
      decision: result.decision,
      released: result.released ? 1 : 0,
      blocked_before_agent: result.blockedBeforeAgent ? 1 : 0,
      reason: result.reason,
      input: result.input,
      reasoning: result.reasoning,
      output: result.output,
      input_gate: JSON.stringify(result.inputGate),
      output_gate: result.outputGate ? JSON.stringify(result.outputGate) : null,
      browser: result.browser ? JSON.stringify(result.browser) : null,
      customer: result.customer ? JSON.stringify(result.customer) : null,
      alert: result.alert ? JSON.stringify(result.alert) : null,
      judge_model: result.outputGate?.model ?? result.inputGate.model,
      mocked: result.inputGate.mocked || result.outputGate?.mocked ? 1 : 0,
      latency_ms: result.inputGate.latencyMs + (result.outputGate?.latencyMs ?? 0),
      input_tokens: usageIn || null,
      output_tokens: usageOut || null,
      use_class: result.inputGate.answers.use_class.choice,
      primary_article: result.outputGate?.answers.primary_article.choice ?? null,
      compliance_score: result.outputGate?.answers.compliance.score ?? null,
      prev_hash: prevHash,
      hash,
    });

    return { ...withMeta, log: { prevHash, hash } };
  });

  return write();
}

export async function listEvents(query: LedgerQuery = {}): Promise<LedgerEvent[]> {
  const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
  const where: string[] = [];
  const params: Record<string, unknown> = { limit };
  if (query.decision) {
    where.push("decision = @decision");
    params.decision = query.decision;
  }
  if (query.agent) {
    where.push("agent = @agent");
    params.agent = query.agent;
  }
  const sql = `
    SELECT id, created_at, agent, channel, decision, released, blocked_before_agent, reason,
           input, reasoning, output, input_gate, output_gate, browser, customer, alert, prev_hash, hash
    FROM runs
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY seq DESC
    LIMIT @limit
  `;
  const rows = getDb().prepare<Record<string, unknown>, Row>(sql).all(params);
  return rows.map(rowToEvent);
}

export async function getEvent(id: string): Promise<LedgerEvent | null> {
  const row = getDb()
    .prepare<[string], Row>(
      `SELECT id, created_at, agent, channel, decision, released, blocked_before_agent, reason,
              input, reasoning, output, input_gate, output_gate, browser, customer, alert, prev_hash, hash
       FROM runs WHERE id = ?`,
    )
    .get(id);
  return row ? rowToEvent(row) : null;
}

/** Walk the whole chain oldest to newest and recompute every hash. */
export async function verifyChain(): Promise<{ intact: boolean; checked: number; brokenAt: string | null }> {
  const rows = getDb()
    .prepare<[], Row>(
      `SELECT id, created_at, agent, channel, decision, released, blocked_before_agent, reason,
              input, reasoning, output, input_gate, output_gate, browser, customer, alert, prev_hash, hash
       FROM runs ORDER BY seq ASC`,
    )
    .all();

  let prev = "genesis";
  for (const row of rows) {
    const event = rowToEvent(row);
    if (event.log.prevHash !== prev) {
      return { intact: false, checked: rows.length, brokenAt: event.id };
    }
    const { log, ...rest } = event;
    if (digest(hashBody(rest), prev) !== log.hash) {
      return { intact: false, checked: rows.length, brokenAt: event.id };
    }
    prev = log.hash;
  }
  return { intact: true, checked: rows.length, brokenAt: null };
}

export async function stats(): Promise<LedgerStats> {
  const db = getDb();

  const totals = db
    .prepare<[], { total: number; released: number; avg: number | null }>(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(released), 0) AS released,
              AVG(latency_ms) AS avg
       FROM runs`,
    )
    .get() ?? { total: 0, released: 0, avg: null };

  const byDecisionRows = db
    .prepare<[], { decision: Decision; n: number }>(
      "SELECT decision, COUNT(*) AS n FROM runs GROUP BY decision",
    )
    .all();
  const byDecision: Record<Decision, number> = { ALLOW: 0, FLAG: 0, BLOCK: 0 };
  for (const r of byDecisionRows) byDecision[r.decision] = r.n;

  const agents = db
    .prepare<[], { agent: string; total: number; withheld: number }>(
      `SELECT agent, COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN decision = 'BLOCK' THEN 1 ELSE 0 END), 0) AS withheld
       FROM runs GROUP BY agent ORDER BY total DESC`,
    )
    .all();

  const last = db
    .prepare<[], { judge_model: string; mocked: number }>(
      "SELECT judge_model, mocked FROM runs ORDER BY seq DESC LIMIT 1",
    )
    .get();

  return {
    total: totals.total,
    byDecision,
    released: totals.released,
    withheld: byDecision.BLOCK,
    avgLatencyMs: Math.round(totals.avg ?? 0),
    agents,
    lastJudge: last?.judge_model ?? null,
    lastMocked: last ? last.mocked === 1 : null,
  };
}
