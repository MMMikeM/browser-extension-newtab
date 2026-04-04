import { createCollection } from "@tanstack/db";
import type { CollectionConfig } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { QueryCollectionUtils } from "@tanstack/query-db-collection";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import type { PersistedCollectionPersistence } from "@tanstack/browser-db-sqlite-persistence";
import { queryClient } from "~/lib/query-client";
import { getPersister } from "~/lib/persistence";
import { client } from "~/lib/api";
import type { Task, Category, Note } from "~/lib/types";

// Null when server/SSR or OPFS unavailable — collections fall back to unpersisted query mode.
const persistence = await getPersister().catch(() => null);

// createBrowserWASQLitePersistence returns PersistedCollectionPersistence<object, string|number>
// because it's created before any collection type is known. The cast is safe: the OPFS adapter
// stores raw SQLite rows and is compatible with any entity type at runtime.
const typed = <T extends object>(
  p: NonNullable<typeof persistence>,
): PersistedCollectionPersistence<T, string> => p as unknown as PersistedCollectionPersistence<T, string>;

const wrap = <T extends object>(opts: CollectionConfig<T, string, never, QueryCollectionUtils<T, string>>) =>
  persistence
    ? persistedCollectionOptions<T, string, never, QueryCollectionUtils<T, string>>({
        ...opts,
        persistence: typed<T>(persistence),
        schemaVersion: 1,
      })
    : opts;

const tasksOpts = queryCollectionOptions({
  id: "tasks",
  queryKey: ["tasks"] as const,
  queryFn: async () => {
    const res = await client.api.tasks.$get();
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
  },
  queryClient,
  getKey: (item) => item.id,
});

const categoriesOpts = queryCollectionOptions({
  id: "categories",
  queryKey: ["categories"] as const,
  queryFn: async () => {
    const res = await client.api.categories.$get();
    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json();
  },
  queryClient,
  getKey: (item) => item.id,
});

const notesOpts = queryCollectionOptions({
  id: "notes",
  queryKey: ["notes"] as const,
  queryFn: async () => {
    const res = await client.api.notes.$get();
    if (!res.ok) throw new Error("Failed to fetch notes");
    return res.json();
  },
  queryClient,
  getKey: (item) => item.id,
});

export const tasksCollection = createCollection(wrap<Task>(tasksOpts));
export const categoriesCollection = createCollection(wrap<Category>(categoriesOpts));
export const notesCollection = createCollection(wrap<Note>(notesOpts));
