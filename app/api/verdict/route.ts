import { NextResponse } from "next/server";
import { fetchPullRequest } from "@/lib/github";
import { askJev } from "@/lib/jev";
import { decide } from "@/lib/verdict";
import type { PullRequestBrief, VerdictResult } from "@/lib/types";

function briefFromPaste(title: string, diff: string): PullRequestBrief {
  const files = diff
    .split(/^diff --git /m)
    .filter(Boolean)
    .slice(0, 8)
    .map((chunk, i) => {
      const name =
        chunk.match(/b\/(.+)$/m)?.[1]?.trim() ?? `pasted-${i + 1}.txt`;
      return {
        filename: name,
        status: "modified",
        additions: (chunk.match(/^\+/gm) ?? []).length,
        deletions: (chunk.match(/^-/gm) ?? []).length,
        patch: chunk.slice(0, 4000),
      };
    });

  const additions = files.reduce((sum, file) => sum + file.additions, 0);
  const deletions = files.reduce((sum, file) => sum + file.deletions, 0);

  return {
    url: "pasted://diff",
    owner: "local",
    repo: "diff",
    number: 0,
    title: title || "Pasted diff",
    body: "Submitted as a raw diff from the Verdict console.",
    author: "you",
    base: "main",
    head: "local",
    additions,
    deletions,
    changedFiles: files.length || 1,
    draft: false,
    files:
      files.length > 0
        ? files
        : [
            {
              filename: "change.diff",
              status: "modified",
              additions: (diff.match(/^\+/gm) ?? []).length,
              deletions: (diff.match(/^-/gm) ?? []).length,
              patch: diff.slice(0, 8000),
            },
          ],
    reviews: [],
  };
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const body = (await request.json()) as {
      url?: string;
      title?: string;
      diff?: string;
    };

    const pr =
      body.diff?.trim()
        ? briefFromPaste(body.title ?? "", body.diff)
        : await fetchPullRequest(body.url ?? "");

    const jev = await askJev(pr);
    const { decision, reason } = decide(jev.answers);

    const payload: VerdictResult = {
      decision,
      reason,
      latencyMs: Date.now() - started,
      model: jev.model,
      mocked: jev.mocked,
      answers: jev.answers,
      pr,
      usage: jev.usage,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
