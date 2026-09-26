export type Decision = "SHIP" | "HOLD" | "BLOCK";

export type NoulAnswer = {
  type: "noul";
  noul: number;
};

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

export type ScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
};

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export type JevAnswers = {
  ship: NoulAnswer;
  security: NoulAnswer;
  breaking: NoulAnswer;
  tests_needed: NoulAnswer;
  docs_needed: NoulAnswer;
  escalate: NoulAnswer;
  agent_fix: NoulAnswer;
  review_ready: NoulAnswer;
  secrets: NoulAnswer;
  category: ChoiceAnswer;
  risk: ScoreAnswer;
  blast_radius: ScoreAnswer;
};

export type PullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
};

export type ReviewSignal = {
  source: "coderabbit" | "human" | "ci";
  author: string;
  body: string;
};

export type PullRequestBrief = {
  url: string;
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  author: string;
  base: string;
  head: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  draft: boolean;
  files: PullRequestFile[];
  reviews: ReviewSignal[];
};

export type VerdictResult = {
  decision: Decision;
  reason: string;
  latencyMs: number;
  model: string;
  mocked: boolean;
  answers: JevAnswers;
  pr: PullRequestBrief;
  usage?: { input_tokens: number; output_tokens: number };
};
