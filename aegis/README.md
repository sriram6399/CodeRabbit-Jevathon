# Aegis

Runtime governance for AI agents. Built for **JEVATHON** (TypeSafe × The AI Collective).

Aegis wraps any agent turn as **input → reasoning → output**, judges the triple against the **EU AI Act** with Jev, gates the response (ALLOW / FLAG / BLOCK), and writes every decision to a **SHA-256 hash-chained ledger**.

This produces runtime controls and evidence. It is not a legal certification.

Another model continuing this code should read [AGENTS.md](AGENTS.md) first, then [CHANGELOG.md](CHANGELOG.md).

## Docker

Docker Desktop (or another Engine with Compose v2) is the way to run the loan agent. From `aegis/`:

```bash
cd aegis
cp .env.example .env
docker compose up --build
```

On PowerShell:

```powershell
cd aegis
Copy-Item .env.example .env
docker compose up --build
```

Open [http://localhost:3001](http://localhost:3001). Compose publishes `3001` on the host. Stop `npm run dev` before starting the container; both bind that port.

`.env` is optional. Compose reads `./.env` and passes each key through. An empty value is recorded as `skipped`, `unavailable`, or `pending`, and the loan decision still completes. Without `TYPESAFE_API_KEY` the judge is the deterministic mock.

The service is `loan-agent`. The image is `aegis-loan-agent:latest`, the container name is `aegis-loan-agent`, and the Compose project name is `aegis`.

```bash
docker compose ps          # status and health
docker compose logs -f     # follow next start
docker compose restart     # ledger stays on the volume
docker compose down        # stop; the aegis-data volume remains
docker compose down -v     # stop and delete the ledger volume
```

`GET /api/health` returns `{ ok, runs }` and is the container health check. A 503 means SQLite could not be opened.

### What the image does

`Dockerfile` is a two-stage build on `node:22-bookworm-slim`.

1. **Build.** Install build tools so `better-sqlite3` can compile if no prebuilt binary matches, `npm ci`, then `npm run build`. Dev dependencies are pruned. TypeScript is installed back into the image because `next start` loads `next.config.ts`.
2. **Run.** Copy the build, `node_modules`, `public`, `next.config.ts`, and `tsconfig.json`. Listen on `0.0.0.0:3001` as the unprivileged `node` user.

The SQLite file is `/app/data/aegis.db` (`AEGIS_DB_PATH`). That directory is the named volume `aegis-data`, so `docker compose restart` keeps the hash chain. Secrets stay out of the image; `.dockerignore` excludes `.env` and `.env.*`.

The Platform control **Check local Docker** runs `docker version` and `docker compose config` in the process that is serving the UI. Use it from `npm run dev` on the host. The container image has no Docker CLI, so that same control reports Docker missing while you are browsing the container.

## Local dev

```bash
cd aegis
npm install
cp .env.example .env.local   # Next reads this file; Compose reads .env
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). `npm run build` is the same compile the image runs. It shares `.next` with the dev server, so stop `npm run dev` before building, then start it again after.

## Views

Hash routes on one page:

- **Playground** (`#playground`) — chat with the loan agent under test. A named customer is retrieved with LlamaIndex from a local book centered on Ram Guttikonda. The agent calculates a FICO-shaped score from that file. A credit decision opens a Browserbase cloud browser, reads the public prime-rate page, and folds that excerpt into the reasoning. Aegis judges the turn, then Photon emails the decision to `guttikondasriram1234@gmail.com`, the customer's address, and any email in the query.
- **Ledger** (`#ledger`) — Article 12 record. Filter by decision, open any event, verify the chain.
- **Integrate** (`#integrate`) — TypeScript SDK wrap, REST `/api/verify`, Python decorator, LangChain callback, Node middleware.
- **Platform** (`#platform`) — CodeRabbit reviews the repo, Cognition opens a Devin session, and GMI prices the loan agent for this Compose deploy. Each action stays available when its key or CLI is missing.
- **About** (`#about`) — what Aegis judges, and what the loan agent is for.
- **Feedback** (`#feedback`) — upcoming events from The AI Collective's public calendar, and a note filed against one of them. A Photon copy goes to the operator when that key is set.
- **Subscribe** (`#subscribe`) — Wrap, Team, and Firm seats, paid through Whop.

## Demo path

1. **Say hello** — ALLOW.
2. **Ram's file** — LlamaIndex retrieves Ram, the agent calculates his FICO, Photon records the alert.
3. **Standard applicant** — FLAG (Annex III credit), released with oversight.
4. **Social scoring** — BLOCK before the agent runs (Article 5).
5. **Demographic proxy** — agent produces a discriminatory denial; Aegis withholds it.
6. **Invented income** — Article 15; fabricated facts withheld.

## API

`GET /api/health` — `{ ok, runs }`; 503 when SQLite is unreachable.

`POST /api/govern` — `{ input }` → runs the wrapped Loan Approval agent.

`POST /api/verify` — `{ agent, input, reasoning, output, mode? }` → governs a turn from any external agent.

`GET /api/ledger?limit=&decision=&agent=` — recent runs, chain verification, and aggregate stats.

`GET /api/ledger/:id` — one run.

`GET /api/community` — upcoming AI Collective events and filed notes.

`POST /api/community` — `{ name, email, eventId, rating, message }` files a note. `eventId` must be an id from the current calendar, or omitted.

`GET /api/platform` — CodeRabbit, Whop, Cognition, GMI, and the AI Collective calendar link.

`POST /api/deploy` — host-side Docker check used by the Platform button.

## Storage

On the host dev server the database is `data/aegis.db` (override with `AEGIS_DB_PATH`). In the container that path is `/app/data/aegis.db` on the `aegis-data` volume.

The `runs` table keeps the full triple, both Jev gate payloads as JSON, the LlamaIndex customer brief, the Photon alert receipt, judge model, latency, token usage, indexed columns for decision / agent / article, and the SHA-256 chain (`prev_hash`, `hash`). Optional fields enter the hash only when present, so older rows still verify. Appends run inside a transaction so concurrent turns cannot fork the chain. `GET /api/ledger` re-verifies the entire chain on every call.

The same database holds the `customers` table. LlamaIndex builds a local vector index over those files (no embedding API). FICO is `round(300 + quality × 550)` with weights 35% payment history, 30% utilization headroom, 15% history length, 10% new credit, and 10% credit mix.

Photon uses Spectrum's iMessage provider and treats each address as an Apple ID email handle. Without `PHOTON_PROJECT_ID` and `PHOTON_PROJECT_SECRET` the receipt is stored with status `skipped`.

## Platform

- **CodeRabbit** — `POST /api/review` runs `coderabbit review --agent --light` when the CLI is on PATH. Otherwise the review is stored as unavailable.
- **Whop** — Wrap ($29), Team ($99), and Firm ($249) monthly seats. `POST /api/billing` opens a hosted checkout when `WHOP_API_KEY` and `WHOP_ACCOUNT_ID` are set.
- **Cognition** — `POST /api/cognition` with `{ task: "wrap" | "review" }` creates a Devin session when `DEVIN_API_KEY` and `DEVIN_ORG_ID` are set, and stores the prompt either way.
- **GMI** — reasoning goes to `https://api.gmi-serving.com/v1` when `GMI_API_KEY` is set, including inside the container. Dedicated H100 ($2/hr) and reserved H200 ($2.50/hr) figures are GMI's published rates. Serverless dollar prices are left to the live model card. The local deploy is the Compose service above.
- **The AI Collective** — `#feedback` lists events from `https://lu.ma/genai-collective` and files a note against one. No key. Photon delivers a copy to the operator when configured.

## Layout

- `Dockerfile`, `docker-compose.yml`, `.dockerignore` — container build, the `loan-agent` service, and the `aegis-data` volume
- `src/sdk/wrap-agent.ts` — `wrapAgent`, the SDK entry point
- `src/sdk/core.ts` — `verifyTurn` and the shared gate logic
- `src/compliance/eu-ai-act.ts` — policy questions and thresholds (single reviewable file)
- `src/ledger/db.ts` — SQLite connection and schema
- `src/ledger/store.ts` — append / query / verify / stats over the chain
- `src/agents/loan-approval.ts` — the agent under test
- `src/content/snippets.ts` — integration snippets shown in the UI
