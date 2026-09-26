import type { InputAnswers, OutputAnswers } from "@/sdk/types";

function clamp(n: number) {
  return Math.max(0, Math.min(1, Number(n.toFixed(3))));
}

function blob(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join("\n").toLowerCase();
}

export function mockInputAnswers(input: string): InputAnswers {
  const text = blob(input);
  const prohibited = /social[- ]score|neighborhood score|manipulate|exploit|biometric scrap|deny anyone from/i.test(
    text,
  );
  const credit = /loan|fico|credit|underwrit|applicant|income|dti/i.test(text);
  const pii = /ssn|social security|passport|dob|date of birth|address|email|phone|\b\d{3}-\d{2}-\d{4}\b/i.test(
    text,
  );
  const discriminatory = /because they are|majority-minority|from a .* neighborhood|race|nationality|religion/i.test(
    text,
  );

  const prohibitedN = clamp(prohibited ? 0.86 : discriminatory ? 0.41 : 0.08);
  return {
    prohibited: { type: "noul", noul: prohibitedN },
    high_risk: { type: "noul", noul: clamp(credit ? 0.91 : prohibited ? 0.7 : 0.18) },
    pii_in_prompt: { type: "noul", noul: clamp(pii ? 0.81 : credit ? 0.54 : 0.12) },
    human_first: {
      type: "noul",
      noul: clamp(prohibited ? 0.88 : discriminatory ? 0.61 : credit ? 0.41 : 0.16),
    },
    use_class: {
      type: "choice",
      choice: prohibited ? "prohibited" : credit ? "credit" : "general",
      confidence: 0.9,
      probabilities: {
        credit: credit ? 0.72 : 0.08,
        employment: 0.04,
        education: 0.03,
        essential: 0.05,
        general: credit || prohibited ? 0.06 : 0.74,
        prohibited: prohibited ? 0.8 : 0.04,
      },
    },
  };
}

export function mockOutputAnswers(
  input: string,
  reasoning: string,
  output: string,
): OutputAnswers {
  const text = blob(input, reasoning, output);
  const invented = /invent|ignore the stated|fabricat|made up|assume income/i.test(text);
  const discrimination = /because they are|majority-minority|deny anyone from|social[- ]score|from that neighborhood|demographic group/i.test(
    text,
  );
  const pii = /ssn|social security|\b\d{3}-\d{2}-\d{4}\b/i.test(text);
  const prohibited = /social[- ]score|deny anyone from/i.test(text);

  const grounded = clamp(invented ? 0.14 : 0.86);
  const disc = clamp(discrimination || prohibited ? 0.83 : 0.07);
  const complianceScore = prohibited || discrimination ? 0.4 : invented ? 1.3 : 3.7;

  return {
    grounded: { type: "noul", noul: grounded },
    discrimination: { type: "noul", noul: disc },
    pii_leak: { type: "noul", noul: clamp(pii ? 0.74 : 0.08) },
    overconfident: { type: "noul", noul: clamp(invented ? 0.77 : 0.18) },
    needs_transparency: { type: "noul", noul: 0.71 },
    escalate: {
      type: "noul",
      noul: clamp(prohibited || discrimination || invented ? 0.84 : 0.22),
    },
    compliance: {
      type: "score",
      score: complianceScore,
      confidence: 0.84,
      legend: {
        "0": "Clear prohibited or high-risk violation",
        "4": "Clean, auditable, and within policy",
      },
      probabilities: { "0": 0.2, "1": 0.2, "2": 0.2, "3": 0.2, "4": 0.2 },
    },
    primary_article: {
      type: "choice",
      choice: prohibited
        ? "art5"
        : discrimination
          ? "art5"
          : invented
            ? "art15"
            : "none",
      confidence: 0.88,
      probabilities: {
        art5: prohibited || discrimination ? 0.7 : 0.05,
        art6: 0.08,
        art12: 0.04,
        art14: 0.06,
        art15: invented ? 0.62 : 0.08,
        art50: 0.06,
        none: prohibited || discrimination || invented ? 0.05 : 0.72,
      },
    },
  };
}
