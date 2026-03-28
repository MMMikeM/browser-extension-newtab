import { createRouter } from "@tanstack/react-router";
import { createBrowserHistory, createHashHistory, createMemoryHistory } from "@tanstack/history";
import { routeTree } from "./routeTree.gen";
import { getBuildTarget, type BuildTarget } from "~/lib/build-target";

const createHistory = (buildTarget: BuildTarget) => {
  switch (buildTarget) {
    case "server":
      return createMemoryHistory({ initialEntries: ["/"] });
    case "extension":
      return createHashHistory();
    case "browser":
      return createBrowserHistory();
  }
};
export function getRouter() {
  return createRouter({
    routeTree,
    history: createHistory(getBuildTarget()),
    defaultNotFoundComponent: () => <p>Page not found</p>,
  });
}
