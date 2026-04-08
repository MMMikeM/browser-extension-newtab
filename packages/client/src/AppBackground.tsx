import type { ReactNode } from "react";

export function AppShell({ right, children }: { right?: ReactNode; children?: ReactNode }) {
  return (
    <div
      className="relative z-1 mx-auto min-h-screen max-w-sm px-6 pt-8 pb-8 touch:flex touch:h-dvh touch:min-h-0 touch:flex-col touch:pt-[max(2rem,env(safe-area-inset-top,0px))] touch:pb-0"
      style={{ backgroundColor: "oklch(0.20 0.01 50 / 75%)" }}
    >
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <h1 className="font-display text-2xl tracking-[0.28em] text-foreground uppercase">Ajot</h1>
        {right}
      </div>
      {children}
    </div>
  );
}
