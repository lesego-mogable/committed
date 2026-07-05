"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { relativeTimeAgo } from "@/lib/format";

type Draft = {
  id: string;
  content: string;
  createdAt: string;
  trackedRepo: { fullName: string };
};

async function fetchDrafts(): Promise<Draft[]> {
  const res = await fetch("/api/drafts");
  if (!res.ok) throw new Error("Failed to load drafts");
  const data = await res.json();
  return data.drafts;
}

export function DraftList() {
  const { data: drafts, isLoading, error } = useQuery({
    queryKey: ["drafts"],
    queryFn: fetchDrafts,
  });

  if (isLoading) return <p className="px-5 py-4 text-[11px] text-term-text-muted">loading…</p>;
  if (error)
    return <p className="px-5 py-4 text-[11px] text-term-red">{(error as Error).message}</p>;
  if (!drafts?.length)
    return <p className="px-5 py-4 text-[11px] text-term-text-muted">no pending drafts</p>;

  return (
    <div>
      {drafts.map((draft) => (
        <Link
          key={draft.id}
          href={`/drafts/${draft.id}`}
          className="group flex items-start gap-2.5 border-b border-term-border-3 px-5 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[12px] text-term-text-primary">
                {draft.trackedRepo.fullName}
              </span>
              <span className="text-[10px] text-term-text-meta">{relativeTimeAgo(draft.createdAt)}</span>
              <span className="font-medium text-[10px] text-term-amber">[pending]</span>
            </div>
            <p className="m-0 overflow-hidden text-[11px] leading-[1.5] text-term-text-body [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {draft.content}
            </p>
          </div>
          <span className="flex-shrink-0 text-[12px] text-term-text-faint transition-colors group-hover:text-term-accent">
            →
          </span>
        </Link>
      ))}
    </div>
  );
}
