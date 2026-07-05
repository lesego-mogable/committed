import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getOctokitForUser, webhookUrl } from "@/lib/github";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const userId = await requireUserId();
  const octokit = await getOctokitForUser(userId);

  const [ghRepos, tracked] = await Promise.all([
    octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      per_page: 100,
      affiliation: "owner",
    }),
    prisma.trackedRepo.findMany({ where: { userId } }),
  ]);

  const trackedByGithubId = new Map(tracked.map((r) => [r.githubRepoId, r]));

  const repos = ghRepos.map((repo) => ({
    githubRepoId: repo.id,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    pushedAt: repo.pushed_at,
    isTracked: trackedByGithubId.get(repo.id)?.isActive ?? false,
    trackedRepoId: trackedByGithubId.get(repo.id)?.id ?? null,
  }));

  return NextResponse.json({ repos });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  const body = await request.json();
  const { githubRepoId, owner, name, fullName } = body as {
    githubRepoId: number;
    owner: string;
    name: string;
    fullName: string;
  };

  if (!githubRepoId || !owner || !name || !fullName) {
    return NextResponse.json({ error: "Missing repo fields" }, { status: 400 });
  }

  const octokit = await getOctokitForUser(userId);
  const secret = randomBytes(32).toString("hex");

  const { data: hook } = await octokit.rest.repos.createWebhook({
    owner,
    repo: name,
    config: {
      url: webhookUrl(),
      content_type: "json",
      secret,
    },
    events: ["push", "pull_request"],
  });

  const trackedRepo = await prisma.trackedRepo.upsert({
    where: { userId_githubRepoId: { userId, githubRepoId } },
    update: {
      webhookId: hook.id,
      webhookSecret: encrypt(secret),
      isActive: true,
    },
    create: {
      userId,
      githubRepoId,
      owner,
      name,
      fullName,
      webhookId: hook.id,
      webhookSecret: encrypt(secret),
      isActive: true,
    },
  });

  return NextResponse.json({ trackedRepo: { id: trackedRepo.id } });
}
