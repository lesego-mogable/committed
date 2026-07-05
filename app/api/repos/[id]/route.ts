import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getOctokitForUser } from "@/lib/github";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;

  const trackedRepo = await prisma.trackedRepo.findUnique({ where: { id } });
  if (!trackedRepo || trackedRepo.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (trackedRepo.webhookId) {
    const octokit = await getOctokitForUser(userId);
    try {
      await octokit.rest.repos.deleteWebhook({
        owner: trackedRepo.owner,
        repo: trackedRepo.name,
        hook_id: trackedRepo.webhookId,
      });
    } catch {
      // Webhook may already be gone (deleted manually on GitHub) — proceed to deactivate anyway.
    }
  }

  await prisma.trackedRepo.update({
    where: { id },
    data: { isActive: false, webhookId: null },
  });

  return NextResponse.json({ ok: true });
}
