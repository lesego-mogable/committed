import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;

  const draft = await prisma.draft.findUnique({
    where: { id },
    include: { trackedRepo: { select: { fullName: true } } },
  });

  if (!draft || draft.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ draft });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await request.json();

  const draft = await prisma.draft.findUnique({ where: { id } });
  if (!draft || draft.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (draft.status !== "pending") {
    return NextResponse.json({ error: "Draft is no longer pending" }, { status: 409 });
  }

  const { content, status } = body as { content?: string; status?: "rejected" };

  const updated = await prisma.draft.update({
    where: { id },
    data: {
      ...(content !== undefined ? { content } : {}),
      ...(status === "rejected" ? { status: "rejected" } : {}),
    },
  });

  return NextResponse.json({ draft: updated });
}
