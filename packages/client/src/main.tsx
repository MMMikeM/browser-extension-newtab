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
const router = getRouter();

// In prod, index.html has prerendered content — hydrate to preserve it.
// In dev (vite dev), root is empty — fall back to createRoot.
if (root.innerHTML.trim()) {
  // Load the router before hydrating so TanStack Router's Matches component
  // renders real route content (not null) during the first hydration pass,
  // matching the server-rendered HTML and avoiding error #418.
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
