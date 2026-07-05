import { AzureOpenAI } from "openai";

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
- No corporate-speak, no excessive emoji, no hashtag spam (0-4 relevant hashtags at most, at the end).
- Focus on what was built/fixed and why it matters, not a literal list of commit messages.
- Output only the post text, nothing else.`;

export type DraftCommit = { sha: string; message: string; url: string };

export type DraftInput = {
  repoFullName: string;
  commits: DraftCommit[];
  compareUrl?: string;
  diffStats?: { filesChanged: number; additions: number; deletions: number };
  prTitle?: string;
  prBody?: string;
};

export type DraftResult = { content: string; model: string };

export async function generateDraft(input: DraftInput): Promise<DraftResult> {
  const lines = [
    `Repository: ${input.repoFullName}`,
    input.prTitle ? `Pull request: ${input.prTitle}` : null,
    input.prBody ? `Pull request description: ${input.prBody}` : null,
    input.diffStats
      ? `Diff stats: ${input.diffStats.filesChanged} files changed, +${input.diffStats.additions}/-${input.diffStats.deletions}`
      : null,
    "Commits:",
    ...input.commits.map((c) => `- ${c.message}`),
  ].filter(Boolean);

  const completion = await client.chat.completions.create({
    model: DEPLOYMENT,
    max_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Summarize the work described below into a LinkedIn post draft.\n\n${lines.join("\n")}`,
      },
    ],
  });

  const content =
    completion.choices[0]?.message?.content ??
    "(The model did not return text — please write this post manually.)";

  return { content, model: DEPLOYMENT };
}
