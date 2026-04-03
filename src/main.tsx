import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient, persister } from "~/lib/query-client";
import { getRouter } from "./router";
import { initSync } from "~/lib/sse";
import "./app.css";

initSync();

const root = document.getElementById("root")!;
createRoot(root).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <RouterProvider router={getRouter()} />
    </PersistQueryClientProvider>
  </StrictMode>,
);
