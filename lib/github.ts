import { Octokit } from "@octokit/rest";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function getOctokitForUser(userId: string): Promise<Octokit> {
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: "github" } },
  });
  if (!account) throw new Error("No connected GitHub account for user");
  return new Octokit({ auth: decrypt(account.accessToken) });
}

export function webhookUrl(): string {
  const base = process.env.NEXTAUTH_URL;
  if (!base) throw new Error("NEXTAUTH_URL is not set");
  return `${base}/api/webhooks/github`;
}

const README_EXCERPT_MAX_CHARS = 3000;

export type RepoContext = { description?: string; readmeExcerpt?: string; createdAt?: string };

export async function tryGetRepoContext(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<RepoContext | null> {
  try {
    const [{ data: repoData }, readmeExcerpt] = await Promise.all([
      octokit.rest.repos.get({ owner, repo }),
      tryGetReadme(octokit, owner, repo),
    ]);
    return {
      description: repoData.description ?? undefined,
      readmeExcerpt,
      createdAt: repoData.created_at,
    };
  } catch {
    return null;
  }
}

async function tryGetReadme(octokit: Octokit, owner: string, repo: string): Promise<string | undefined> {
  try {
    const { data } = await octokit.rest.repos.getReadme({ owner, repo });
    const text = Buffer.from(data.content, "base64").toString("utf-8");
    return text.slice(0, README_EXCERPT_MAX_CHARS);
  } catch {
    return undefined;
  }
}

export async function tryGetCommitCount(octokit: Octokit, owner: string, repo: string): Promise<number | null> {
  try {
    const res = await octokit.rest.repos.listCommits({ owner, repo, per_page: 1 });
    const link = res.headers.link;
    const match = link?.match(/[?&]page=(\d+)>; rel="last"/);
    return match ? parseInt(match[1], 10) : res.data.length;
  } catch {
    return null;
  }
}

export type RecentCommit = { sha: string; message: string; url: string };

export async function tryGetRecentCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  count: number
): Promise<RecentCommit[]> {
  try {
    const { data } = await octokit.rest.repos.listCommits({ owner, repo, per_page: count });
    return data.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      url: c.html_url,
    }));
  } catch {
    return [];
  }
}
