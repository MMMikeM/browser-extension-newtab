import {
  openBrowserWASQLiteOPFSDatabase,
  createBrowserWASQLitePersistence,
} from "@tanstack/browser-db-sqlite-persistence";
import { getBuildTarget } from "~/lib/build-target";

// Throws in server/SSR context or if OPFS is unavailable — callers catch and fall back.
export const getPersister = async () => {
  if (getBuildTarget() === "server") throw new Error("server");
  const database = await openBrowserWASQLiteOPFSDatabase({ databaseName: "newtab-todo.sqlite" });
  return createBrowserWASQLitePersistence({ database });
};
