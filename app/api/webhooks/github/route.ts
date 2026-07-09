import { verify } from "@octokit/webhooks-methods";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getOctokitForUser, tryGetRepoContext } from "@/lib/github";
import { generateDraft, type DraftCommit } from "@/lib/ai/generateDraft";
import { estimateCostUsd } from "@/lib/usage";

export const maxDuration = 60;

type PushPayload = {
  ref: string;
  before: string;
  after: string;
  repository: { id: number; full_name: string; default_branch: string };
  compare: string;
  commits: { id: string; message: string; url: string }[];
};

type PullRequestPayload = {
  action: string;
  repository: { id: number; full_name: string };
  pull_request: {
    merged: boolean;
    title: string;
    body: string | null;
    html_url: string;
    merge_commit_sha: string | null;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  if (!signature || !event) {
    return new Response("Missing signature or event header", { status: 400 });
  }

  let repositoryId: number;
  try {
    repositoryId = (JSON.parse(rawBody) as { repository?: { id?: number } }).repository?.id ?? -1;
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const trackedRepo = await prisma.trackedRepo.findFirst({
    where: { githubRepoId: repositoryId, isActive: true },
  });

  if (!trackedRepo) {
    // Repo isn't tracked (or was untracked) — acknowledge and drop.
    return new Response("Repo not tracked", { status: 200 });
  }

  const secret = decrypt(trackedRepo.webhookSecret);
  const valid = await verify(secret, rawBody, signature);
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  if (event === "push") {
    await handlePush(payload as PushPayload, trackedRepo);
  } else if (event === "pull_request") {
    await handlePullRequest(payload as PullRequestPayload, trackedRepo);
  }

  return new Response("ok", { status: 200 });
}

async function handlePush(
  payload: PushPayload,
  trackedRepo: { id: string; userId: string; owner: string; name: string }
) {
  const expectedRef = `refs/heads/${payload.repository.default_branch}`;
  if (payload.ref !== expectedRef || payload.commits.length === 0) return;

  const commits: DraftCommit[] = payload.commits.map((c) => ({
    sha: c.id,
    message: c.message,
    url: c.url,
  }));

  const alreadyDrafted = await draftExistsForCommits(trackedRepo.id, commits);
  if (alreadyDrafted) return;

  const octokit = await getOctokitForUser(trackedRepo.userId);
  const [diffStats, repoContext] = await Promise.all([
    tryGetDiffStats(octokit, trackedRepo.owner, trackedRepo.name, payload.before, payload.after),
    tryGetRepoContext(octokit, trackedRepo.owner, trackedRepo.name),
  ]);

  const { content, model, usage } = await generateDraft({
    repoFullName: payload.repository.full_name,
    repoDescription: repoContext?.description,
    readmeExcerpt: repoContext?.readmeExcerpt,
    commits,
    compareUrl: payload.compare,
    diffStats: diffStats ?? undefined,
  });

  await prisma.draft.create({
    data: {
      userId: trackedRepo.userId,
      trackedRepoId: trackedRepo.id,
      content,
      originalContent: content,
      aiModel: model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUsd: estimateCostUsd(usage),
      sourceRefs: { commits, compareUrl: payload.compare, diffStats: diffStats ?? undefined },
    },
  });
}

async function handlePullRequest(
  payload: PullRequestPayload,
  trackedRepo: { id: string; userId: string; owner: string; name: string }
) {
  if (payload.action !== "closed" || !payload.pull_request.merged) return;

  const commits: DraftCommit[] = payload.pull_request.merge_commit_sha
    ? [
        {
          sha: payload.pull_request.merge_commit_sha,
          message: payload.pull_request.title,
          url: payload.pull_request.html_url,
        },
      ]
    : [];

  const octokit = await getOctokitForUser(trackedRepo.userId);
  const repoContext = await tryGetRepoContext(octokit, trackedRepo.owner, trackedRepo.name);

  const { content, model, usage } = await generateDraft({
    repoFullName: payload.repository.full_name,
    repoDescription: repoContext?.description,
    readmeExcerpt: repoContext?.readmeExcerpt,
    commits,
    prTitle: payload.pull_request.title,
    prBody: payload.pull_request.body ?? undefined,
  });

  await prisma.draft.create({
    data: {
      userId: trackedRepo.userId,
      trackedRepoId: trackedRepo.id,
      content,
      originalContent: content,
      aiModel: model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUsd: estimateCostUsd(usage),
      sourceRefs: { commits, prTitle: payload.pull_request.title, prUrl: payload.pull_request.html_url },
    },
  });
}

async function draftExistsForCommits(trackedRepoId: string, commits: DraftCommit[]): Promise<boolean> {
  const shas = commits.map((c) => c.sha).sort();
  const recentDrafts = await prisma.draft.findMany({
    where: { trackedRepoId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return recentDrafts.some((draft) => {
    const refs = draft.sourceRefs as { commits?: { sha: string }[] };
    const existingShas = (refs.commits ?? []).map((c) => c.sha).sort();
    return existingShas.length === shas.length && existingShas.every((sha, i) => sha === shas[i]);
  });
}

async function tryGetDiffStats(
  octokit: Awaited<ReturnType<typeof getOctokitForUser>>,
  owner: string,
  repo: string,
  before: string,
  after: string
): Promise<{ filesChanged: number; additions: number; deletions: number } | null> {
  try {
    const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${before}...${after}`,
    });
    return {
      filesChanged: data.files?.length ?? 0,
      additions: data.files?.reduce((sum, f) => sum + f.additions, 0) ?? 0,
      deletions: data.files?.reduce((sum, f) => sum + f.deletions, 0) ?? 0,
    };
  } catch {
    return null;
  }
}
