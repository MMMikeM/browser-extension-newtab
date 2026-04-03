import {
  openBrowserWASQLiteOPFSDatabase,
  createBrowserWASQLitePersistence,
} from "@tanstack/browser-db-sqlite-persistence";

const database = await openBrowserWASQLiteOPFSDatabase({
  databaseName: "newtab-todo.sqlite",
});

// Untyped — each collection narrows T and TKey via persistedCollectionOptions
export const persistence = createBrowserWASQLitePersistence({ database });
