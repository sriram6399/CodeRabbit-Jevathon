# Aegis

Runtime governance for AI agents. Built for **JEVATHON** (TypeSafe × The AI Collective).

Aegis wraps any agent turn as **input → reasoning → output**, judges the triple against the **EU AI Act** with Jev, gates the response (ALLOW / FLAG / BLOCK), and writes every decision to a **SHA-256 hash-chained ledger**.

This produces runtime controls and evidence. It is not a legal certification.

Another model continuing this code should read [AGENTS.md](AGENTS.md) first, then [CHANGELOG.md](CHANGELOG.md).

## Run

```bash
cd aegis
npm install
cp .env.example .env.local   # optional: TYPESAFE, Photon, Browserbase, CodeRabbit, Whop, Devin, GMI
# The AI Collective calendar needs no key.
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

Without `TYPESAFE_API_KEY` Aegis uses a deterministic mock judge so the demo still runs end to end.

## Views

- **Playground** — chat with the loan agent under test. A named customer is retrieved with LlamaIndex from a local book centered on Ram Guttikonda. The agent calculates a FICO-shaped score from that file. A credit decision opens a Browserbase cloud browser, reads the public prime-rate page, and folds that excerpt into the reasoning. Aegis judges the turn, then Photon emails the decision to `guttikondasriram1234@gmail.com`, the customer's address, and any email in the query.
- **Ledger** — Article 12 record. Filter by decision, open any event, verify the chain.
- **Integrate** — code snippets for connecting a live agent: TypeScript SDK wrap, REST `/api/verify`, Python decorator, LangChain callback, Node middleware.
- **Platform** — CodeRabbit reviews the repo, Cognition opens a Devin session, and GMI prices the loan agent for a local Docker deploy. Each action stays available when its key or CLI is missing.
- **About** — what Aegis judges, and what the loan agent is for. `#about`
- **Feedback** — upcoming events from The AI Collective's public calendar, and a note filed against one of them. A Photon copy goes to the operator when that key is set. `#feedback`
- **Subscribe** — Wrap, Team, and Firm seats, paid through Whop. `#subscribe`

## Demo path

1. **Say hello** — ALLOW.
2. **Ram's file** — LlamaIndex retrieves Ram, the agent calculates his FICO, Photon records the alert.
3. **Standard applicant** — FLAG (Annex III credit), released with oversight.
3. **Social scoring** — BLOCK before the agent runs (Article 5).
4. **Demographic proxy** — agent produces a discriminatory denial; Aegis withholds it.
5. **Invented income** — Article 15; fabricated facts withheld.

## Docker

```bash
cd aegis
cp .env.example .env      # compose reads ./.env; every key is optional
docker compose up --build
```

The image is a two-stage build: `node:22-bookworm-slim` compiles Next and prunes dev dependencies, then a second stage runs `next start` as the unprivileged `node` user. The SQLite ledger lives in the `aegis-data` volume at `/app/data/aegis.db`. `GET /api/health` backs the container health check. Missing keys record `skipped` statuses; the container never needs a credential to start.

## API

`GET /api/health` — `{ ok, runs }`; 503 when SQLite is unreachable.

`POST /api/govern` — `{ input }` → runs the wrapped Loan Approval agent.

`POST /api/verify` — `{ agent, input, reasoning, output, mode? }` → governs a turn from any external agent.

`GET /api/ledger?limit=&decision=&agent=` — recent runs, chain verification, and aggregate stats.

`GET /api/ledger/:id` — one run.

`GET /api/community` — upcoming AI Collective events and filed notes.

`POST /api/community` — `{ name, email, eventId, rating, message }` files a note. `eventId` must be an id from the current calendar, or omitted.

## Storage

Every run is stored in a local SQLite database at `data/aegis.db` (override with `AEGIS_DB_PATH`). The `runs` table keeps the full triple, both Jev gate payloads as JSON, the LlamaIndex customer brief, the Photon alert receipt, judge model, latency, token usage, indexed columns for decision / agent / article, and the SHA-256 chain (`prev_hash`, `hash`). Optional fields enter the hash only when present, so older rows still verify. Appends run inside a transaction so concurrent turns cannot fork the chain. `GET /api/ledger` re-verifies the entire chain on every call.

The same database holds the `customers` table. LlamaIndex builds a local vector index over those files (no embedding API). FICO is `round(300 + quality × 550)` with weights 35% payment history, 30% utilization headroom, 15% history length, 10% new credit, and 10% credit mix.

Photon uses Spectrum's iMessage provider and treats each address as an Apple ID email handle. Without `PHOTON_PROJECT_ID` and `PHOTON_PROJECT_SECRET` the receipt is stored with status `skipped`.

## Platform

- **CodeRabbit** — `POST /api/review` runs `coderabbit review --agent --light` when the CLI is on PATH. Otherwise the review is stored as unavailable.
- **Whop** — Wrap ($29), Team ($99), and Firm ($249) monthly seats. `POST /api/billing` opens a hosted checkout when `WHOP_API_KEY` and `WHOP_ACCOUNT_ID` are set.
- **Cognition** — `POST /api/cognition` with `{ task: "wrap" | "review" }` creates a Devin session when `DEVIN_API_KEY` and `DEVIN_ORG_ID` are set, and stores the prompt either way.
- **GMI** — `docker compose up --build` runs the loan agent locally. With `GMI_API_KEY`, reasoning goes to `https://api.gmi-serving.com/v1` and token usage is recorded. Dedicated H100 ($2/hr) and reserved H200 ($2.50/hr) figures are GMI's published rates. Serverless dollar prices are left to the live model card.
- **The AI Collective** — `#feedback` lists events from `https://lu.ma/genai-collective` and files a note against one. No key. Photon delivers a copy to the operator when configured.

`GET /api/platform` returns the status of CodeRabbit, Whop, Cognition, GMI, and the AI Collective calendar link.

## Layout

- `src/sdk/wrap-agent.ts` — `wrapAgent`, the SDK entry point
- `src/sdk/core.ts` — `verifyTurn` and the shared gate logic
- `src/compliance/eu-ai-act.ts` — policy questions and thresholds (single reviewable file)
- `src/ledger/db.ts` — SQLite connection and schema
- `src/ledger/store.ts` — append / query / verify / stats over the chain
- `src/agents/loan-approval.ts` — the agent under test
- `src/content/snippets.ts` — integration snippets shown in the UI
