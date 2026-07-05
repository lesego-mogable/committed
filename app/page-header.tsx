export function PageHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2.5 border-b border-term-border px-5 py-3">
      <h1 className="m-0 font-bold text-[11px] uppercase tracking-[0.1em] text-term-text-secondary">
        {title}
      </h1>
      {subtitle && <span className="text-[10px] text-term-text-faint">{subtitle}</span>}
      {badge}
    </div>
  );
}
