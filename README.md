# Verdict

A ship / hold / block gate for pull requests, built for **JEVATHON** (TypeSafe × The AI Collective, hosted at CodeRabbit).

Jev is not a chatbot. You send program state and typed questions; it returns calibrated probabilities in one parallel call. Verdict uses that as a merge gate:

- **SHIP** when Jev is confident the change can land
- **HOLD** when uncertainty is high — route to a human
- **BLOCK** on secrets, security, or critical production risk

Then it confidence-gates the next action: auto-merge, ask an agent (Devin) to fix, or escalate.

## Run it

```bash
npm install
cp .env.example .env.local
# paste TYPESAFE_API_KEY from console.typesafe.ai
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No key? The UI still works in **mock mode** so you can rehearse the demo.

## Demo script (3 minutes)

1. Paste the **Tiny copy fix** diff → expect **SHIP**.
2. Paste the **Leaky token** diff → expect **BLOCK**.
3. Load a real GitHub PR → show the 12-question board and latency.
4. Point at the routing cards: auto-merge / Devin / human. That is the TypeSafe pattern.

## HackerSquad submission

- **Name:** Verdict
- **One-liner:** Jev decides if a PR ships — in ~200ms, with probabilities your code can trust.
- **Tools:** TypeSafe Jev (core), GitHub API, CodeRabbit review signals when present, Cognition/Devin as the auto-fix path.
- After you ship: register the project, request a demo, and leave tool feedback for points.
