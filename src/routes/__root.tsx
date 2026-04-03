import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { registerServiceWorker } from "~/lib/register-sw";
import { AddTaskInput } from "~/components/AddTaskInput";

const SyncSettings = lazy(() =>
  import("~/components/SyncSettings").then((m) => ({ default: m.SyncSettings })),
);

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    registerServiceWorker();
  }, []);

  const handleAddTask = useCallback(async (title: string) => {
    const [{ addTask }, { getActiveCategoryId }] = await Promise.all([
      import("~/lib/add-task"),
      import("~/lib/active-category"),
    ]);
    addTask(title, getActiveCategoryId());
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 pt-12 pb-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-lg font-medium tracking-widest text-foreground/50 uppercase">
          hearth
        </h1>
        {mounted && (
          <Suspense fallback={<span className="text-muted-foreground">&#x2699;</span>}>
            <SyncSettings />
          </Suspense>
        )}
      </div>
      <AddTaskInput onAdd={handleAddTask} />
      <div className="mt-4 flex flex-col gap-4">
        <Outlet />
      </div>
    </div>
  );
}
