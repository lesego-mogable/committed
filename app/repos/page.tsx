import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageShell } from "@/app/page-shell";
import { PageHeader } from "@/app/page-header";
import { RepoList } from "./repo-list";

export default async function ReposPage() {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <PageShell>
      <PageHeader title="Repositories" subtitle="— track to generate drafts" />
      <RepoList />
    </PageShell>
  );
}
