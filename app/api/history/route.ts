import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();

  const history = await prisma.postHistory.findMany({
    where: { draft: { userId } },
    orderBy: { postedAt: "desc" },
    include: { draft: { include: { trackedRepo: { select: { fullName: true } } } } },
  });

  return NextResponse.json({ history });
}
