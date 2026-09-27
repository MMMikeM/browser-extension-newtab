import { createRootRoute, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { ClientOnly, Outlet } from "@tanstack/react-router";
import { AppShell } from "~/AppBackground";
import { SyncSettings } from "~/components/SyncSettings";
import { Toast } from "~/components/ui/toast";
import { NavContextProvider } from "~/lib/state/nav-context";
import { registerServiceWorker } from "~/lib/sync/register-sw";

export const Route = createRootRoute({
  component: RootComponent,
});

// Module-level singleton so tests can inject toasts without going through React.
// Exposed on window.__toastAdd in dev/test only — dead code in production builds.
const toastManager = Toast.createToastManager();
if (import.meta.env.DEV && typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__toastAdd = (title: string) =>
    toastManager.add({ title, timeout: 5000, data: {} });
}

export default function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <NavContextProvider>
      <Toast.Provider toastManager={toastManager} limit={3}>
        <AppShell
          withSidebar={pathname === "/" || pathname === "/people"}
          right={
            <ClientOnly
              fallback={<span className="text-muted-foreground opacity-40">&#x2699;</span>}
            >
              <SyncSettings />
            </ClientOnly>
          }
        >
          <Outlet />
        </AppShell>
      </Toast.Provider>
    </NavContextProvider>
  );
}
