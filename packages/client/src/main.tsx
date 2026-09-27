import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "~/lib/db/query-client";
import { getRouter } from "./router";
import { initSync } from "~/lib/sync/sse";
import "./app.css";

initSync();

console.log(`[build] ${__BUILD_VERSION__}`);

const root = document.getElementById("root")!;
const router = getRouter();

// In prod, index.html has prerendered content — hydrate to preserve it.
// In dev (vite dev), root is empty — fall back to createRoot.
if (root.innerHTML.trim()) {
  router.ssr = { manifest: undefined };
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
