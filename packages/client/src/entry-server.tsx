import { renderToString } from "react-dom/server";
import { StrictMode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "~/lib/query-client";
import { getRouter } from "./router";

export const render = async (): Promise<string> => {
  const router = getRouter();
  await router.load(); // required: <Outlet /> renders empty without this
  return renderToString(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
};
