export const SAMPLE_PRS = [
  {
    label: "next.js #1",
    url: "https://github.com/vercel/next.js/pull/1",
    blurb: "Real public PR — fetch + judge.",
  },
  {
    label: "react #1",
    url: "https://github.com/facebook/react/pull/1",
    blurb: "Historic change — watch Jev hesitate.",
  },
  {
    label: "vscode #1",
    url: "https://github.com/microsoft/vscode/pull/1",
    blurb: "Editor core — blast radius matters.",
  },
] as const;

export const SAMPLE_DIFFS = [
  {
    label: "Leaky token",
    title: "chore: wire production OpenAI key",
    diff: `diff --git a/src/llm.ts b/src/llm.ts
--- a/src/llm.ts
+++ b/src/llm.ts
@@ -1,6 +1,8 @@
 export const client = new OpenAI({
-  apiKey: process.env.OPENAI_API_KEY,
+  apiKey: "sk-proj-SUPERSECRET_live_key_do_not_commit",
 });
+
+export const adminBypass = true;
`,
    blurb: "Should BLOCK. Secrets + auth bypass.",
  },
  {
    label: "Tiny copy fix",
    title: "fix: typo on billing empty state",
    diff: `diff --git a/app/billing/page.tsx b/app/billing/page.tsx
--- a/app/billing/page.tsx
+++ b/app/billing/page.tsx
@@ -12,7 +12,7 @@
-        <p>No invocies yet.</p>
+        <p>No invoices yet.</p>
`,
    blurb: "Should SHIP. Trivial, tested-enough copy.",
  },
] as const;
