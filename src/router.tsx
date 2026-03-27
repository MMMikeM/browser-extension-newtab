import { createRouter } from "@tanstack/react-router";
import { createBrowserHistory, createHashHistory, createMemoryHistory } from "@tanstack/history";
import { routeTree } from "./routeTree.gen";

function getBuildTarget() {
  if (typeof window === "undefined") return "server";
  if (location.protocol.endsWith("-extension:")) return "extension";
  return "browser";
}

const createHistory = (buildTarget: "server" | "extension" | "browser") => {
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
