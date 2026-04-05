import { createRouter } from "@tanstack/react-router";
import { createBrowserHistory, createHashHistory, createMemoryHistory } from "@tanstack/history";
import { routeTree } from "./routeTree.gen";
import { getBuildTarget } from "~/lib/build-target";

const createHistory = () => {
  const target = getBuildTarget();
  if (target === "server") return createMemoryHistory({ initialEntries: ["/"] });
  if (target === "extension") return createHashHistory();
  return createBrowserHistory();
};

export const getRouter = () =>
  createRouter({
    routeTree,
    history: createHistory(),
    defaultNotFoundComponent: () => <p>Page not found</p>,
    // ssr: true makes Matches use SafeFragment instead of Suspense on the client,
    // matching the server-rendered tree structure and preventing React 19 error #418.
    // Transitioner still renders (gated on router.isServer, not router.ssr).
    ssr: getBuildTarget() === "browser",
  });
