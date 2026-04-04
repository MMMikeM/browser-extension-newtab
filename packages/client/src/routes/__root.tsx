import { Suspense, lazy, useEffect, useState } from "react";
import { createRootRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { registerServiceWorker } from "~/lib/register-sw";
import { AddTaskInput } from "~/components/AddTaskInput";
import { SyncSettings } from "~/components/SyncSettings";
import { UndoToast } from "~/components/UndoToast";
import { cn } from "~/lib/utils";

// Dynamic imports: both pull in auth-token → localStorage at module init, which crashes prerender
const SyncSettings = lazy(() => import("~/components/SyncSettings"));
const SyncHint = lazy(() => import("~/components/SyncHint"));

export const Route = createRootRoute({
  component: RootComponent,
});

const GROUNDING_OVERLAYS: Array<{ label: string; gradient: string } | null> = [
  null, // none
  {
    label: "Bottom weight",
    gradient:
      "linear-gradient(in oklch to top, oklch(0.09 0.01 50 / 80%) 0%, oklch(0.11 0.01 50 / 50%) 30%, transparent 100%)",
  },
  {
    label: "Deep ground",
    gradient:
      "linear-gradient(in oklch to top, oklch(0.06 0.01 50 / 95%) 0%, oklch(0.09 0.01 50 / 75%) 35%, oklch(0.12 0.01 50 / 35%) 60%, transparent 100%)",
  },
  {
    label: "Vignette",
    gradient:
      "radial-gradient(in oklch ellipse 65% 65% at 50% 45%, transparent 30%, oklch(0.07 0.01 50 / 85%) 100%)",
  },
  {
    label: "Spotlight",
    gradient:
      "linear-gradient(in oklch to right, oklch(0.07 0.01 50 / 80%) 0%, transparent 22%, transparent 78%, oklch(0.07 0.01 50 / 80%) 100%)",
  },
];

function RootComponent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [groundingIdx, setGroundingIdx] = useState(1);

  useEffect(() => {
    setMounted(true);
    registerServiceWorker();
  }, []);

  const handleAddTask = async (title: string) => {
    const [{ addTask }, { getActiveCategoryId }] = await Promise.all([
      import("~/lib/add-task"),
      import("~/lib/active-category"),
    ]);
    addTask(title, getActiveCategoryId());
  };

  const { location } = useRouterState();
  const isAuthRoute = location.pathname === "/auth";

  if (isAuthRoute) {
    return (
      <>
        <Outlet />
        {mounted && <UndoToast />}
      </>
    );
  }

  const overlay = GROUNDING_OVERLAYS[groundingIdx];

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 pt-12 pb-8">
      {overlay && (
        <div
          className="pointer-events-none fixed inset-0 z-10"
          style={{ background: overlay.gradient }}
        />
      )}
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => setGroundingIdx((i) => (i + 1) % GROUNDING_OVERLAYS.length)}
          className="group flex items-baseline gap-2"
          title="Cycle grounding options"
        >
          <h1 className="font-display text-2xl tracking-[0.28em] text-foreground uppercase">Jot</h1>
          <span className="text-xs text-ghost transition-colors group-hover:text-hint">
            {overlay?.label ?? "None"}
          </span>
        </button>
        {mounted && (
          <Suspense fallback={<span className="text-muted-foreground">&#x2699;</span>}>
            <SyncSettings />
          </Suspense>
        )}
      </div>
      <AddTaskInput onAdd={handleAddTask} />
      {mounted && (
        <Suspense fallback={null}>
          <SyncHint onSignIn={() => router.navigate({ to: "/auth" })} />
        </Suspense>
      )}
      <div className="mt-3 flex flex-col gap-4">
        <Outlet />
      </div>
      {mounted && <UndoToast />}
    </div>
  );
}
