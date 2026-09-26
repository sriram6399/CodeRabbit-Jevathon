import { execFile } from "child_process";
import { promisify } from "util";
import { noteGmiUsage } from "./usage";
import { usageTotals } from "./store";

const exec = promisify(execFile);

export const GMI_BASE = "https://api.gmi-serving.com/v1";
export const DEFAULT_GMI_MODEL = "meta-llama/Llama-3.3-70B-Instruct";

/** Dedicated GPU rates published by GMI Cloud in its 2026 inference pricing guide. */
export const DEDICATED_RATES = [
  { sku: "H100", usdPerHour: 2, note: "On-demand rate cited for Llama 70B serving." },
  { sku: "H200 reserved", usdPerHour: 2.5, note: "Reserved rate cited in the same guide." },
];

const COMPOSE = `docker compose up --build`;

export function gmiModel() {
  return process.env.GMI_MODEL?.trim() || DEFAULT_GMI_MODEL;
}

export async function completeOnGmi(input: string): Promise<string | null> {
  const key = process.env.GMI_API_KEY?.trim();
  if (!key) return null;
  const model = gmiModel();
  const response = await fetch(`${GMI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are the reasoning trace of a loan-approval agent. Write 3-5 sentences explaining how you would decide, citing only facts present in the user message. Do not invent income, identity, or scores. Do not give the final decision yet.",
        },
        { role: "user", content: input },
      ],
    }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) return null;
  noteGmiUsage({
    model: data.model || model,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  });
  return text;
}

async function dockerVersion() {
  try {
    const { stdout } = await exec("docker", ["version", "--format", "{{.Server.Version}}"], {
      timeout: 8000,
      windowsHide: true,
    });
    const version = stdout.trim();
    return version ? { available: true, version } : { available: false, version: null };
  } catch {
    return { available: false, version: null };
  }
}

export async function runtimeStatus() {
  const docker = await dockerVersion();
  const totals = usageTotals("loan-approval");
  const measuredTokens = totals.measured.prompt + totals.measured.completion;
  const estimatedTokens = totals.estimated.prompt + totals.estimated.completion;
  const fromLedger = Math.ceil(totals.turns.chars / 4);
  return {
    provider: "gmi" as const,
    configured: Boolean(process.env.GMI_API_KEY?.trim()),
    model: gmiModel(),
    endpoint: GMI_BASE,
    docker,
    command: COMPOSE,
    dedicated: DEDICATED_RATES,
    loanAgent: {
      turns: totals.turns.runs,
      measuredRuns: totals.measured.runs,
      measuredTokens,
      estimatedTokens: estimatedTokens || fromLedger,
      estimateNote:
        "Token estimates use about 4 characters per token on stored loan turns. Dollar rates for serverless models are on the GMI model card and are not invented here. Dedicated GPU hourly rates are GMI's published figures.",
    },
  };
}

export async function checkDeploy() {
  const docker = await dockerVersion();
  if (!docker.available) {
    return {
      status: "unavailable" as const,
      note: "Docker is not running on this machine. Install Docker Desktop, then run docker compose up --build from the aegis folder.",
      command: COMPOSE,
    };
  }
  try {
    await exec("docker", ["compose", "-f", "docker-compose.yml", "config"], {
      cwd: process.cwd(),
      timeout: 20_000,
      windowsHide: true,
    });
    return {
      status: "ready" as const,
      note: `Docker ${docker.version} can build the loan-agent image. Inference cost follows GMI when GMI_API_KEY is set in the container.`,
      command: COMPOSE,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "docker compose config failed";
    return {
      status: "error" as const,
      note: message.slice(0, 280),
      command: COMPOSE,
    };
  }
}
