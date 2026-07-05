import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  const linkedin = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: "linkedin" } },
    select: { tokenExpiresAt: true },
  });

  return NextResponse.json({ linkedin: linkedin ? { connected: true } : { connected: false } });
}
