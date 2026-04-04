import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import { queryClient } from "~/lib/query-client";
import { persistence } from "~/lib/persistence";
import { client } from "~/lib/api";
import type { Task, Category, Note } from "~/lib/types";

// Wrap queryCollectionOptions in persistedCollectionOptions only when OPFS is available.
// persistence is null in Node SSR prerender context (see persistence.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const persisted = <T, K>(opts: Record<string, unknown>) =>
  persistence
    ? persistedCollectionOptions<T, K>({ persistence, schemaVersion: 1, ...opts })
    : (opts as any);

export const tasksCollection = createCollection(
  persisted<Task, string>(
    queryCollectionOptions({
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
  ),
);

export const categoriesCollection = createCollection(
  persisted<Category, string>(
    queryCollectionOptions({
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
  ),
);

export const notesCollection = createCollection(
  persisted<Note, string>(
    queryCollectionOptions({
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
  ),
);
