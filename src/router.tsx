import { createRouter } from "@tanstack/react-router";
import { createHashHistory, createMemoryHistory } from "@tanstack/history";
import { routeTree } from "./routeTree.gen";

const isServer = typeof window === "undefined";

const router = createRouter({
  routeTree,
  history: isServer ? createMemoryHistory({ initialEntries: ["/"] }) : createHashHistory(),
  defaultNotFoundComponent: () => <p>Page not found</p>,
});

export function getRouter() {
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
