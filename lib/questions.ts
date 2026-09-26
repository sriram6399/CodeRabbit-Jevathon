export const VERDICT_QUESTIONS = {
  ship: {
    type: "noul",
    instructions:
      "Should this pull request merge as-is, without further human changes?",
    criteria: {
      true: "Safe, complete, and ready to land now",
      false: "Needs more work, tests, or review before merge",
    },
  },
  security: {
    type: "noul",
    instructions:
      "Does this change introduce a security risk (auth bypass, injection, secret leak, unsafe eval, privilege escalation)?",
    criteria: {
      true: "Concrete security concern is present",
      false: "No meaningful security concern",
    },
  },
  secrets: {
    type: "noul",
    instructions:
      "Does the diff appear to contain secrets, API keys, tokens, private keys, or credentials?",
  },
  breaking: {
    type: "noul",
    instructions:
      "Is this a breaking change for callers, APIs, schemas, or stored data?",
  },
  tests_needed: {
    type: "noul",
    instructions:
      "Are tests missing for the riskiest new behavior in this change?",
  },
  docs_needed: {
    type: "noul",
    instructions:
      "Does this change need user-facing or API documentation before it ships?",
  },
  review_ready: {
    type: "noul",
    instructions:
      "Is the pull request description, scope, and diff clear enough for a reviewer to judge quickly?",
  },
  escalate: {
    type: "noul",
    instructions:
      "Should this be escalated to a senior human reviewer instead of auto-merging?",
    criteria: {
      true: "Ambiguous, high-blast-radius, or high-uncertainty",
      false: "Routine enough for a confidence-gated auto path",
    },
  },
  agent_fix: {
    type: "noul",
    instructions:
      "Should an autonomous coding agent (like Devin) be asked to auto-fix remaining issues before a human looks again?",
  },
  category: {
    type: "choice",
    instructions: "What is the primary nature of this change?",
    criteria: {
      feature: "New user-facing or API capability",
      bugfix: "Fixes incorrect behavior",
      refactor: "Internal cleanup with no intended behavior change",
      infra: "CI, build, deploy, or developer tooling",
      security: "Hardening, auth, or vulnerability fix",
      chore: "Deps, formatting, or other maintenance",
    },
  },
  risk: {
    type: "score",
    instructions: "Overall production risk if this merged right now.",
    criteria: [
      "Trivial / almost no production risk",
      "Low risk, easy rollback",
      "Moderate risk, needs a careful look",
      "High risk, likely user or data impact",
      "Critical, do not merge without senior review",
    ],
  },
  blast_radius: {
    type: "score",
    instructions: "How widely could this change affect users or systems?",
    criteria: [
      "Local / isolated file",
      "One service or feature",
      "Cross-cutting but contained",
      "Platform-wide or data-path impact",
    ],
  },
} as const;

export const THRESHOLDS = {
  ship: 0.72,
  security: 0.45,
  secrets: 0.35,
  escalate: 0.62,
  riskBlock: 3.2,
};
