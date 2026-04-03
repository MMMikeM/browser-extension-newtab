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

export const getRouter = () => createRouter({
  routeTree,
  history: createHistory(),
  defaultNotFoundComponent: () => <p>Page not found</p>,
})
