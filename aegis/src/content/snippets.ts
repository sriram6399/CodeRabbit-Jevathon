export type Snippet = {
  id: string;
  title: string;
  summary: string;
  language: string;
  filename: string;
  code: string;
};

const BASE = "http://localhost:3001";

export const SNIPPETS: Snippet[] = [
  {
    id: "ts-wrap",
    title: "TypeScript · wrap an agent",
    summary:
      "The tightest integration. Aegis screens the input, requires a reasoning trace, judges the finished turn, and never releases a blocked output.",
    language: "typescript",
    filename: "agent.ts",
    code: `import { wrapAgent } from "@aegis/sdk";

const governed = wrapAgent(
  {
    name: "loan-approval",
    frameworks: ["eu-ai-act"],
    mode: "gated", // "observe" | "gated" | "block"
  },
  async (input, { requireReasoning }) => {
    // Aegis forces a reasoning step before any output is produced.
    const reasoning = await requireReasoning(input);

    // Your existing agent call goes here.
    const output = await myLoanAgent.run(input, { reasoning });

    return { reasoning, output };
  },
);

const turn = await governed("Maya Chen, FICO 720, income $92k, requesting $18k");

if (turn.released) {
  reply(turn.output);           // ALLOW or FLAG
} else {
  reply("A reviewer is looking at this request."); // BLOCK
}

console.log(turn.decision, turn.reason, turn.log.hash);`,
  },
  {
    id: "rest",
    title: "REST · verify a finished turn",
    summary:
      "Any language, any framework. Post the triple your agent produced and Aegis returns a typed decision plus the ledger hash.",
    language: "bash",
    filename: "curl",
    code: `curl -X POST ${BASE}/api/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent": "loan-approval",
    "input": "Maya Chen, FICO 720, income $92,000, requesting $18,000",
    "reasoning": "Score and income support the request; no protected attributes used.",
    "output": "Conditionally approved pending income verification.",
    "mode": "gated"
  }'

# {
#   "decision": "FLAG",
#   "released": true,
#   "reason": "Annex III high-risk use — log and keep a human in the loop.",
#   "outputGate": { "answers": { "grounded": { "noul": 0.91 }, ... } },
#   "log": { "prevHash": "…", "hash": "…" }
# }`,
  },
  {
    id: "python",
    title: "Python · decorator around any LLM call",
    summary:
      "Drop-in for OpenAI, Anthropic, or a local model. The decorator posts input, reasoning, and output to Aegis and raises if the turn is blocked.",
    language: "python",
    filename: "aegis_client.py",
    code: `import functools, requests

AEGIS = "${BASE}/api/verify"

class Blocked(Exception):
    pass

def governed(agent: str, mode: str = "gated"):
    def wrap(fn):
        @functools.wraps(fn)
        def inner(user_input: str, *args, **kwargs):
            # Your function must return (reasoning, output).
            reasoning, output = fn(user_input, *args, **kwargs)
            r = requests.post(AEGIS, json={
                "agent": agent,
                "input": user_input,
                "reasoning": reasoning,
                "output": output,
                "mode": mode,
            }, timeout=10).json()
            if not r["released"]:
                raise Blocked(r["reason"])
            return output, r
        return inner
    return wrap


@governed("loan-approval")
def loan_agent(user_input: str):
    plan = llm(f"Explain how you would decide, citing only stated facts:\\n{user_input}")
    answer = llm(f"Given this reasoning:\\n{plan}\\nRespond to:\\n{user_input}")
    return plan, answer


output, verdict = loan_agent("Maya Chen, FICO 720, income $92k, requesting $18k")
print(verdict["decision"], verdict["log"]["hash"])`,
  },
  {
    id: "langchain",
    title: "LangChain · callback handler",
    summary:
      "Attach once. Every chain run is captured as input → intermediate reasoning → final output and verified without touching your prompts.",
    language: "python",
    filename: "aegis_callback.py",
    code: `import requests
from langchain_core.callbacks import BaseCallbackHandler

class AegisHandler(BaseCallbackHandler):
    def __init__(self, agent: str, base="${BASE}"):
        self.agent, self.url = agent, f"{base}/api/verify"
        self._input, self._steps = None, []

    def on_chain_start(self, serialized, inputs, **kw):
        if self._input is None:
            self._input = str(inputs.get("input") or inputs)

    def on_agent_action(self, action, **kw):
        # Intermediate thoughts become the reasoning trace.
        self._steps.append(action.log)

    def on_chain_end(self, outputs, **kw):
        if self._input is None:
            return
        verdict = requests.post(self.url, json={
            "agent": self.agent,
            "input": self._input,
            "reasoning": "\\n".join(self._steps),
            "output": str(outputs.get("output") or outputs),
        }, timeout=10).json()
        if not verdict["released"]:
            outputs["output"] = "A reviewer is looking at this request."
        outputs["aegis"] = verdict
        self._input, self._steps = None, []


executor.invoke(
    {"input": "Maya Chen, FICO 720, income $92k, requesting $18k"},
    config={"callbacks": [AegisHandler("loan-approval")]},
)`,
  },
  {
    id: "middleware",
    title: "Node · middleware for an existing HTTP agent",
    summary:
      "Sits in front of a running agent service. Forwards the request, reads back reasoning and output, and gates the response.",
    language: "typescript",
    filename: "middleware.ts",
    code: `import type { Request, Response, NextFunction } from "express";

const AEGIS = "${BASE}/api/verify";

export function aegis(agent: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const upstream = await fetch(process.env.AGENT_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    // Your agent returns { reasoning, output }.
    const { reasoning, output } = await upstream.json();

    const verdict = await fetch(AEGIS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, input: req.body.input, reasoning, output }),
    }).then((r) => r.json());

    res.setHeader("x-aegis-decision", verdict.decision);
    res.setHeader("x-aegis-hash", verdict.log.hash);

    if (!verdict.released) {
      return res.status(202).json({ output: null, review: verdict.reason });
    }
    return res.json({ output, aegis: verdict });
  };
}

app.post("/chat", aegis("loan-approval"));`,
  },
];
