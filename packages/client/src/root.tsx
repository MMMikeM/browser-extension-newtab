import { Suspense, lazy, useEffect, useState } from "react";
import { Outlet, useRouter } from "@tanstack/react-router";
import { AddTaskInput } from "~/components/AddTaskInput";
import { AppShell } from "./AppBackground";

const SyncSettings = lazy(() => import("./components/SyncSettings"));
const SyncHint = lazy(() => import("./components/SyncHint"));
const UndoToast = lazy(() => import("~/components/UndoToast"));

// useState+useEffect returns false on SSR and initial client render, then true
// after mount. Unlike useSyncExternalStore with differing snapshots, this never
// creates a server/client HTML mismatch during React 19 hydration.
function useIsClient() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
}

export default function RootComponent() {
  const router = useRouter();
  const isClient = useIsClient();

  useEffect(() => {
    // Dynamic import: SW registration is fire-and-forget, not needed for initial render.
    import("~/lib/register-sw").then(({ registerServiceWorker }) => registerServiceWorker());
  }, []);

  return (
    <AppShell
      right={
        // isClient is false on SSR and initial hydration, true after mount.
        // This ensures SSR and the initial client render agree on the fallback,
        // eliminating the hydration mismatch that ClientOnly's useSyncExternalStore
        // caused in React 19 (getServerSnapshot ≠ getSnapshot → error #418).
        isClient ? (
          <Suspense fallback={<span className="text-muted-foreground">&#x2699;</span>}>
            <SyncSettings />
          </Suspense>
        ) : (
          <span className="text-muted-foreground opacity-40">&#x2699;</span>
        )
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
