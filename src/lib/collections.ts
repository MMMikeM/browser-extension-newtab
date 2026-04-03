import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "~/lib/query-client";
import { client } from "~/lib/api";
import type { Task, Category, Note } from "~/lib/types";
import { now } from "~/lib/utils";

export const tasksCollection = createCollection<Task, string>(
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
    onInsert: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        const { subtasks: _subtasks, shares: _shares, ...row } = m.modified;
        await client.api.tasks.$post({ json: { ...row, createdAt: now(), updatedAt: now() } });
      }
      return { refetch: false };
    },
    onUpdate: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await client.api.tasks.$put({ json: { ...m.changes, id: m.key, updatedAt: now() } });
      }
      return { refetch: false };
    },
    onDelete: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await client.api.tasks.$delete({ json: { id: m.key } });
      }
      return { refetch: false };
    },
  }),
);

export const categoriesCollection = createCollection<Category, string>(
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
    onInsert: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await client.api.categories.$post({ json: { ...m.modified, createdAt: now(), updatedAt: now() } });
      }
      return { refetch: false };
    },
    onUpdate: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await client.api.categories.$put({ json: { ...m.changes, id: m.key, updatedAt: now() } });
      }
      return { refetch: false };
    },
    onDelete: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await client.api.categories.$delete({ json: { id: m.key } });
      }
      return { refetch: false };
    },
  }),
);

export const notesCollection = createCollection<Note, string>(
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
    onInsert: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await client.api.notes.$post({ json: { ...m.modified, createdAt: now(), updatedAt: now() } });
      }
      return { refetch: false };
    },
    onUpdate: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await client.api.notes.$put({ json: { ...m.changes, id: m.key, updatedAt: now() } });
      }
      return { refetch: false };
    },
    onDelete: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await client.api.notes.$delete({ json: { id: m.key } });
      }
      return { refetch: false };
    },
  }),
);
