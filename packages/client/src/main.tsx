import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "~/lib/db/query-client";
import { getRouter } from "./router";
import { initSync } from "~/lib/sync/sse";
import "./app.css";

initSync();

console.log(`[build] ${__BUILD_TIME__}`);

const root = document.getElementById("root")!;
const router = getRouter();

// In prod, index.html has prerendered content — hydrate to preserve it.
// In dev (vite dev), root is empty — fall back to createRoot.
if (root.innerHTML.trim()) {
  console.log("[hydration] router.ssr before assignment:", router.ssr);
  router.ssr = { manifest: undefined };
  console.log("[hydration] router.ssr after assignment:", router.ssr);
  await router.load();
  console.log("[hydration] router.ssr after load():", router.ssr);
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
