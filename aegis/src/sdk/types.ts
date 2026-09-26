export type Decision = "ALLOW" | "FLAG" | "BLOCK";
export type FrameworkId = "eu-ai-act";
export type GateMode = "gated" | "observe" | "block";
export type Channel = "wrap" | "verify";

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

export type InputAnswers = {
  prohibited: NoulAnswer;
  high_risk: NoulAnswer;
  pii_in_prompt: NoulAnswer;
  human_first: NoulAnswer;
  use_class: ChoiceAnswer;
};

export type OutputAnswers = {
  grounded: NoulAnswer;
  discrimination: NoulAnswer;
  pii_leak: NoulAnswer;
  overconfident: NoulAnswer;
  needs_transparency: NoulAnswer;
  escalate: NoulAnswer;
  compliance: ScoreAnswer;
  primary_article: ChoiceAnswer;
};

export type GateResult<T> = {
  answers: T;
  model: string;
  mocked: boolean;
  latencyMs: number;
  usage?: { input_tokens: number; output_tokens: number };
};

export type AgentHelpers = {
  requireReasoning: (input: string) => Promise<string>;
};

export type AgentTurn = {
  reasoning: string;
  output: string;
  browser?: BrowserEvidence | null;
  customer?: CustomerBrief | null;
  alert?: AlertReceipt | null;
};

export type CustomerBrief = {
  id: string;
  name: string;
  email: string;
  city: string;
  income: number;
  monthlyObligations: number;
  fico: number;
  factors: {
    paymentHistory: number;
    utilization: number;
    historyLength: number;
    newCredit: number;
    creditMix: number;
  };
  retrievedBy: "llamaindex";
};

export type AlertReceipt = {
  provider: "photon";
  channel: "imessage-email";
  status: "sent" | "skipped" | "error";
  to: string[];
  subject: string;
  body: string;
  note: string;
};

export type BrowserEvidence = {
  status: "live" | "skipped" | "error";
  provider: "browserbase";
  sessionId: string | null;
  replayUrl: string | null;
  pageUrl: string;
  title: string | null;
  excerpt: string | null;
  latencyMs: number;
  note: string;
};

export type AgentFn = (
  input: string,
  helpers: AgentHelpers,
) => Promise<AgentTurn>;

export type WrapConfig = {
  name: string;
  frameworks?: FrameworkId[];
  mode?: GateMode;
  reasoner?: (input: string) => Promise<string>;
};

export type VerifyRequest = {
  agent: string;
  input: string;
  reasoning: string;
  output: string;
  mode?: GateMode;
};

export type GovernedResult = {
  id: string;
  agent: string;
  channel: Channel;
  input: string;
  reasoning: string | null;
  output: string | null;
  decision: Decision;
  reason: string;
  released: boolean;
  blockedBeforeAgent: boolean;
  browser: BrowserEvidence | null;
  customer: CustomerBrief | null;
  alert: AlertReceipt | null;
  inputGate: GateResult<InputAnswers>;
  outputGate: GateResult<OutputAnswers> | null;
  log: {
    prevHash: string;
    hash: string;
  };
};
