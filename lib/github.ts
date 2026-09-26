import type { PullRequestBrief, PullRequestFile, ReviewSignal } from "./types";

const PR_RE =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;

export function parsePullRequestUrl(input: string) {
  const match = input.trim().match(PR_RE);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: Number(match[3]) };
}

export async function fetchPullRequest(url: string): Promise<PullRequestBrief> {
  const parsed = parsePullRequestUrl(url);
  if (!parsed) {
    throw new Error("Paste a GitHub pull request URL.");
  }

  const { owner, repo, number } = parsed;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "verdict-jevathon",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const [prRes, filesRes, commentsRes, reviewsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, {
      headers,
      cache: "no-store",
    }),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files?per_page=20`,
      { headers, cache: "no-store" },
    ),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments?per_page=20`,
      { headers, cache: "no-store" },
    ),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews?per_page=20`,
      { headers, cache: "no-store" },
    ),
  ]);

  if (!prRes.ok) {
    throw new Error(
      `GitHub returned ${prRes.status}. Public PRs work without a token; private ones need GITHUB_TOKEN.`,
    );
  }

  const pr = await prRes.json();
  const filesJson = filesRes.ok ? await filesRes.json() : [];
  const commentsJson = commentsRes.ok ? await commentsRes.json() : [];
  const reviewsJson = reviewsRes.ok ? await reviewsRes.json() : [];

  const files: PullRequestFile[] = (filesJson as Array<Record<string, unknown>>)
    .slice(0, 12)
    .map((file) => ({
      filename: String(file.filename),
      status: String(file.status),
      additions: Number(file.additions ?? 0),
      deletions: Number(file.deletions ?? 0),
      patch: typeof file.patch === "string" ? file.patch.slice(0, 4000) : undefined,
    }));

  const reviews: ReviewSignal[] = [];
  for (const comment of commentsJson as Array<Record<string, unknown>>) {
    const login = String(
      (comment.user as { login?: string } | undefined)?.login ?? "unknown",
    );
    const body = String(comment.body ?? "");
    if (!body.trim()) continue;
    reviews.push({
      source: /coderabbit/i.test(login) || /coderabbit/i.test(body)
        ? "coderabbit"
        : "human",
      author: login,
      body: body.slice(0, 1200),
    });
  }
  for (const review of reviewsJson as Array<Record<string, unknown>>) {
    const login = String(
      (review.user as { login?: string } | undefined)?.login ?? "unknown",
    );
    const body = String(review.body ?? "");
    if (!body.trim()) continue;
    reviews.push({
      source: /coderabbit/i.test(login) ? "coderabbit" : "human",
      author: login,
      body: body.slice(0, 1200),
    });
  }

  return {
    url: pr.html_url ?? url,
    owner,
    repo,
    number,
    title: pr.title ?? "Untitled",
    body: String(pr.body ?? "").slice(0, 4000),
    author: pr.user?.login ?? "unknown",
    base: pr.base?.ref ?? "",
    head: pr.head?.ref ?? "",
    additions: Number(pr.additions ?? 0),
    deletions: Number(pr.deletions ?? 0),
    changedFiles: Number(pr.changed_files ?? files.length),
    draft: Boolean(pr.draft),
    files,
    reviews: reviews.slice(0, 8),
  };
}

export function toJevState(pr: PullRequestBrief) {
  return {
    pull_request: {
      title: pr.title,
      body: pr.body,
      author: pr.author,
      repo: `${pr.owner}/${pr.repo}`,
      number: pr.number,
      draft: pr.draft,
      base: pr.base,
      head: pr.head,
      stats: {
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changedFiles,
      },
    },
    files: pr.files.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
    })),
    review_signals: pr.reviews,
  };
}
