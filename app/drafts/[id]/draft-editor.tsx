"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { relativeTimeAgo, formatMonthDay } from "@/lib/format";
import type { DraftSourceRefs } from "@/lib/draft-types";

const MAX_LENGTH = 3000;

type Draft = {
  id: string;
  content: string;
  status: "pending" | "approved" | "posted" | "rejected";
  createdAt: string;
  sourceRefs: DraftSourceRefs;
  trackedRepo: { fullName: string };
};

async function fetchDraft(id: string): Promise<Draft> {
  const res = await fetch(`/api/drafts/${id}`);
  if (!res.ok) throw new Error("Failed to load draft");
  const data = await res.json();
  return data.draft;
}

function prNumberFromUrl(url?: string): string | null {
  const match = url?.match(/\/pull\/(\d+)/);
  return match ? match[1] : null;
}

export function DraftEditor({ draftId }: { draftId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: draft, isLoading, error } = useQuery({
    queryKey: ["draft", draftId],
    queryFn: () => fetchDraft(draftId),
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const save = useMutation({
    mutationFn: async () => {
      const content = textareaRef.current?.value ?? "";
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save draft");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["draft", draftId] }),
  });

  const reject = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error("Failed to reject draft");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      router.push("/drafts");
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      const res = await fetch(`/api/drafts/${draftId}/publish`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to publish draft");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      router.push("/history");
    },
    onError: (e) => setActionError((e as Error).message),
  });

  if (isLoading) return <p className="px-5 py-4 text-[11px] text-term-text-muted">loading…</p>;
  if (error || !draft)
    return (
      <p className="px-5 py-4 text-[11px] text-term-red">
        {(error as Error)?.message ?? "Not found"}
      </p>
    );

  const refs = draft.sourceRefs;
  const commits = refs.commits ?? [];
  const prNumber = prNumberFromUrl(refs.prUrl);
  const contextLabel = refs.isIntro ? "intro post" : prNumber ? `pr#${prNumber}` : `${commits.length} commits`;

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-term-border px-5 py-3">
        <Link
          href="/drafts"
          className="text-[10px] text-term-text-muted transition-colors hover:text-term-text-primary"
        >
          ← drafts
        </Link>
        <span className="text-term-text-dim">/</span>
        <span className="font-semibold text-[12px] text-term-text-primary">{draft.trackedRepo.fullName}</span>
        <span className="text-[10px] text-term-text-meta">
          {contextLabel} · {relativeTimeAgo(draft.createdAt)}
          {!refs.isIntro && !prNumber && ` · ${commits.length} commits`}
        </span>
      </div>

      <div className="flex items-start gap-4 px-5 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <textarea
            key={draft.id}
            ref={textareaRef}
            defaultValue={draft.content}
            onChange={(e) => setCharCount(e.target.value.length)}
            rows={9}
            className="box-border w-full resize-y border border-term-border-4 bg-term-bg-2 p-2.5 text-[11.5px] leading-[1.7] text-term-text-primary outline-none transition-colors focus:border-term-accent/60"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-term-text-meta">
              {charCount || draft.content.length} / {MAX_LENGTH}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="border border-term-border-5 px-3 py-1 font-medium text-[10px] tracking-[0.04em] text-term-text-muted transition-colors disabled:opacity-40 enabled:hover:border-term-text-muted enabled:hover:text-term-text-primary"
              >
                [ save ]
              </button>
              <button
                type="button"
                onClick={() => reject.mutate()}
                disabled={reject.isPending || draft.status !== "pending"}
                className="border border-term-red-2/40 px-3 py-1 font-medium text-[10px] tracking-[0.04em] text-term-red transition-colors disabled:opacity-40 enabled:hover:border-term-red-2 enabled:hover:bg-term-red-2/10"
              >
                [ reject ]
              </button>
              <button
                type="button"
                onClick={() => publish.mutate()}
                disabled={publish.isPending || draft.status !== "pending"}
                className="border border-term-accent/50 bg-term-accent-bg px-3 py-1 font-bold text-[10px] tracking-[0.04em] text-term-accent transition-colors disabled:opacity-40 enabled:hover:border-term-accent enabled:hover:bg-term-accent/25"
              >
                [ APPROVE &amp; POST ]
              </button>
            </div>
          </div>
          {actionError && <p className="text-[11px] text-term-red">{actionError}</p>}
        </div>

        <div className="w-[210px] flex-shrink-0 border border-term-border-2 p-3">
          <div className="mb-2 font-semibold text-[9px] uppercase tracking-[0.1em] text-term-text-faint">
            context
          </div>
          {refs.isIntro ? (
            <>
              <div className="mb-0.5 font-medium text-[11px] text-term-text-secondary">Project introduction</div>
              <div className="mb-2.5 text-[10px] leading-[1.4] text-term-text-body">
                {refs.commitCount !== undefined && `${refs.commitCount} commits total`}
                {refs.commitCount !== undefined && refs.projectCreatedAt && " · "}
                {refs.projectCreatedAt && `started ${formatMonthDay(refs.projectCreatedAt)}`}
              </div>
            </>
          ) : prNumber ? (
            <>
              <div className="mb-0.5 font-medium text-[11px] text-term-text-secondary">
                Merged PR #{prNumber}
              </div>
              <div className="mb-2.5 text-[10px] leading-[1.4] text-term-text-body">{refs.prTitle}</div>
            </>
          ) : null}
          {commits.length > 0 && (
            <div className="mb-2 border-t border-term-border pt-2">
              <div className="mb-1.5 text-[10px] text-term-text-meta">
                {refs.isIntro ? "recent commits" : `${commits.length} commits`}
              </div>
              <div className="flex flex-col gap-0.5">
                {commits.slice(0, 3).map((c) => (
                  <div key={c.sha} className="text-[10px] text-term-text-body">
                    {c.sha.slice(0, 7)} {c.message.split("\n")[0]}
                  </div>
                ))}
                {commits.length > 3 && (
                  <div className="text-[10px] text-term-text-faint">+{commits.length - 3} more</div>
                )}
              </div>
            </div>
          )}
          {refs.diffStats && (
            <div className="border-t border-term-border pt-2 text-[10px]">
              <span className="text-term-green">+{refs.diffStats.additions}</span>{" "}
              <span className="text-term-red">-{refs.diffStats.deletions}</span>
              <span className="text-term-text-meta"> in {refs.diffStats.filesChanged} files</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
