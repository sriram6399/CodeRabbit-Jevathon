import { INPUT_QUESTIONS, OUTPUT_QUESTIONS } from "./eu-ai-act";
import { mockInputAnswers, mockOutputAnswers } from "./mock";
import type {
  Answer,
  GateResult,
  InputAnswers,
  OutputAnswers,
} from "@/sdk/types";

type SystemOneResponse = {
  model: string;
  answers: Record<string, Answer>;
  usage?: { input_tokens: number; output_tokens: number };
};

async function systemOne(
  state: unknown,
  questions: Record<string, unknown>,
): Promise<SystemOneResponse> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) {
    throw new Error("NO_KEY");
  }

  const response = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "jev-latest",
      state,
      questions,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Jev ${response.status}: ${detail.slice(0, 240)}`);
  }

  return (await response.json()) as SystemOneResponse;
}

function asInput(answers: Record<string, Answer>): InputAnswers {
  const required: Array<keyof InputAnswers> = [
    "prohibited",
    "high_risk",
    "pii_in_prompt",
    "human_first",
    "use_class",
  ];
  for (const key of required) {
    if (!answers[key]) throw new Error(`Missing input answer ${key}`);
  }
  return answers as InputAnswers;
}

function asOutput(answers: Record<string, Answer>): OutputAnswers {
  const required: Array<keyof OutputAnswers> = [
    "grounded",
    "discrimination",
    "pii_leak",
    "overconfident",
    "needs_transparency",
    "escalate",
    "compliance",
    "primary_article",
  ];
  for (const key of required) {
    if (!answers[key]) throw new Error(`Missing output answer ${key}`);
  }
  return answers as OutputAnswers;
}

export async function evaluateInput(
  input: string,
  agent: string,
): Promise<GateResult<InputAnswers>> {
  const started = Date.now();
  try {
    const data = await systemOne(
      { agent, phase: "input", input },
      INPUT_QUESTIONS,
    );
    return {
      answers: asInput(data.answers),
      model: data.model ?? "jev-latest",
      mocked: false,
      latencyMs: Date.now() - started,
      usage: data.usage,
    };
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "NO_KEY") {
      if (error instanceof Error && error.message !== "NO_KEY") {
        console.warn("Jev input gate falling back to mock:", error.message);
      }
    }
    return {
      answers: mockInputAnswers(input),
      model: "jev-mock",
      mocked: true,
      latencyMs: Date.now() - started,
    };
  }
}

export async function evaluateOutput(params: {
  agent: string;
  input: string;
  reasoning: string;
  output: string;
}): Promise<GateResult<OutputAnswers>> {
  const started = Date.now();
  try {
    const data = await systemOne(
      {
        agent: params.agent,
        phase: "output",
        input: params.input,
        reasoning: params.reasoning,
        output: params.output,
      },
      OUTPUT_QUESTIONS,
    );
    return {
      answers: asOutput(data.answers),
      model: data.model ?? "jev-latest",
      mocked: false,
      latencyMs: Date.now() - started,
      usage: data.usage,
    };
  } catch (error) {
    if (error instanceof Error && error.message !== "NO_KEY") {
      console.warn("Jev output gate falling back to mock:", error.message);
    }
    return {
      answers: mockOutputAnswers(params.input, params.reasoning, params.output),
      model: "jev-mock",
      mocked: true,
      latencyMs: Date.now() - started,
    };
  }
}
