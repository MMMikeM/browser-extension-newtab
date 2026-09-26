import type { ReactNode } from "react";

export function AppShell({ right, children }: { right?: ReactNode; children?: ReactNode }) {
  return (
    <div
      className={
        // --gutter: symmetric side padding on touch that also clears landscape notches
        "relative z-1 mx-auto min-h-screen max-w-sm px-6 pt-8 pb-8 [--gutter:max(1.25rem,env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))] touch:flex touch:h-dvh touch:min-h-0 touch:max-w-lg touch:flex-col touch:px-(--gutter) touch:pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] touch:pb-0"
      }
      style={{ backgroundColor: "oklch(0.20 0.01 50 / 75%)" }}
    >
      <div className="mb-5 flex shrink-0 items-center justify-between touch:mb-4">
        <h1 className="font-display text-2xl tracking-[0.28em] text-foreground uppercase touch:text-lg">
          Ajot
        </h1>
        {right}
      </div>
      {children}
    </div>
  );
}
