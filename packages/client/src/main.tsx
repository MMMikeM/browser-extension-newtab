import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "~/lib/query-client";
import { getRouter } from "./router";
import { initSync } from "~/lib/sse";
import "./app.css";

initSync();

console.log(`[build] ${__BUILD_TIME__}`);

const root = document.getElementById("root")!;
const router = getRouter();

// In prod, index.html has prerendered content — hydrate to preserve it.
// In dev (vite dev), root is empty — fall back to createRoot.
if (root.innerHTML.trim()) {
  // Setting router.ssr makes Matches use SafeFragment instead of Suspense,
  // matching the server-rendered tree. Without this, React 19 throws error
  // #418 because it finds a client Suspense with no dehydration marker in HTML.
  // This also tells Transitioner to skip its initial router.load() call
  // (we call it ourselves below).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (router as any).ssr = {};
  await router.load();
  hydrateRoot(
    root,
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
} else {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
