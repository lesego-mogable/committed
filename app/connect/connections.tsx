"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const GITHUB_ICON = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="#6b6b6b">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

type Connections = { linkedin: { connected: boolean } };

async function fetchConnections(): Promise<Connections> {
  const res = await fetch("/api/connections");
  if (!res.ok) throw new Error("Failed to load connections");
  return res.json();
}

export function Connections({ githubUsername }: { githubUsername: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["connections"],
    queryFn: fetchConnections,
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/connections/linkedin", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect LinkedIn");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });

  return (
    <div className="px-5 py-4">
      <div className="mb-2 flex items-center gap-3 border border-term-border-2 p-3">
        <a
          href={`https://github.com/${githubUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 opacity-100 transition-opacity hover:opacity-70"
          title={`View @${githubUsername} on GitHub`}
        >
          {GITHUB_ICON}
        </a>
        <div className="flex-1">
          <div className="mb-0.5 font-semibold text-[12px] text-term-text-primary">github</div>
          <div className="text-[10px] text-term-text-body">@{githubUsername} · sign-in provider</div>
        </div>
        <span className="font-bold text-[10px] text-term-green">[connected]</span>
      </div>

      <div className="flex items-center gap-3 border border-term-border-2 p-3">
        {data?.linkedin.connected ? (
          <a
            href="https://www.linkedin.com/in/me"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center bg-[#0a66c2] font-bold text-[10px] leading-none text-white opacity-100 transition-opacity hover:opacity-70"
            title="View your LinkedIn profile"
          >
            in
          </a>
        ) : (
          <div className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center bg-[#0a66c2] font-bold text-[10px] leading-none text-white">
            in
          </div>
        )}
        <div className="flex-1">
          <div className="mb-0.5 font-semibold text-[12px] text-term-text-primary">linkedin</div>
          <div className="text-[10px] text-term-text-body">
            {isLoading
              ? "checking…"
              : error
                ? "error checking status"
                : data?.linkedin.connected
                  ? "connected"
                  : "not connected"}
          </div>
        </div>
        {data?.linkedin.connected ? (
          <button
            type="button"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="border border-term-border-5 px-2 py-0.5 font-medium text-[10px] tracking-[0.04em] text-term-text-muted transition-colors disabled:opacity-40 enabled:hover:border-term-red-2 enabled:hover:text-term-red"
          >
            [ disconnect ]
          </button>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- server route that issues a redirect, not a page */}
            <a
              href="/api/auth/linkedin"
              className="border border-term-accent/40 bg-term-accent-bg px-2 py-0.5 font-bold text-[10px] tracking-[0.04em] text-term-accent transition-colors hover:border-term-accent hover:bg-term-accent/25"
            >
              [ connect ]
            </a>
          </>
        )}
      </div>
    </div>
  );
}
