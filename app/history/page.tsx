import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageShell } from "@/app/page-shell";
import { PageHeader } from "@/app/page-header";
import { HistoryList } from "./history-list";

export default async function HistoryPage() {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <PageShell>
      <PageHeader title="History" />
      <HistoryList />
    </PageShell>
  );
}
