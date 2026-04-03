import type { ReactNode } from "react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { registerServiceWorker } from "~/lib/register-sw";
import { AddTaskInput } from "~/components/AddTaskInput";
import appCss from "../app.css?url";

const SyncSettings = lazy(() =>
  import("~/components/SyncSettings").then((m) => ({ default: m.SyncSettings })),
);

export const Route = createRootRoute({
  shellComponent: RootShell,
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "dark light" },
      { name: "theme-color", content: "#1c1917" },
      { name: "darkreader-lock" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "hearth" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    registerServiceWorker();
  }, []);

  const handleAddTask = useCallback(async (title: string) => {
    // Dynamic imports: avoids pulling stores → localStorage into the prerendered shell's module graph
    const [{ addTask }, { activeCategoryId$ }] = await Promise.all([
      import("~/lib/add-task"),
      import("~/lib/active-category"),
    ]);
    addTask(title, activeCategoryId$.peek());
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 pt-12 pb-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-lg font-medium tracking-widest text-foreground/50 uppercase">hearth</h1>
        {mounted && (
          <Suspense fallback={<span className="text-muted-foreground">⚙</span>}>
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
