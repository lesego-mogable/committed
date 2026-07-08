import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getOctokitForUser, tryGetRepoContext, tryGetCommitCount, tryGetRecentCommits } from "@/lib/github";
import { generateIntroDraft } from "@/lib/ai/generateDraft";

const RECENT_COMMITS_SAMPLE_SIZE = 10;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;

  const trackedRepo = await prisma.trackedRepo.findUnique({ where: { id } });
  if (!trackedRepo || trackedRepo.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const octokit = await getOctokitForUser(userId);
  const [repoContext, commitCount, recentCommits] = await Promise.all([
    tryGetRepoContext(octokit, trackedRepo.owner, trackedRepo.name),
    tryGetCommitCount(octokit, trackedRepo.owner, trackedRepo.name),
    tryGetRecentCommits(octokit, trackedRepo.owner, trackedRepo.name, RECENT_COMMITS_SAMPLE_SIZE),
  ]);

  const { content, model } = await generateIntroDraft({
    repoFullName: trackedRepo.fullName,
    repoDescription: repoContext?.description,
    readmeExcerpt: repoContext?.readmeExcerpt,
    createdAt: repoContext?.createdAt,
    commitCount: commitCount ?? undefined,
    recentCommits,
  });

  const draft = await prisma.draft.create({
    data: {
      userId,
      trackedRepoId: trackedRepo.id,
      content,
      originalContent: content,
      aiModel: model,
      sourceRefs: {
        commits: recentCommits,
        isIntro: true,
        commitCount: commitCount ?? undefined,
        projectCreatedAt: repoContext?.createdAt,
      },
    },
  });

  return NextResponse.json({ draft: { id: draft.id } });
}
