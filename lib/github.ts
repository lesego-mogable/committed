import { Octokit } from "@octokit/rest";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function getOctokitForUser(userId: string): Promise<Octokit> {
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: "github" } },
  });
  if (!account) throw new Error("No connected GitHub account for user");
  return new Octokit({ auth: decrypt(account.accessToken) });
}

export function webhookUrl(): string {
  const base = process.env.NEXTAUTH_URL;
  if (!base) throw new Error("NEXTAUTH_URL is not set");
  return `${base}/api/webhooks/github`;
}
