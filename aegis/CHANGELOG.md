# Changelog

All notable changes to Aegis. Dates are the hackathon day. Newer entries belong at the top. When you change behavior, add a bullet here and, if the change affects an invariant, update `AGENTS.md` in the same edit.

## 2026-09-26

### Added

- Feedback view (`#feedback`) for The AI Collective. It reads upcoming events from the public Luma calendar `lu.ma/genai-collective` and files a note against one of them. Photon sends a copy to the operator when those keys are set. A missing calendar or Photon key still stores the note.
- Aegis console and SDK in `aegis/`. `wrapAgent` captures input, requires a reasoning trace, runs the agent, and returns a governed turn. `POST /api/verify` accepts a finished triple from an external agent.
- EU AI Act gates judged by Jev (`noul`, `choice`, `score`) with a deterministic mock when `TYPESAFE_API_KEY` is empty. Decisions are ALLOW, FLAG, and BLOCK.
- Append-only SHA-256 ledger in SQLite (`data/aegis.db`). Optional `browser`, `customer`, and `alert` objects enter the hash only when present.
- Playground, ledger, and integrate views. Integrate shows TypeScript, REST, Python, LangChain, and Express snippets.
- Loan Approval agent as the agent under test, including presets for a greeting, a clean applicant, social scoring, a demographic proxy, and invented income.
- Local customer book centered on Ram Guttikonda, indexed with LlamaIndex through a local hash embedding. The loan agent calculates a FICO-shaped score from the file and ignores a prompt score when the file exists.
- Browserbase session on credit decisions. Missing keys record status `skipped`. Greetings do not open a browser.
- Photon alert after the governance decision to `guttikondasriram1234@gmail.com`, the customer email, and any email in the query. Missing keys record status `skipped`.
- Platform view: CodeRabbit review, Cognition Devin handoff (`wrap` or `review`), and GMI loan-agent cost plus a local Docker compose deploy. Each control stays available without credentials.
- About (`#about`) and Subscribe (`#subscribe`). Whop plans are Wrap $29, Team $99, and Firm $249 per month. A missing Whop key stores a pending seat and does not lock the playground.
- `AGENTS.md` for the next model.
- Container build: two-stage `Dockerfile` (build, prune dev deps, run as `node`), `docker-compose.yml` with the `aegis-data` volume and a health check, `.dockerignore`, and `GET /api/health`. Verified with `npm run build` and `next start` on this machine; Docker itself was not available here.

### Changed

- About quotes The AI Collective: if you want to meet the team, meet them at the JEVATHON Luma event (`https://lu.ma/aic-jev`).
- The default reasoning trace no longer says "neighborhood", which the mock judge treated as a demographic proxy.
- Loan-agent reasoning prefers GMI (`GMI_API_KEY`), then OpenAI, then the deterministic trace. Token use is stored in `agent_usage`.

### Fixed

- SQLite migrations run on every `getDb()` so a cached connection still picks up new columns.
- Next workspace root is pinned to `aegis/` so the parent lockfile is not treated as the app root.
