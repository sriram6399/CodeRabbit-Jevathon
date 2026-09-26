import { execFile } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";
import { latestReview, saveReview } from "./store";

const exec = promisify(execFile);

export const REVIEW_COMMAND = "coderabbit review --agent --light";

function gitRoot(start: string) {
  let dir = start;
  for (let i = 0; i < 4; i += 1) {
    if (existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

async function findCli() {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  try {
    const { stdout } = await exec(locator, ["coderabbit"], { timeout: 8000, windowsHide: true });
    const line = stdout.split(/\r?\n/).map((part) => part.trim()).find(Boolean);
    return line ?? null;
  } catch {
    return null;
  }
}

export async function coderabbitStatus() {
  const cli = await findCli();
  const key = Boolean(process.env.CODERABBIT_API_KEY?.trim());
  return {
    provider: "coderabbit" as const,
    cli: Boolean(cli),
    authenticated: key,
    command: REVIEW_COMMAND,
    last: latestReview(),
  };
}

/**
 * Review the git worktree with the CodeRabbit CLI.
 * The action stays available when the CLI or key is absent; the result explains how to connect it.
 */
export async function reviewRepository() {
  const root = gitRoot(process.cwd());
  const cli = await findCli();
  if (!cli) {
    const saved = saveReview({
      status: "unavailable",
      summary:
        "CodeRabbit CLI is not on PATH. Install it, set CODERABBIT_API_KEY to an Agentic API key, then run this review again.",
      output: `${REVIEW_COMMAND}\n# from ${root}`,
    });
    return saved;
  }

  const args = ["review", "--agent", "--light"];
  const key = process.env.CODERABBIT_API_KEY?.trim();
  if (key) args.push("--api-key", key);
  if (process.env.CODERABBIT_REGION?.trim()) {
    args.push("--region", process.env.CODERABBIT_REGION.trim());
  }

  try {
    const { stdout, stderr } = await exec(cli, args, {
      cwd: root,
      timeout: 90_000,
      windowsHide: true,
      maxBuffer: 2_000_000,
      env: process.env,
    });
    const output = `${stdout}\n${stderr}`.trim().slice(0, 12_000);
    const findings = output.match(/"findings"\s*:\s*(\d+)/);
    const saved = saveReview({
      status: "reviewed",
      summary: findings
        ? `CodeRabbit finished with ${findings[1]} findings.`
        : "CodeRabbit finished. The raw review is stored with this run.",
      output,
    });
    return saved;
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    const output = `${err.stdout ?? ""}\n${err.stderr ?? ""}\n${err.message ?? ""}`.trim().slice(0, 12_000);
    const unauthenticated = /auth|api key|unauthor/i.test(output);
    const saved = saveReview({
      status: err.killed ? "timeout" : unauthenticated ? "unauthenticated" : "error",
      summary: err.killed
        ? "CodeRabbit was still reviewing after 90 seconds. Run the same command in a terminal to let it finish."
        : unauthenticated
          ? "CodeRabbit is installed. Add CODERABBIT_API_KEY (an Agentic API key) and review again."
          : "CodeRabbit did not complete this review.",
      output,
    });
    return saved;
  }
}
