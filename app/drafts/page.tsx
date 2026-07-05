import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageShell } from "@/app/page-shell";
import { PageHeader } from "@/app/page-header";
import { prisma } from "@/lib/prisma";
import { DraftList } from "./draft-list";

export default async function DraftsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const pendingCount = await prisma.draft.count({
    where: { userId: session.user.id, status: "pending" },
  });

  return (
    <PageShell>
      <PageHeader
        title="Drafts"
        badge={
          pendingCount > 0 ? (
            <span className="text-[10px] text-term-amber">{pendingCount} pending</span>
          ) : undefined
        }
      />
      <DraftList />
    </PageShell>
  );
}
