"use client";

import { useQuery } from "@tanstack/react-query";
import { formatMonthDay } from "@/lib/format";

type HistoryEntry = {
  id: string;
  linkedinPostUrn: string;
  postedAt: string;
  finalContent: string;
  draft: { trackedRepo: { fullName: string } };
};

async function fetchHistory(): Promise<HistoryEntry[]> {
  const res = await fetch("/api/history");
  if (!res.ok) throw new Error("Failed to load history");
  const data = await res.json();
  return data.history;
}

export function HistoryList() {
  const { data: history, isLoading, error } = useQuery({
    queryKey: ["history"],
    queryFn: fetchHistory,
  });

  if (isLoading) return <p className="px-5 py-4 text-[11px] text-term-text-muted">loading…</p>;
  if (error)
    return <p className="px-5 py-4 text-[11px] text-term-red">{(error as Error).message}</p>;
  if (!history?.length)
    return <p className="px-5 py-4 text-[11px] text-term-text-muted">no posts yet</p>;

  return (
    <div>
      {history.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2.5 border-b border-term-border-3 px-5 py-2 transition-colors last:border-b-0 hover:bg-white/[0.03]"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="font-semibold text-[11.5px] text-term-text-primary">
                {entry.draft.trackedRepo.fullName}
              </span>
              <span className="font-medium text-[10px] text-term-green">[posted]</span>
            </div>
            <p className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10.5px] leading-[1.4] text-term-text-body">
              {entry.finalContent}
            </p>
          </div>
          <span className="flex-shrink-0 whitespace-nowrap text-[10px] text-term-text-meta">
            {formatMonthDay(entry.postedAt)}
          </span>
          <a
            href={`https://www.linkedin.com/feed/update/${entry.linkedinPostUrn}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 whitespace-nowrap text-[10px] font-medium text-term-accent underline-offset-2 hover:underline"
          >
            [view]
          </a>
        </div>
      ))}
    </div>
  );
}
