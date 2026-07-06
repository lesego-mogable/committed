# Committed

Turn your GitHub commits and merged PRs into LinkedIn posts — drafted by AI, reviewed and approved by you before anything goes live.

**Live app:** [committed-sable.vercel.app](https://committed-sable.vercel.app)

## How it works

1. Sign in with GitHub and pick which repos to track.
2. Tracking a repo registers a real GitHub webhook (push + merged PR events).
3. When you push or merge, Committed pulls the commit messages, diff stats, and PR context, and asks an LLM to draft a LinkedIn post summarizing the work.
4. The draft shows up in your dashboard — edit it, reject it, or approve it to publish straight to your LinkedIn profile.
5. Every published post is logged in your history with a link back to LinkedIn.

Nothing is ever posted without you clicking **Approve & Post**.

## Features

- **GitHub OAuth login**, gated to a single allowed username (this is a personal, single-user tool)
- **Repo tracking** with per-repo webhook registration/deregistration
- **AI-drafted posts** via Azure OpenAI, generated from commit messages, diff stats, and PR titles/descriptions
- **Review dashboard** — edit drafts inline, see commit context (PR info, commit list, +/- diff stats) alongside the editor
- **LinkedIn OAuth** (separate from GitHub login) with connect/disconnect
- **Publish to LinkedIn** via LinkedIn's Posts API, with a full post history
- Idempotent draft generation (won't create duplicate drafts for the same set of commits)
- All GitHub/LinkedIn tokens and webhook secrets encrypted at rest (AES-256-GCM)

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js (Auth.js) v5, GitHub OAuth provider |
| Database | PostgreSQL via Prisma 7 ([Neon](https://neon.tech) in production, local via Docker Compose) |
| Server state | TanStack Query |
| GitHub API | Octokit |
| AI drafting | Azure OpenAI (via the `openai` SDK's `AzureOpenAI` client) |
| LinkedIn | OAuth 2.0 + LinkedIn Posts API (`api.linkedin.com/rest/posts`) |
| Deployment | Vercel |

## Getting started (local development)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start local Postgres**

   ```bash
   docker compose up -d
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in the values. See the comments in that file for where to get each one:

   ```bash
   cp .env.example .env
   ```

   You'll need:
   - A **GitHub OAuth App** (github.com/settings/developers) with callback URL `http://localhost:3210/api/auth/callback/github`
   - A **LinkedIn App** (linkedin.com/developers) with "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn" products, redirect URL `http://localhost:3210/api/auth/linkedin/callback`
   - An **Azure OpenAI** resource with a chat-capable model deployed
   - A generated `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` (`openssl rand -base64 32`, one each)

4. **Run the database migration**

   ```bash
   npx prisma migrate deploy
   ```

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   The app runs on a fixed port, `http://localhost:3210` (see `package.json`).

## Testing the webhook locally

GitHub can't deliver webhooks to `localhost`. To test the full push → draft flow locally, tunnel your dev server (e.g. with `ngrok http 3210`) and set `NEXTAUTH_URL` to the tunnel URL before tracking a repo, so the webhook is registered against a reachable address.

## Deployment

The app is deployed on Vercel with Postgres on Neon (provisioned via the Vercel Marketplace integration, which sets `DATABASE_URL` automatically). All other secrets from `.env.example` need to be set in the Vercel project's environment variables. On push to `main`, `postinstall` runs `prisma generate` automatically as part of the build.

## Project structure

```
app/
  api/              route handlers (auth, webhooks, repos, drafts, history, connections)
  drafts/           drafts list + editor pages
  repos/            repo tracking page
  history/          post history page
  connect/          GitHub/LinkedIn connection status
lib/
  ai/generateDraft.ts   Azure OpenAI drafting
  github.ts             Octokit helper
  linkedin.ts           LinkedIn OAuth + Posts API
  crypto.ts             AES-256-GCM encryption for stored secrets
  prisma.ts             Prisma client (driver adapter for Postgres)
prisma/schema.prisma    User, ConnectedAccount, TrackedRepo, Draft, PostHistory
```

<!-- webhook test: repo-context draft -->
