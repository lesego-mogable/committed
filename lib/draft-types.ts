export type DraftSourceRefs = {
  commits?: { sha: string; message: string; url: string }[];
  compareUrl?: string;
  diffStats?: { filesChanged: number; additions: number; deletions: number };
  prTitle?: string;
  prUrl?: string;
};
