import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageShell } from "@/app/page-shell";
import { PageHeader } from "@/app/page-header";
import { Connections } from "./connections";

export default async function ConnectPage() {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <PageShell>
      <PageHeader title="Connections" />
      <Connections githubUsername={process.env.ALLOWED_GITHUB_USERNAME ?? ""} />
    </PageShell>
  );
}
