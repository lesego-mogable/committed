"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { relativeTimeCompact } from "@/lib/format";

type Repo = {
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  pushedAt: string | null;
  isTracked: boolean;
  trackedRepoId: string | null;
};

async function fetchRepos(): Promise<Repo[]> {
  const res = await fetch("/api/repos");
  if (!res.ok) throw new Error("Failed to load repos");
  const data = await res.json();
  return data.repos;
}

export function RepoList() {
  const queryClient = useQueryClient();
  const { data: repos, isLoading, error } = useQuery({
    queryKey: ["repos"],
    queryFn: fetchRepos,
  });

  const track = useMutation({
    mutationFn: async (repo: Repo) => {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubRepoId: repo.githubRepoId,
          owner: repo.owner,
          name: repo.name,
          fullName: repo.fullName,
        }),
      });
      if (!res.ok) throw new Error("Failed to track repo");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repos"] }),
  });

  const untrack = useMutation({
    mutationFn: async (trackedRepoId: string) => {
      const res = await fetch(`/api/repos/${trackedRepoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to untrack repo");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repos"] }),
  });

  if (isLoading) return <p className="px-5 py-4 text-[11px] text-term-text-muted">loading…</p>;
  if (error)
    return <p className="px-5 py-4 text-[11px] text-term-red">{(error as Error).message}</p>;

  return (
    <div>
      <div className="flex border-b border-term-border-3 px-5 py-1.5">
        <span className="flex-1 text-[10px] font-medium tracking-[0.08em] text-term-text-faint">
          REPOSITORY
        </span>
        <span className="w-[70px] text-[10px] font-medium tracking-[0.08em] text-term-text-faint">
          VIS
        </span>
        <span className="w-[100px] text-right text-[10px] font-medium tracking-[0.08em] text-term-text-faint">
          STATUS
        </span>
      </div>
      {repos?.map((repo) => (
        <div
          key={repo.githubRepoId}
          className="flex items-center border-b border-term-border-3 px-5 py-2 transition-colors last:border-b-0 hover:bg-white/[0.03]"
        >
          <div className="flex-1">
            <span className="font-medium text-[12px] text-term-text-primary">{repo.fullName}</span>
            {repo.pushedAt && (
              <span className="ml-2.5 text-[10px] text-term-text-meta">
                {relativeTimeCompact(repo.pushedAt)}
              </span>
            )}
          </div>
          <div className="w-[70px] text-[10px] text-term-text-muted">
            {repo.private ? "priv" : "pub"}
          </div>
          <div className="w-[100px] text-right">
            {repo.isTracked ? (
              <button
                type="button"
                disabled={untrack.isPending}
                onClick={() => repo.trackedRepoId && untrack.mutate(repo.trackedRepoId)}
                className="border border-term-accent/40 bg-term-accent-bg px-2 py-0.5 font-bold text-[10px] tracking-[0.04em] text-term-accent transition-colors hover:border-term-accent hover:bg-term-accent/20"
              >
                [ TRACKING ]
              </button>
            ) : (
              <button
                type="button"
                disabled={track.isPending}
                onClick={() => track.mutate(repo)}
                className="border border-term-border-6 px-2 py-0.5 font-medium text-[10px] tracking-[0.04em] text-term-text-muted transition-colors hover:border-term-text-muted hover:text-term-text-primary"
              >
                [ track ]
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
