import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import type { GitHubProfile } from "@auth/core/providers/github";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: { scope: "read:user repo admin:repo_hook" },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const githubProfile = profile as unknown as GitHubProfile | undefined;
      const allowed = process.env.ALLOWED_GITHUB_USERNAME;
      return !!allowed && githubProfile?.login?.toLowerCase() === allowed.toLowerCase();
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const githubProfile = profile as unknown as GitHubProfile;
        const email = githubProfile.email ?? `${githubProfile.login}@users.noreply.github.com`;

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email },
        });

        if (account.access_token) {
          await prisma.connectedAccount.upsert({
            where: { userId_provider: { userId: user.id, provider: "github" } },
            update: {
              providerUserId: String(githubProfile.id),
              accessToken: encrypt(account.access_token),
              scope: account.scope ?? null,
            },
            create: {
              userId: user.id,
              provider: "github",
              providerUserId: String(githubProfile.id),
              accessToken: encrypt(account.access_token),
              scope: account.scope ?? null,
            },
          });
        }

        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
