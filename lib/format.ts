type Unit = "year" | "month" | "day" | "hour" | "minute";

const UNITS: [Unit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

const COMPACT_UNIT: Record<Unit, string> = {
  year: "y",
  month: "mo",
  day: "d",
  hour: "h",
  minute: "m",
};

export function relativeTimeCompact(date: string | Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  for (const [unit, ms] of UNITS) {
    const value = Math.floor(diffMs / ms);
    if (value >= 1) return `${value}${COMPACT_UNIT[unit]}`;
  }
  return "now";
}

export function relativeTimeAgo(date: string | Date): string {
  const compact = relativeTimeCompact(date);
  return compact === "now" ? "just now" : `${compact} ago`;
}

export function formatMonthDay(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
