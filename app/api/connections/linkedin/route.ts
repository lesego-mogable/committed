import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function DELETE() {
  const userId = await requireUserId();

  await prisma.connectedAccount.deleteMany({
    where: { userId, provider: "linkedin" },
  });

  return NextResponse.json({ ok: true });
}
