import { startOfflineExecutor, NonRetriableError } from "@tanstack/offline-transactions";
import { tasksCollection, categoriesCollection, notesCollection } from "~/lib/collections";
import { client } from "~/lib/api";
import { now } from "~/lib/utils";

export const offline = startOfflineExecutor({
  collections: { tasks: tasksCollection, categories: categoriesCollection, notes: notesCollection },
  mutationFns: {
    syncTasks: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        let res: Response | undefined;
        if (m.type === "insert") {
          const { subtasks: _subtasks, shares: _shares, ...row } = m.modified;
          res = await client.api.tasks.$post({ json: { ...row, createdAt: now(), updatedAt: now() } as any });
        } else if (m.type === "update") {
          res = await client.api.tasks.$put({ json: { ...m.changes, id: m.key, updatedAt: now() } as any });
        } else if (m.type === "delete") {
          res = await client.api.tasks.$delete({ json: { id: m.key } });
        }
        if (res && !res.ok) {
          if (res.status >= 400 && res.status < 500) throw new NonRetriableError(await res.text());
          throw new Error(`Server error ${res.status}`);
        }
      }
    },
    syncCategories: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        let res: Response | undefined;
        if (m.type === "insert") {
          res = await client.api.categories.$post({ json: { ...m.modified, createdAt: now(), updatedAt: now() } as any });
        } else if (m.type === "update") {
          res = await client.api.categories.$put({ json: { ...m.changes, id: m.key, updatedAt: now() } as any });
        } else if (m.type === "delete") {
          res = await client.api.categories.$delete({ json: { id: m.key } });
        }
        if (res && !res.ok) {
          if (res.status >= 400 && res.status < 500) throw new NonRetriableError(await res.text());
          throw new Error(`Server error ${res.status}`);
        }
      }
    },
    syncNotes: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        let res: Response | undefined;
        if (m.type === "insert") {
          res = await client.api.notes.$post({ json: { ...m.modified, createdAt: now(), updatedAt: now() } as any });
        } else if (m.type === "update") {
          res = await client.api.notes.$put({ json: { ...m.changes, id: m.key, updatedAt: now() } as any });
        } else if (m.type === "delete") {
          res = await client.api.notes.$delete({ json: { id: m.key } });
        }
        if (res && !res.ok) {
          if (res.status >= 400 && res.status < 500) throw new NonRetriableError(await res.text());
          throw new Error(`Server error ${res.status}`);
        }
      }
    },
  },
});
