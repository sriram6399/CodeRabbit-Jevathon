import { mockAnswers } from "./mock";
import { VERDICT_QUESTIONS } from "./questions";
import type { Answer, JevAnswers, PullRequestBrief } from "./types";
import { toJevState } from "./github";

type SystemOneResponse = {
  model: string;
  answers: Record<string, Answer>;
  usage?: { input_tokens: number; output_tokens: number };
};

function isJevAnswers(answers: Record<string, Answer>): answers is JevAnswers {
  return (
    answers.ship?.type === "noul" &&
    answers.security?.type === "noul" &&
    answers.secrets?.type === "noul" &&
    answers.breaking?.type === "noul" &&
    answers.tests_needed?.type === "noul" &&
    answers.docs_needed?.type === "noul" &&
    answers.escalate?.type === "noul" &&
    answers.agent_fix?.type === "noul" &&
    answers.review_ready?.type === "noul" &&
    answers.category?.type === "choice" &&
    answers.risk?.type === "score" &&
    answers.blast_radius?.type === "score"
  );
}

export async function askJev(pr: PullRequestBrief): Promise<{
  answers: JevAnswers;
  model: string;
  mocked: boolean;
  usage?: { input_tokens: number; output_tokens: number };
}> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) {
    return {
      answers: mockAnswers(pr),
      model: "jev-mock",
      mocked: true,
    };
  }

  const response = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "jev-latest",
      state: toJevState(pr),
      questions: VERDICT_QUESTIONS,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Jev returned ${response.status}: ${detail.slice(0, 280)}`);
  }

  const data = (await response.json()) as SystemOneResponse;
  if (!isJevAnswers(data.answers)) {
    throw new Error("Jev response was missing one or more expected answers.");
  }

  return {
    answers: data.answers,
    model: data.model ?? "jev-latest",
    mocked: false,
    usage: data.usage,
  };
}
