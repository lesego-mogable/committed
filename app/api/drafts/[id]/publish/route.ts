import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { decrypt } from "@/lib/crypto";
import { createLinkedinPost } from "@/lib/linkedin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;

  const draft = await prisma.draft.findUnique({ where: { id } });
  if (!draft || draft.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (draft.status !== "pending") {
    return NextResponse.json({ error: "Draft is no longer pending" }, { status: 409 });
  }

  const linkedinAccount = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: "linkedin" } },
  });
  if (!linkedinAccount) {
    return NextResponse.json({ error: "LinkedIn account not connected" }, { status: 400 });
  }

  let postUrn: string;
  try {
    postUrn = await createLinkedinPost(
      decrypt(linkedinAccount.accessToken),
      linkedinAccount.providerUserId,
      draft.content
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  const [, updatedDraft] = await prisma.$transaction([
    prisma.postHistory.create({
      data: { draftId: draft.id, linkedinPostUrn: postUrn, finalContent: draft.content },
    }),
    prisma.draft.update({ where: { id: draft.id }, data: { status: "posted" } }),
  ]);

  return NextResponse.json({ draft: updatedDraft, linkedinPostUrn: postUrn });
}
