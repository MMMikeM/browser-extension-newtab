import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import { queryClient } from "~/lib/db/query-client";
import { client } from "~/lib/api";
import { getAuthToken } from "~/lib/auth/token";
import type { Task, Category, Contact, Note } from "~/lib/types";
import {
  openBrowserWASQLiteOPFSDatabase,
  createBrowserWASQLitePersistence,
  BrowserCollectionCoordinator,
} from "@tanstack/browser-db-sqlite-persistence";
import { getBuildTarget } from "../build-target";

// Guard: OPFS requires browser APIs — not available in Node.js (SSR prerender).
// Lazy route components that consume these collections suspend in SSR before rendering,
// so null exports are safe. See packages/client/src/routes/CLAUDE.md.

async function makeCollections() {
  if (getBuildTarget() === "server")
    return {
      categoriesCollection: null,
      tasksCollection: null,
      notesCollection: null,
      contactsCollection: null,
    };

  const database = await openBrowserWASQLiteOPFSDatabase({ databaseName: "newtab-todo.sqlite" });
  const coordinator = new BrowserCollectionCoordinator({ dbName: "newtab-todo" });
  const persistence = createBrowserWASQLitePersistence<Record<PropertyKey, unknown>, string>({
    database,
    coordinator,
  });
  return {
    contactsCollection: createCollection(
      persistedCollectionOptions<Contact, string>({
        // @ts-ignore
        persistence,
        schemaVersion: 1,
        ...queryCollectionOptions({
          id: "contacts",
          queryKey: ["contacts"] as const,
          queryFn: async () => {
            if (!getAuthToken()) throw new Error("Not authenticated");
            const res = await client.api.contacts.$get();
            if (!res.ok) throw new Error("Failed to fetch contacts");
            return res.json();
          },
          queryClient,
          getKey: (item) => item.id,
          retry: (_, error) =>
            !!getAuthToken() && !(error instanceof Error && error.message === "Not authenticated"),
        }),
      }),
    ),
    categoriesCollection: createCollection(
      persistedCollectionOptions<Category, string>({
        // @ts-ignore
        persistence,
        schemaVersion: 1,
        ...queryCollectionOptions({
          id: "categories",
          queryKey: ["categories"] as const,
          queryFn: async () => {
            if (!getAuthToken()) throw new Error("Not authenticated");
            const res = await client.api.categories.$get();
            if (!res.ok) throw new Error("Failed to fetch categories");
            return res.json();
          },
          queryClient,
          getKey: (item) => item.id,
          retry: (_, error) =>
            !!getAuthToken() && !(error instanceof Error && error.message === "Not authenticated"),
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
            if (!getAuthToken()) throw new Error("Not authenticated");
            const res = await client.api.tasks.$get();
            if (!res.ok) throw new Error("Failed to fetch tasks");
            return res.json();
          },
          queryClient,
          getKey: (item) => item.id,
          retry: (_, error) =>
            !!getAuthToken() && !(error instanceof Error && error.message === "Not authenticated"),
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
            if (!getAuthToken()) throw new Error("Not authenticated");
            const res = await client.api.notes.$get();
            if (!res.ok) throw new Error("Failed to fetch notes");
            return res.json();
          },
          queryClient,
          getKey: (item) => item.id,
          retry: (_, error) =>
            !!getAuthToken() && !(error instanceof Error && error.message === "Not authenticated"),
        }),
      }),
    ),
  };
}

// makeCollections() returns null values on the server path (SSR prerender).
// This module is client-only — no server-path code ever imports it.
const collections = await makeCollections();
export const tasksCollection = collections.tasksCollection!;
export const categoriesCollection = collections.categoriesCollection!;
export const notesCollection = collections.notesCollection!;
export const contactsCollection = collections.contactsCollection!;
