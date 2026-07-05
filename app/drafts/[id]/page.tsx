import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageShell } from "@/app/page-shell";
import { DraftEditor } from "./draft-editor";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const { id } = await params;

  return (
    <PageShell>
      <DraftEditor draftId={id} />
    </PageShell>
  );
}
