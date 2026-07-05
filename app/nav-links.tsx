"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/drafts", label: "drafts", showCount: true },
  { href: "/repos", label: "repos", showCount: false },
  { href: "/history", label: "history", showCount: false },
  { href: "/connect", label: "connect", showCount: false },
] as const;

export function NavLinks({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 items-center gap-0">
      {LINKS.map(({ href, label, showCount }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const count = showCount && pendingCount > 0 ? (
          <span
            className={
              active
                ? "text-term-amber"
                : "bg-term-amber/10 px-1 text-term-amber"
            }
          >
            {pendingCount}
          </span>
        ) : null;

        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "px-2.5 py-1.5 font-bold text-[12px] text-term-accent transition-colors"
                : "px-2.5 py-1.5 font-medium text-[12px] text-term-text-muted transition-colors hover:text-term-text-primary"
            }
          >
            {active ? (
              <>
                [{label}
                {count ? <> {count}</> : null}]
              </>
            ) : (
              <>
                {label}
                {count ? <> {count}</> : null}
              </>
            )}
          </Link>
        );
      })}
    </div>
  );
}
