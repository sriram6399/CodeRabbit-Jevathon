import type { JevAnswers, PullRequestBrief } from "./types";

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function mockAnswers(pr: PullRequestBrief): JevAnswers {
  const blob = [
    pr.title,
    pr.body,
    ...pr.files.map((f) => `${f.filename}\n${f.patch ?? ""}`),
  ].join("\n");
  const seed = hash(`${pr.title}:${pr.additions}:${pr.deletions}:${pr.changedFiles}`);
  const risky =
    /auth|secret|password|token|api[_-]?key|sk-|adminbypass|sql|eval|dangerously|crypto|private key|credential/i.test(
      blob,
    );
  const tested = pr.files.some((f) => /test|spec/i.test(f.filename));
  const large = pr.additions + pr.deletions > 400;

  const security = clamp(risky ? 0.78 + seed * 0.15 : 0.08 + seed * 0.12);
  const secrets = clamp(risky ? 0.41 + seed * 0.2 : 0.04 + seed * 0.06);
  const ship = clamp(risky || large ? 0.22 + seed * 0.2 : 0.74 + seed * 0.18);
  const escalate = clamp(1 - ship + (risky ? 0.25 : 0));

  return {
    ship: { type: "noul", noul: Number(ship.toFixed(3)) },
    security: { type: "noul", noul: Number(security.toFixed(3)) },
    secrets: { type: "noul", noul: Number(secrets.toFixed(3)) },
    breaking: { type: "noul", noul: Number((large ? 0.46 : 0.11 + seed * 0.1).toFixed(3)) },
    tests_needed: { type: "noul", noul: Number((tested ? 0.18 : 0.67).toFixed(3)) },
    docs_needed: { type: "noul", noul: Number((0.2 + seed * 0.3).toFixed(3)) },
    escalate: { type: "noul", noul: Number(clamp(escalate).toFixed(3)) },
    agent_fix: { type: "noul", noul: Number((risky || !tested ? 0.71 : 0.19).toFixed(3)) },
    review_ready: { type: "noul", noul: Number((pr.body.length > 80 ? 0.8 : 0.34).toFixed(3)) },
    category: {
      type: "choice",
      choice: risky ? "security" : large ? "feature" : "bugfix",
      confidence: 0.86,
      probabilities: {
        feature: large ? 0.62 : 0.12,
        bugfix: large ? 0.1 : 0.58,
        refactor: 0.08,
        infra: 0.06,
        security: risky ? 0.71 : 0.04,
        chore: 0.04,
      },
    },
    risk: {
      type: "score",
      score: risky ? 3.6 : large ? 2.4 : 0.9,
      confidence: 0.82,
      legend: {
        "0": "Trivial / almost no production risk",
        "4": "Critical, do not merge without senior review",
      },
      probabilities: { "0": 0.1, "1": 0.2, "2": 0.3, "3": 0.2, "4": 0.2 },
    },
    blast_radius: {
      type: "score",
      score: large ? 2.3 : 0.8,
      confidence: 0.8,
      legend: {
        "0": "Local / isolated file",
        "3": "Platform-wide or data-path impact",
      },
      probabilities: { "0": 0.3, "1": 0.3, "2": 0.25, "3": 0.15 },
    },
  };
}
