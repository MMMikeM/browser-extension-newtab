import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "~/lib/query-client";
import { getRouter } from "./router";
import { initSync } from "~/lib/sse";
import "./app.css";

initSync();

const root = document.getElementById("root")!;
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={getRouter()} />
    </QueryClientProvider>
  </StrictMode>,
);
