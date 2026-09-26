import { latestHandoff, latestReview, saveHandoff } from "./store";

export function cognitionStatus() {
  return {
    provider: "cognition" as const,
    configured: Boolean(process.env.DEVIN_API_KEY?.trim() && process.env.DEVIN_ORG_ID?.trim()),
    last: latestHandoff(),
  };
}

function promptFor(task: "wrap" | "review") {
  const review = latestReview();
  if (task === "review") {
    return [
      "You are Devin, working in the Aegis repository.",
      "Read the latest CodeRabbit review and fix the findings that affect correctness or the EU AI Act gate.",
      "Do not weaken thresholds in aegis/src/compliance/eu-ai-act.ts.",
      review ? `Latest CodeRabbit status: ${review.status}. ${review.summary}` : "No CodeRabbit review is stored yet.",
      review?.output ? `Review excerpt:\n${review.output.slice(0, 4000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  return [
    "You are Devin. Wrap an existing agent with Aegis so every turn is input, required reasoning, and output.",
    "Use wrapAgent from aegis/src/sdk/wrap-agent.ts, or POST /api/verify with { agent, input, reasoning, output }.",
    "Keep the loan approval agent as the reference implementation.",
    "Do not change the EU AI Act question pack.",
  ].join("\n\n");
}

export async function handoffToDevin(task: "wrap" | "review") {
  const prompt = promptFor(task);
  const apiKey = process.env.DEVIN_API_KEY?.trim();
  const orgId = process.env.DEVIN_ORG_ID?.trim();

  if (!apiKey || !orgId) {
    return saveHandoff({
      task,
      status: "queued",
      prompt,
      sessionUrl: null,
      note: "Cognition is not connected. Set DEVIN_API_KEY (cog_…) and DEVIN_ORG_ID to open a Devin session with this prompt.",
    });
  }

  try {
    const response = await fetch(`https://api.devin.ai/v3/organizations/${orgId}/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, devin_mode: "lite" }),
    });
    const payload = (await response.json().catch(() => null)) as {
      session_id?: string;
      url?: string;
      status?: string;
      detail?: string;
      message?: string;
    } | null;
    if (!response.ok) {
      const message = payload?.detail || payload?.message || `Devin returned ${response.status}.`;
      return saveHandoff({
        task,
        status: "error",
        prompt,
        sessionUrl: null,
        note: message.slice(0, 280),
      });
    }
    return saveHandoff({
      task,
      status: payload?.status ?? "running",
      prompt,
      sessionUrl: payload?.url ?? null,
      note: payload?.session_id
        ? `Devin session ${payload.session_id} is open.`
        : "Devin accepted the handoff.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Devin request failed";
    return saveHandoff({
      task,
      status: "error",
      prompt,
      sessionUrl: null,
      note: message.slice(0, 280),
    });
  }
}
