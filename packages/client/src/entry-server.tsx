import { renderToString } from "react-dom/server";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "~/lib/query-client";
import { getRouter } from "./router";

// Render the full router tree. getBuildTarget() returns "server" in Node.js,
// so getRouter() creates a memoryHistory at "/".
//
// router.load() resolves routes at "/", loading the lazy index route. Lazy route
// components suspend inside renderToString (their Suspense boundaries render fallbacks),
// so only the root chrome actually renders: header, AddTaskInput, SyncSettings fallback.
// collections.ts guards its OPFS init so it doesn't crash when imported in Node.js.
export const render = async (): Promise<string> => {
  const router = getRouter();
  await router.load();
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};
