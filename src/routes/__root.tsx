import { Suspense, lazy, useEffect, useState } from "react";
import { createRootRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { registerServiceWorker } from "~/lib/register-sw";
import { AddTaskInput } from "~/components/AddTaskInput";
import { SyncSettings } from "~/components/SyncSettings";
import { UndoToast } from "~/components/UndoToast";

// Dynamic import: SyncHint pulls in auth-token → localStorage at module init, which crashes prerender
const SyncHint = lazy(() =>
  import("~/components/SyncHint").then((m) => ({ default: m.SyncHint })),
);

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    registerServiceWorker();
  }, []);

  const handleAddTask = (async (title: string) => {
    const [{ addTask }, { getActiveCategoryId }] = await Promise.all([
      import("~/lib/add-task"),
      import("~/lib/active-category"),
    ]);
    addTask(title, getActiveCategoryId());
  });

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

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 pt-12 pb-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-lg font-medium tracking-widest text-hint uppercase">
          Jot
        </h1>
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
      <div className="mt-4 flex flex-col gap-4">
        <Outlet />
      </div>
      {mounted && <UndoToast />}
    </div>
  );
}
