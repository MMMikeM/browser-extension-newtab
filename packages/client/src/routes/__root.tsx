import { createRootRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect } from "react";
import { ClientOnly, Outlet } from "@tanstack/react-router";
import { AppShell } from "~/AppBackground";

export const Route = createRootRoute({
  component: RootComponent,
});




const SyncSettings = lazy(() => import("../components/SyncSettings"));

export default function RootComponent() {
  useEffect(() => {
    // Dynamic import: SW registration is fire-and-forget, not needed for initial render.
    import("~/lib/sync/register-sw").then(({ registerServiceWorker }) => registerServiceWorker());
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
      <Outlet />
    </AppShell>
  );
}
