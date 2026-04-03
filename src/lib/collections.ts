import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import { queryClient } from "~/lib/query-client";
import { persistence } from "~/lib/persistence";
import { client } from "~/lib/api";
import type { Task, Category, Note } from "~/lib/types";
import { now } from "~/lib/utils";

export const tasksCollection = createCollection(
  persistedCollectionOptions<Task, string>({
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
      onInsert: async ({ transaction }) => {
        for (const m of transaction.mutations) {
          const { subtasks: _subtasks, shares: _shares, ...row } = m.modified;
          await client.api.tasks.$post({ json: { ...row, createdAt: now(), updatedAt: now() } });
        }
      },
      onUpdate: async ({ transaction }) => {
        for (const m of transaction.mutations) {
          await client.api.tasks.$put({ json: { ...m.changes, id: m.key, updatedAt: now() } });
        }
      },
      onDelete: async ({ transaction }) => {
        for (const m of transaction.mutations) {
          await client.api.tasks.$delete({ json: { id: m.key } });
        }
      },
    }),
  }),
);

export const categoriesCollection = createCollection(
  persistedCollectionOptions<Category, string>({
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
      onInsert: async ({ transaction }) => {
        for (const m of transaction.mutations) {
          await client.api.categories.$post({ json: { ...m.modified, createdAt: now(), updatedAt: now() } });
        }
      },
      onUpdate: async ({ transaction }) => {
        for (const m of transaction.mutations) {
          await client.api.categories.$put({ json: { ...m.changes, id: m.key, updatedAt: now() } });
        }
      },
      onDelete: async ({ transaction }) => {
        for (const m of transaction.mutations) {
          await client.api.categories.$delete({ json: { id: m.key } });
        }
      },
    }),
  }),
);

export const notesCollection = createCollection(
  persistedCollectionOptions<Note, string>({
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
      onInsert: async ({ transaction }) => {
        for (const m of transaction.mutations) {
          await client.api.notes.$post({ json: { ...m.modified, createdAt: now(), updatedAt: now() } });
        }
      },
      onUpdate: async ({ transaction }) => {
        for (const m of transaction.mutations) {
          await client.api.notes.$put({ json: { ...m.changes, id: m.key, updatedAt: now() } });
        }
      },
      onDelete: async ({ transaction }) => {
        for (const m of transaction.mutations) {
          await client.api.notes.$delete({ json: { id: m.key } });
        }
      },
    }),
  }),
);
