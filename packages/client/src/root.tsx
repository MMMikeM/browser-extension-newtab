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
      <AddTaskInput
        onAdd={async (title) => {
          // Dynamic import: addTask pulls in collections + offline executor — kept out of root chunk.
          const [{ addTask }, { getActiveCategoryId }] = await Promise.all([
            import("./lib/add-task"),
            import("./lib/active-category"),
          ]);
          addTask(title, getActiveCategoryId());
        }}
      />
      <Suspense fallback={null}>
        <SyncHint onSignIn={() => router.navigate({ to: "/auth" })} />
      </Suspense>
      <div className="mt-2 flex flex-col gap-4">
        <Outlet />
      </div>
      <Suspense fallback={null}>
        <UndoToast />
      </Suspense>
    </AppShell>
  );
}
