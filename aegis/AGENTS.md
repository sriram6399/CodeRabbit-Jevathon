# Aegis — guide for the next model

Read this file, then `CHANGELOG.md`, then `README.md`, before changing code. The product lives in this `aegis/` folder. The Next.js app at the repository root is an older reference called Verdict. Do not extend it.

Aegis wraps an agent turn as **input → required reasoning → output**, judges that triple against the EU AI Act with Jev, and appends the decision to a SHA-256 hash-chained SQLite ledger. Decisions are `ALLOW`, `FLAG`, or `BLOCK`. `BLOCK` withholds the output from the caller and still stores the raw output. This is runtime evidence, not a legal certification.

Dev server: `npm run dev` in `aegis/`, http://localhost:3001. Views are hash routes on one page, not separate Next routes: `#playground` `#ledger` `#integrate` `#platform` `#feedback` `#about` `#subscribe`.

## Do not break

- **Hash body.** `hashBody` in `src/ledger/store.ts` is the exact payload that is hashed. Optional objects (`browser`, `customer`, `alert`) are included only when non-null. A new optional field must follow that pattern. Putting it on every row breaks verification of older rows. `GET /api/ledger` re-checks the whole chain.
- **Migrations.** `migrate()` in `src/ledger/db.ts` runs on every `getDb()`, not only on first open. The connection is cached on `globalThis.__aegisDb` so Next hot reload does not reopen SQLite. A migration that lives only inside `open()` will never run on a warm process.
- **Missing credentials must not throw.** Browserbase, Photon, CodeRabbit, Whop, Devin, GMI, Docker, and the AI Collective calendar all degrade to a stored status (`skipped`, `unavailable`, `pending`, `queued`, or `stored`). The loan decision still completes. A failed calendar read still accepts a note with no event.
- **Credit decisions and Browserbase.** Greetings and incomplete prompts do not open a browser. A credit decision must return a browser object. `gatherLendingReference` never throws; without keys its status is `skipped`.
- **Customer file wins.** When LlamaIndex matches a customer, the calculated FICO and file income replace numbers typed in the prompt. The reasoning says so.
- **Deterministic reasoner.** The fallback trace in `src/sdk/wrap-agent.ts` must not contain the word `neighborhood`. The mock judge treats that word, in the wrong place, as a demographic proxy and false-blocks a clean applicant.
- **Alerts happen after the decision.** `judgeTurn` sends the Photon alert once `ALLOW` / `FLAG` / `BLOCK` is known. Early blocks in `wrapAgent` send their own alert. Recipients are always `guttikondasriram1234@gmail.com`, plus the customer email, plus any email in the query.
- **Subscribe does not lock the playground.** A missing Whop key stores a pending seat. The demo still runs.
- **Reasoner order.** GMI when `GMI_API_KEY` is set, then OpenAI when `OPENAI_API_KEY` is set, then the deterministic trace. Record token use through `recordTurnUsage`. A usage-row failure must not fail the governed turn.

## Where to change things

| Task | Start here |
| --- | --- |
| Wrap another agent | `wrapAgent` in `src/sdk/wrap-agent.ts`. External agents already use `POST /api/verify`. |
| Change EU AI Act policy | `src/compliance/eu-ai-act.ts` only. Thresholds and question packs live there. |
| Add a field to a ledger row | Column in `migrate()`, include it in `hashBody` only when non-null, then SELECT / INSERT / `rowToEvent`. |
| Add a sponsor tool | New module under `src/platform/` or a sibling folder. Expose status from `GET /api/platform`. The button stays on screen when the key is absent. |
| Customer book or FICO | `src/customers/book.ts`, `fico.ts`, `index.ts`. Retrieval is a local 64-dim hash embedding. Do not call OpenAI or Hugging Face for the index. Full name beats a unique first name, which beats the top vector hit, so Ram does not collapse into Rama or Ramesh. |
| Loan agent behavior | `src/agents/loan-approval.ts` and presets in `src/agents/presets.ts`. |
| UI | `src/app/page.tsx` switches hash views. Components are `src/components/`. Inspector cards read fields already stored on the run. |

## Integrations

Each one is optional. Env names are in `.env.example`.

- **Jev** — `POST https://api.typesafe.ai/v1/systemone`, model `jev-latest`. No key means the mock judge.
- **LlamaIndex** — local index over the SQLite `customers` table. FICO is `round(300 + quality × 550)` with weights 35 / 30 / 15 / 10 / 10.
- **Browserbase** — cloud browser reads the public prime-rate page on credit decisions only. A cloud browser cannot reach localhost.
- **Photon** — Spectrum iMessage to an Apple ID email. Not SMTP. No keys means status `skipped` and the body is still stored.
- **CodeRabbit** — `coderabbit review --agent --light` when the CLI is on PATH. Otherwise status `unavailable`.
- **Whop** — Wrap $29, Team $99, Firm $249 per month. Checkout is `POST /api/billing`. Pages: `#subscribe`, `#about`.
- **Cognition** — Devin session via `POST https://api.devin.ai/v3/organizations/{org}/sessions`. Tasks are `wrap` and `review`.
- **GMI** — OpenAI-compatible chat at `https://api.gmi-serving.com/v1`. Local deploy is `docker compose up --build`. Dedicated rates shown in the UI are GMI's published H100 $2/hr and reserved H200 $2.50/hr. Do not invent a serverless per-token price.
- **The AI Collective** — public Luma calendar `https://lu.ma/genai-collective`, read with `GET https://api.lu.ma/calendar/get-items` and calendar id `cal-E74MDlDKBaeAwXK`. No key. `#feedback` files a note against one of those events. Photon sends a copy to the operator only. The author's email is stored and is not an iMessage recipient. `GET /api/platform` includes `community` without calling Luma.

## Check

`npx tsc --noEmit -p tsconfig.json` from `aegis/`.

`npm run build` is the same step the Dockerfile runs. It shares `.next` with the dev server, so stop `npm run dev` first and start it again after. `GET /api/health` is the container health check; keep it dependency-free beyond SQLite.

API smoke, from PowerShell, against port 3001:

- `POST /api/govern` with `{ "input": "Decide a $15,000 personal loan for Ram Guttikonda." }` returns Ram, a calculated FICO, and an alert whose `to` list contains the operator email.
- `GET /api/ledger` returns `intact: true`.
- `GET /api/platform` returns review, billing, cognition, runtime, and community even when every key is empty.
- `GET /api/community` returns upcoming events from `lu.ma/genai-collective`. `POST /api/community` with a name, email, rating, and message stores a note.

UI changes need a pass in the browser: open the hash, click the control, confirm the resulting status text. A screenshot of the first paint is not enough.

Windows shell notes: do not use `&&`. `curl` is an alias for `Invoke-WebRequest`; use `Invoke-RestMethod`.
