import { NavBar } from "./nav-bar";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-term-bg">
      <NavBar />
      <div className="mx-auto w-full max-w-[860px] flex-1">{children}</div>
    </div>
  );
}
