import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

export function AppShell({
  right,
  withSidebar = false,
  children,
}: {
  right?: ReactNode;
  withSidebar?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        // --gutter: symmetric side padding on touch that also clears landscape notches
        "relative z-1 mx-auto min-h-screen max-w-(--column-w) bg-shell px-6 pt-8 pb-8 [--gutter:max(1.25rem,env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))] touch:flex touch:h-dvh touch:min-h-0 touch:max-w-lg touch:flex-col touch:px-(--gutter) touch:pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] touch:pb-0",
        // Desk: an inset sheet on the page; ::after casts one shadow under the column and sidebar together
        "desk:my-(--sheet-inset) desk:min-h-[calc(100dvh-2*var(--sheet-inset))] desk:rounded-2xl desk:after:pointer-events-none desk:after:absolute desk:after:inset-0 desk:after:-z-1 desk:after:rounded-2xl desk:after:shadow-sheet",
        // Sidebar surface drawn here so it's in the first paint
        withSidebar &&
          "desk:left-(--column-shift) desk:rounded-l-none desk:before:absolute desk:before:inset-y-0 desk:before:right-full desk:before:w-(--sidebar-w) desk:before:rounded-l-2xl desk:before:border-r desk:before:border-ghost/40 desk:before:bg-sidebar desk:after:-left-(--sidebar-w)",
      )}
    >
      <header className="mb-5 flex shrink-0 items-center justify-between touch:mb-4">
        <h1 className="font-display text-lg tracking-[0.28em] text-foreground uppercase">
          Ajot
        </h1>
        {right}
      </header>
      {/* contents: route children stay direct flex items of the shell on touch */}
      <main className="contents">{children}</main>
    </div>
  );
}
