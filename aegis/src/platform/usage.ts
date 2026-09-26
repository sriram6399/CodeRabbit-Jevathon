import { AsyncLocalStorage } from "async_hooks";
import { recordUsage } from "./store";

export type ModelUsage = {
  model: string;
  promptTokens: number;
  completionTokens: number;
};

const storage = new AsyncLocalStorage<{ gmi: ModelUsage | null }>();

export function withTurnUsage<T>(fn: () => Promise<T>) {
  return storage.run({ gmi: null }, fn);
}

export function noteGmiUsage(usage: ModelUsage) {
  const store = storage.getStore();
  if (store) store.gmi = usage;
}

export function recordTurnUsage(input: {
  runId: string | null;
  agent: string;
  input: string;
  reasoning: string | null;
  output: string | null;
}) {
  try {
    const gmi = storage.getStore()?.gmi;
    if (gmi) {
      recordUsage({
        runId: input.runId,
        agent: input.agent,
        provider: "gmi",
        model: gmi.model,
        promptTokens: gmi.promptTokens,
        completionTokens: gmi.completionTokens,
        note: "Measured on the GMI chat completion for this turn.",
      });
      return;
    }
    const chars = input.input.length + (input.reasoning?.length ?? 0) + (input.output?.length ?? 0);
    const tokens = Math.max(1, Math.ceil(chars / 4));
    recordUsage({
      runId: input.runId,
      agent: input.agent,
      provider: "estimate",
      model: null,
      promptTokens: Math.ceil(tokens * 0.7),
      completionTokens: Math.ceil(tokens * 0.3),
      note: "Local estimate from stored text, about 4 characters per token. Not a GMI invoice.",
    });
  } catch {
    // A cost row must not fail the governed turn.
  }
}
