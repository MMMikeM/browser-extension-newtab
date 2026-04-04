import {
  openBrowserWASQLiteOPFSDatabase,
  createBrowserWASQLitePersistence,
} from "@tanstack/browser-db-sqlite-persistence";

// OPFS isn't available in Node SSR prerender context — .catch prevents a module-level
// throw that would crash the prerender build. Null is safe: collections are unused in SSR.
const database = await openBrowserWASQLiteOPFSDatabase({
  databaseName: "newtab-todo.sqlite",
}).catch(() => null);

// Untyped — each collection narrows T and TKey via persistedCollectionOptions
// null in SSR context (database is null); cast to never so callers don't need SSR guards
export const persistence = database
  ? createBrowserWASQLitePersistence({ database })
  : (null as never);
