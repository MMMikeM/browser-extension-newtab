import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import { queryClient } from "~/lib/query-client";
import { client } from "~/lib/api";
import type { Task, Category, Note } from "~/lib/types";
import {
  openBrowserWASQLiteOPFSDatabase,
  createBrowserWASQLitePersistence,
} from "@tanstack/browser-db-sqlite-persistence";
import { getBuildTarget } from "./build-target";

// Guard: OPFS requires browser APIs — not available in Node.js (SSR prerender).
// Lazy route components that consume these collections suspend in SSR before rendering,
// so null exports are safe. See packages/client/src/routes/CLAUDE.md.

async function makeCollections() {
  if (getBuildTarget() === "server")
    return { categoriesCollection: null, tasksCollection: null, notesCollection: null };

  const database = await openBrowserWASQLiteOPFSDatabase({ databaseName: "newtab-todo.sqlite" });
  const persistence = createBrowserWASQLitePersistence<Record<PropertyKey, unknown>, string>({
    database,
  });
  return {
    categoriesCollection: createCollection(
      persistedCollectionOptions<Category, string>({
        // @ts-ignore
        persistence,
        schemaVersion: 1,
        ...queryCollectionOptions({
          id: "categories",
          queryKey: ["categories"] as const,
          queryFn: async () => {
            const res = await client.api.categories.$get();
            if (!res.ok) throw new Error("Failed to fetch categories");
            return res.json();
          },
          queryClient,
          getKey: (item) => item.id,
        }),
      }),
    ),
    tasksCollection: createCollection(
      persistedCollectionOptions<Task, string>({
        // @ts-ignore
        persistence,
        schemaVersion: 1,
        ...queryCollectionOptions({
          id: "tasks",
          queryKey: ["tasks"] as const,
          queryFn: async () => {
            const res = await client.api.tasks.$get();
            if (!res.ok) throw new Error("Failed to fetch tasks");
            return res.json();
          },
          queryClient,
          getKey: (item) => item.id,
        }),
      }),
    ),
    notesCollection: createCollection(
      persistedCollectionOptions<Note, string>({
        // @ts-ignore
        persistence,
        schemaVersion: 1,
        ...queryCollectionOptions({
          id: "notes",
          queryKey: ["notes"] as const,
          queryFn: async () => {
            const res = await client.api.notes.$get();
            if (!res.ok) throw new Error("Failed to fetch notes");
            return res.json();
          },
          queryClient,
          getKey: (item) => item.id,
        }),
      }),
    ),
  };
}

export const { categoriesCollection, tasksCollection, notesCollection } = await makeCollections();
