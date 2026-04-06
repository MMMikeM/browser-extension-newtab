import { createRootRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect } from "react";
import { ClientOnly, Outlet } from "@tanstack/react-router";
import { AppShell } from "~/AppBackground";
import { Toast } from "~/components/ui/toast";
import { NavContextProvider } from "~/lib/state/nav-context";

export const Route = createRootRoute({
  component: RootComponent,
});

const SyncSettings = lazy(() => import("../components/SyncSettings"));

// Module-level singleton so tests can inject toasts without going through React.
// Exposed on window.__toastAdd in dev/test only — dead code in production builds.
const toastManager = Toast.createToastManager();
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as any).__toastAdd = (title: string) =>
    toastManager.add({ title, timeout: 5000, data: {} });
}

export default function RootComponent() {
  useEffect(() => {
    // Dynamic import: SW registration is fire-and-forget, not needed for initial render.
    import("~/lib/sync/register-sw").then(({ registerServiceWorker }) => registerServiceWorker());
  }, []);

  return (
    <NavContextProvider>
      <Toast.Provider toastManager={toastManager} limit={3}>
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
      </Toast.Provider>
    </NavContextProvider>
  );
}
