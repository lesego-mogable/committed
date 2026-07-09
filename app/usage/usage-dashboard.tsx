"use client";

import { useQuery } from "@tanstack/react-query";
import { formatMonthDay } from "@/lib/format";

type Totals = { count: number; promptTokens: number; completionTokens: number; totalTokens: number; costUsd: number; costZar: number };
type RepoRow = { repoFullName: string; count: number; totalTokens: number; costUsd: number; costZar: number };
type KindRow = { kind: "push" | "pr" | "intro"; count: number; totalTokens: number; costUsd: number; costZar: number };
type StatusRow = { status: string; count: number; costUsd: number; costZar: number };
type DayRow = { date: string; count: number; totalTokens: number; costUsd: number; costZar: number };
type RecentRow = {
  id: string;
  repoFullName: string;
  kind: "push" | "pr" | "intro";
  status: string;
  createdAt: string;
  totalTokens: number;
  costZar: number;
};

type UsageData = {
  totals: Totals;
  byRepo: RepoRow[];
  byKind: KindRow[];
  byStatus: StatusRow[];
  daily: DayRow[];
  recent: RecentRow[];
  pricingConfigured: boolean;
};

async function fetchUsage(): Promise<UsageData> {
  const res = await fetch("/api/usage");
  if (!res.ok) throw new Error("Failed to load usage");
  return res.json();
}

function formatRand(zar: number): string {
  return `R${zar.toFixed(zar < 10 ? 3 : 2)}`;
}

function formatTokens(tokens: number): string {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
}

export function UsageDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ["usage"], queryFn: fetchUsage });

  if (isLoading) return <p className="px-5 py-4 text-[11px] text-term-text-muted">loading…</p>;
  if (error || !data)
    return <p className="px-5 py-4 text-[11px] text-term-red">{(error as Error)?.message ?? "Failed to load"}</p>;

  const { totals, byRepo, byKind, byStatus, daily, recent, pricingConfigured } = data;
  const maxDailyCost = Math.max(...daily.map((d) => d.costZar), 0.0001);

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      {!pricingConfigured && (
        <p className="border border-term-amber/30 bg-term-amber/[0.06] px-3 py-2 text-[10.5px] leading-[1.4] text-term-amber">
          Pricing isn&apos;t configured — set AZURE_OPENAI_INPUT_PRICE_PER_1M_USD and
          AZURE_OPENAI_OUTPUT_PRICE_PER_1M_USD to see real cost estimates. Token counts below are accurate regardless.
        </p>
      )}

      <div className="grid grid-cols-4 gap-2.5">
        <StatCard label="drafts generated" value={String(totals.count)} />
        <StatCard label="total tokens" value={formatTokens(totals.totalTokens)} />
        <StatCard label="est. cost" value={formatRand(totals.costZar)} sub={`$${totals.costUsd.toFixed(4)}`} />
        <StatCard
          label="avg / draft"
          value={totals.count ? formatRand(totals.costZar / totals.count) : "R0"}
        />
      </div>

      <Section title="last 30 days">
        <div className="flex items-end gap-[3px] px-1 pt-2" style={{ height: 60 }}>
          {daily.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} drafts, ${formatRand(d.costZar)}`}
              className="flex-1 bg-term-accent/50 transition-colors hover:bg-term-accent"
              style={{ height: `${Math.max((d.costZar / maxDailyCost) * 100, 3)}%` }}
            />
          ))}
          {daily.length === 0 && <span className="text-[10px] text-term-text-muted">no data yet</span>}
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-4">
        <Section title="by repository">
          <Table
            rows={byRepo}
            columns={[
              { label: "repo", render: (r) => r.repoFullName },
              { label: "drafts", render: (r) => String(r.count), align: "right" },
              { label: "cost", render: (r) => formatRand(r.costZar), align: "right" },
            ]}
            empty="no drafts yet"
          />
        </Section>

        <Section title="by type">
          <Table
            rows={byKind}
            columns={[
              { label: "type", render: (r) => r.kind },
              { label: "drafts", render: (r) => String(r.count), align: "right" },
              { label: "cost", render: (r) => formatRand(r.costZar), align: "right" },
            ]}
            empty="no drafts yet"
          />
        </Section>
      </div>

      <Section title="by status">
        <Table
          rows={byStatus}
          columns={[
            { label: "status", render: (r) => r.status },
            { label: "drafts", render: (r) => String(r.count), align: "right" },
            { label: "cost", render: (r) => formatRand(r.costZar), align: "right" },
          ]}
          empty="no drafts yet"
        />
      </Section>

      <Section title="recent generations">
        <div>
          {recent.length === 0 && <p className="px-1 py-2 text-[10px] text-term-text-muted">no drafts yet</p>}
          {recent.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2.5 border-b border-term-border-3 px-1 py-1.5 text-[10.5px] last:border-b-0"
            >
              <span className="flex-1 truncate text-term-text-body">{r.repoFullName}</span>
              <span className="w-[40px] text-term-text-meta">{r.kind}</span>
              <span className="w-[60px] text-term-text-meta">{r.status}</span>
              <span className="w-[50px] text-right text-term-text-meta">{formatTokens(r.totalTokens)}</span>
              <span className="w-[60px] text-right text-term-text-secondary">{formatRand(r.costZar)}</span>
              <span className="w-[60px] text-right text-term-text-faint">{formatMonthDay(r.createdAt)}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-term-border-2 px-3 py-2.5">
      <div className="mb-1 text-[9px] uppercase tracking-[0.08em] text-term-text-faint">{label}</div>
      <div className="font-semibold text-[16px] text-term-text-primary">{value}</div>
      {sub && <div className="text-[9px] text-term-text-meta">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-term-border-2 p-3">
      <div className="mb-2 font-semibold text-[9px] uppercase tracking-[0.1em] text-term-text-faint">{title}</div>
      {children}
    </div>
  );
}

function Table<T>({
  rows,
  columns,
  empty,
}: {
  rows: T[];
  columns: { label: string; render: (row: T) => string; align?: "left" | "right" }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="px-1 py-2 text-[10px] text-term-text-muted">{empty}</p>;

  return (
    <div>
      <div className="flex border-b border-term-border-3 px-1 py-1">
        {columns.map((c, i) => (
          <span
            key={c.label}
            className={`text-[9px] text-term-text-faint ${i === 0 ? "flex-1" : "w-[60px] text-right"}`}
          >
            {c.label}
          </span>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center border-b border-term-border-3 px-1 py-1.5 last:border-b-0">
          {columns.map((c, i) => (
            <span
              key={c.label}
              className={`text-[10.5px] ${i === 0 ? "flex-1 truncate text-term-text-body" : "w-[60px] text-right text-term-text-secondary"}`}
            >
              {c.render(row)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
