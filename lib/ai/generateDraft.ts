import { AzureOpenAI } from "openai";
import type { CompletionUsage } from "openai/resources/completions";

const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT ?? "";

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
  deployment: DEPLOYMENT,
});

const SYSTEM_PROMPT = `You write concise, engaging LinkedIn posts summarizing a developer's recent work, based on their GitHub commit activity.
Rules:
- First-person voice, as if the developer wrote it themselves.
- 800-1200 characters.
- No corporate-speak, no excessive emoji, no hashtags anywhere in the post.
- Use the project description/README context to explain what the project actually is and where it currently stands, not just to list commit messages verbatim.
- Focus on what was built/fixed in this update, why it matters, and how it moves the project forward — as a snapshot of current progress, not a changelog.
- Output only the post text, nothing else.`;

export type DraftCommit = { sha: string; message: string; url: string };

export type DraftInput = {
  repoFullName: string;
  repoDescription?: string;
  readmeExcerpt?: string;
  commits: DraftCommit[];
  compareUrl?: string;
  diffStats?: { filesChanged: number; additions: number; deletions: number };
  prTitle?: string;
  prBody?: string;
};

export type TokenUsage = { promptTokens: number; completionTokens: number; totalTokens: number };

export type DraftResult = { content: string; model: string; usage: TokenUsage };

function toTokenUsage(usage: CompletionUsage | undefined): TokenUsage {
  return {
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
  };
}

export async function generateDraft(input: DraftInput): Promise<DraftResult> {
  const lines = [
    `Repository: ${input.repoFullName}`,
    input.repoDescription ? `Project description: ${input.repoDescription}` : null,
    input.readmeExcerpt ? `Project README (context on what this project is and its current state):\n${input.readmeExcerpt}` : null,
    input.prTitle ? `Pull request: ${input.prTitle}` : null,
    input.prBody ? `Pull request description: ${input.prBody}` : null,
    input.diffStats
      ? `Diff stats for this update: ${input.diffStats.filesChanged} files changed, +${input.diffStats.additions}/-${input.diffStats.deletions}`
      : null,
    "Commits in this update:",
    ...input.commits.map((c) => `- ${c.message}`),
  ].filter(Boolean);

  const completion = await client.chat.completions.create({
    model: DEPLOYMENT,
    max_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Using the project context and this update's changes below, write a LinkedIn post draft that situates the update within the bigger picture of the project.\n\n${lines.join("\n")}`,
      },
    ],
  });

  const content =
    completion.choices[0]?.message?.content ??
    "(The model did not return text — please write this post manually.)";

  return { content, model: DEPLOYMENT, usage: toTokenUsage(completion.usage) };
}

const INTRO_SYSTEM_PROMPT = `You write concise, engaging LinkedIn posts introducing a developer's existing side project to their network for the first time.
Rules:
- First-person voice, as if the developer wrote it themselves.
- 800-1200 characters.
- No corporate-speak, no excessive emoji, no hashtags anywhere in the post.
- Use the project description and README to explain what the project is, why it exists, and what it currently does — this is the reader's first introduction to it, so don't assume they know anything about it.
- Use the commit history/count/age to give a sense of how much work has gone into it and how mature it is, without reciting a changelog.
- Output only the post text, nothing else.`;

export type IntroDraftInput = {
  repoFullName: string;
  repoDescription?: string;
  readmeExcerpt?: string;
  createdAt?: string;
  commitCount?: number;
  recentCommits: DraftCommit[];
};

export async function generateIntroDraft(input: IntroDraftInput): Promise<DraftResult> {
  const lines = [
    `Repository: ${input.repoFullName}`,
    input.repoDescription ? `Project description: ${input.repoDescription}` : null,
    input.readmeExcerpt ? `Project README:\n${input.readmeExcerpt}` : null,
    input.createdAt ? `Project started: ${input.createdAt}` : null,
    input.commitCount ? `Total commits to date: ${input.commitCount}` : null,
    "Recent commits (for a sense of current focus, not a full history):",
    ...input.recentCommits.map((c) => `- ${c.message}`),
  ].filter(Boolean);

  const completion = await client.chat.completions.create({
    model: DEPLOYMENT,
    max_tokens: 1024,
    messages: [
      { role: "system", content: INTRO_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Write a LinkedIn post introducing this existing project to my network for the first time, using the context below.\n\n${lines.join("\n")}`,
      },
    ],
  });

  const content =
    completion.choices[0]?.message?.content ??
    "(The model did not return text — please write this post manually.)";

  return { content, model: DEPLOYMENT, usage: toTokenUsage(completion.usage) };
}
