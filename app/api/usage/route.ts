import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { usdToZar } from "@/lib/usage";

type Kind = "push" | "pr" | "intro";

function kindOf(sourceRefs: unknown): Kind {
  const refs = sourceRefs as { isIntro?: boolean; prUrl?: string } | null;
  if (refs?.isIntro) return "intro";
  if (refs?.prUrl) return "pr";
  return "push";
}

export async function GET() {
  const userId = await requireUserId();

  const drafts = await prisma.draft.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      costUsd: true,
      sourceRefs: true,
      trackedRepo: { select: { fullName: true } },
    },
  });

  const totals = drafts.reduce(
    (acc, d) => {
      acc.count += 1;
      acc.promptTokens += d.promptTokens ?? 0;
      acc.completionTokens += d.completionTokens ?? 0;
      acc.totalTokens += d.totalTokens ?? 0;
      acc.costUsd += d.costUsd ?? 0;
      return acc;
    },
    { count: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 }
  );

  const byRepo = new Map<string, { repoFullName: string; count: number; totalTokens: number; costUsd: number }>();
  const byKind = new Map<Kind, { kind: Kind; count: number; totalTokens: number; costUsd: number }>();
  const byStatus = new Map<string, { status: string; count: number; costUsd: number }>();
  const byDay = new Map<string, { date: string; count: number; totalTokens: number; costUsd: number }>();

  for (const d of drafts) {
    const repoFullName = d.trackedRepo.fullName;
    const repoEntry = byRepo.get(repoFullName) ?? { repoFullName, count: 0, totalTokens: 0, costUsd: 0 };
    repoEntry.count += 1;
    repoEntry.totalTokens += d.totalTokens ?? 0;
    repoEntry.costUsd += d.costUsd ?? 0;
    byRepo.set(repoFullName, repoEntry);

    const kind = kindOf(d.sourceRefs);
    const kindEntry = byKind.get(kind) ?? { kind, count: 0, totalTokens: 0, costUsd: 0 };
    kindEntry.count += 1;
    kindEntry.totalTokens += d.totalTokens ?? 0;
    kindEntry.costUsd += d.costUsd ?? 0;
    byKind.set(kind, kindEntry);

    const statusEntry = byStatus.get(d.status) ?? { status: d.status, count: 0, costUsd: 0 };
    statusEntry.count += 1;
    statusEntry.costUsd += d.costUsd ?? 0;
    byStatus.set(d.status, statusEntry);

    const date = d.createdAt.toISOString().slice(0, 10);
    const dayEntry = byDay.get(date) ?? { date, count: 0, totalTokens: 0, costUsd: 0 };
    dayEntry.count += 1;
    dayEntry.totalTokens += d.totalTokens ?? 0;
    dayEntry.costUsd += d.costUsd ?? 0;
    byDay.set(date, dayEntry);
  }

  const withZar = <T extends { costUsd: number }>(row: T) => ({ ...row, costZar: usdToZar(row.costUsd) });

  return NextResponse.json({
    totals: withZar(totals),
    byRepo: [...byRepo.values()].sort((a, b) => b.costUsd - a.costUsd).map(withZar),
    byKind: [...byKind.values()].map(withZar),
    byStatus: [...byStatus.values()].map(withZar),
    daily: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map(withZar),
    recent: drafts.slice(0, 20).map((d) => ({
      id: d.id,
      repoFullName: d.trackedRepo.fullName,
      kind: kindOf(d.sourceRefs),
      status: d.status,
      createdAt: d.createdAt,
      totalTokens: d.totalTokens ?? 0,
      costZar: usdToZar(d.costUsd ?? 0),
    })),
    pricingConfigured:
      Number(process.env.AZURE_OPENAI_INPUT_PRICE_PER_1M_USD ?? 0) > 0 ||
      Number(process.env.AZURE_OPENAI_OUTPUT_PRICE_PER_1M_USD ?? 0) > 0,
  });
}
