import { Browserbase } from "@browserbasehq/sdk";
import { chromium, type Browser } from "playwright-core";
import type { BrowserEvidence } from "@/sdk/types";

/** Public page the underwriter reads before it decides. Stable, no login. */
export const LENDING_REFERENCE_URL = "https://en.wikipedia.org/wiki/Prime_rate";

function skipped(note: string, started: number): BrowserEvidence {
  return {
    status: "skipped",
    provider: "browserbase",
    sessionId: null,
    replayUrl: null,
    pageUrl: LENDING_REFERENCE_URL,
    title: null,
    excerpt: null,
    latencyMs: Date.now() - started,
    note,
  };
}

function clip(text: string, max = 420) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Opens a Browserbase cloud browser, reads the public prime-rate page,
 * and returns the excerpt plus a replay link. Never throws: a missing key
 * or a failed session comes back as evidence the judge and the ledger can see.
 */
export async function gatherLendingReference(): Promise<BrowserEvidence> {
  const started = Date.now();
  const apiKey = process.env.BROWSERBASE_API_KEY?.trim();
  const projectId = process.env.BROWSERBASE_PROJECT_ID?.trim();

  if (!apiKey) {
    return skipped(
      "BROWSERBASE_API_KEY is not set, so the agent decided without a live browser.",
      started,
    );
  }

  let browser: Browser | null = null;
  let sessionId: string | null = null;

  try {
    const bb = new Browserbase({ apiKey });
    const session = await bb.sessions.create({
      ...(projectId ? { projectId } : {}),
      api_timeout: 60,
      keepAlive: false,
      browserSettings: {
        blockAds: true,
        recordSession: true,
        viewport: { width: 1280, height: 800 },
      },
      userMetadata: { agent: "loan-approval", purpose: "lending-reference" },
    });
    sessionId = session.id;

    browser = await chromium.connectOverCDP(session.connectUrl, { timeout: 20_000 });
    const context = browser.contexts()[0];
    const page = context?.pages()[0] ?? (await context.newPage());
    await page.goto(LENDING_REFERENCE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });

    const title = await page.title();
    const excerpt = await page.locator("#mw-content-text p").first().innerText({ timeout: 8_000 });

    return {
      status: "live",
      provider: "browserbase",
      sessionId,
      replayUrl: `https://www.browserbase.com/sessions/${sessionId}`,
      pageUrl: LENDING_REFERENCE_URL,
      title: title || null,
      excerpt: clip(excerpt),
      latencyMs: Date.now() - started,
      note: "Cloud browser read the public prime-rate reference before the decision.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Browserbase session failed";
    return {
      status: "error",
      provider: "browserbase",
      sessionId,
      replayUrl: sessionId ? `https://www.browserbase.com/sessions/${sessionId}` : null,
      pageUrl: LENDING_REFERENCE_URL,
      title: null,
      excerpt: null,
      latencyMs: Date.now() - started,
      note: clip(message, 240),
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export function describeBrowser(evidence: BrowserEvidence) {
  if (evidence.status === "live") {
    const bits = [
      `Browserbase session ${evidence.sessionId} opened ${evidence.pageUrl}.`,
      evidence.title ? `Page: ${evidence.title}.` : "",
      evidence.excerpt ? `Excerpt: ${evidence.excerpt}` : "",
    ];
    return bits.filter(Boolean).join(" ");
  }
  if (evidence.status === "skipped") {
    return `Browserbase was not used. ${evidence.note}`;
  }
  return `Browserbase session failed${evidence.sessionId ? ` (${evidence.sessionId})` : ""}. ${evidence.note}`;
}
