import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/drafts");
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-term-bg px-5 py-16">
      <div className="w-full max-w-[400px]">
        <div className="mb-1 text-[11px] leading-[2] text-term-text-faint">
          <span className="text-term-text-meta">$</span> ./committed login
        </div>
        <div className="mb-2 flex items-center gap-3">
          <Image src="/logo.svg" alt="" width={40} height={40} className="rounded-[8px]" />
          <span className="font-bold text-[32px] leading-none text-term-text-primary">committed</span>
        </div>
        <div className="mb-8 text-[13px] leading-[1.5] text-term-text-body">
          turn merged prs into linkedin posts_
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("github");
          }}
        >
          <button
            type="submit"
            className="border border-term-accent px-5 py-2.5 font-bold text-[11px] tracking-[0.06em] text-term-accent transition-colors hover:bg-term-accent-bg"
          >
            [ SIGN IN WITH GITHUB ]
          </button>
        </form>
        <div className="mt-3.5 text-[10px] text-term-text-faint">no account required</div>
      </div>
    </div>
  );
}
