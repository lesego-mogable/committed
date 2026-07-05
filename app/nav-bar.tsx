import Image from "next/image";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { NavLinks } from "./nav-links";

export async function NavBar() {
  const userId = await requireUserId();
  const pendingCount = await prisma.draft.count({ where: { userId, status: "pending" } });
  const username = process.env.ALLOWED_GITHUB_USERNAME ?? "";

  return (
    <nav className="flex h-11 flex-shrink-0 items-center border-b border-term-border-2 bg-term-bg px-5">
      <div className="mr-7 flex flex-shrink-0 items-center gap-2">
        <Image src="/logo.svg" alt="" width={20} height={20} className="rounded-[4px]" />
        <span className="font-bold text-[13px] leading-none text-term-text-primary">committed</span>
      </div>
      <NavLinks pendingCount={pendingCount} />
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="font-normal text-[11px] text-term-text-meta transition-colors hover:text-term-text-primary"
        >
          @{username}
        </button>
      </form>
    </nav>
  );
}
