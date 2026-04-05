import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "~/lib/query-client";
import { getRouter } from "./router";
import { initSync } from "~/lib/sse";
import "./app.css";

initSync();

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={getRouter()} />
    </QueryClientProvider>
  </StrictMode>
);

// In prod, index.html has prerendered content — hydrate to preserve it.
// In dev (vite dev), root is empty — fall back to createRoot.
if (root.innerHTML.trim()) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
