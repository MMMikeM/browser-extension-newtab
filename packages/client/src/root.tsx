import { Suspense, lazy, useEffect } from "react";
import { ClientOnly, Outlet, useRouter } from "@tanstack/react-router";
import { AddTaskInput } from "~/components/AddTaskInput";
import { AppShell } from "./AppBackground";

const SyncSettings = lazy(() => import("./components/SyncSettings"));
const SyncHint = lazy(() => import("./components/SyncHint"));
const UndoToast = lazy(() => import("~/components/UndoToast"));

export default function RootComponent() {
  const router = useRouter();
  console.log(
    "[RootComponent] render — router.ssr:",
    router.ssr,
    "router.isServer:",
    router.isServer,
  );

  useEffect(() => {
    // Dynamic import: SW registration is fire-and-forget, not needed for initial render.
    import("~/lib/register-sw").then(({ registerServiceWorker }) => registerServiceWorker());
  }, []);

  const handleAdd = async (title: string) => {
    // Dynamic import: addTask pulls in collections + offline executor — kept out of root chunk.
    const [{ addTask }, { getActiveCategoryId }] = await Promise.all([
      import("./lib/add-task"),
      import("./lib/active-category"),
    ]);
    addTask(title, getActiveCategoryId());
  };

  return (
    <AppShell
      right={
        <ClientOnly fallback={<span className="text-muted-foreground opacity-40">&#x2699;</span>}>
          <Suspense fallback={<span className="text-muted-foreground">&#x2699;</span>}>
            <SyncSettings />
          </Suspense>
        </ClientOnly>
      }
    >
      {/*
       * Desktop: input renders first (top), content below — DOM order.
       * Mobile (touch): flex column with order swapped. Input gets order-2 so it sinks
       * to the bottom of the viewport; content gets order-1 and fills the remaining space.
       */}
      <div className="touch:order-2 touch:shrink-0 touch:-mx-6 touch:px-6 touch:border-t touch:border-border/20 touch:pt-3 touch:pb-[env(safe-area-inset-bottom,0px)]">
        <AddTaskInput onAdd={handleAdd} />
      </div>
      <div className="touch:order-1 touch:flex-1 touch:overflow-y-auto touch:min-h-0">
        <Suspense fallback={null}>
          <SyncHint onSignIn={() => router.navigate({ to: "/auth" })} />
        </Suspense>
        <div className="mt-2 flex flex-col gap-4">
          <Outlet />
        </div>
      </div>
      <Suspense fallback={null}>
        <UndoToast />
      </Suspense>
    </AppShell>
  );
}
