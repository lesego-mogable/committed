import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();

  const drafts = await prisma.draft.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
    include: { trackedRepo: { select: { fullName: true } } },
  });

  return NextResponse.json({ drafts });
}
