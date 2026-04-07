import type { ReactNode } from "react";
import { useNavContext } from "~/lib/state/nav-context";

export function AppShell({ right, children }: { right?: ReactNode; children?: ReactNode }) {
  const { mobileNavContent } = useNavContext();
  return (
    <div
      className="mx-auto min-h-screen max-w-sm px-6 pt-8 pb-8 relative z-1
                 touch:flex touch:flex-col touch:h-dvh touch:min-h-0 touch:pb-0
                 touch:pt-[max(2rem,env(safe-area-inset-top,0px))]"
      style={{ backgroundColor: "oklch(0.20 0.01 50 / 75%)" }}
    >
      <div className="mb-5 flex items-center justify-between shrink-0">
        <h1 className="font-display text-2xl tracking-[0.28em] text-foreground uppercase">Ajot</h1>
        {mobileNavContent && (
          <div className="hidden touch:flex flex-1 justify-center">{mobileNavContent}</div>
        )}
        {right}
      </div>
      {children}
    </div>
  );
}
