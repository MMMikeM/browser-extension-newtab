import { useLiveQuery } from "@tanstack/react-db";
import {
  tasksCollection,
  categoriesCollection,
  notesCollection,
  contactsCollection,
} from "~/lib/db/collections";
import { offline, type CategoryDeleteMetadata } from "~/lib/db/offline";
import type { CategoryTaskAction } from "~/lib/constants";
import type { Task, Category, Note } from "~/lib/types";
import { now } from "~/lib/utils";
export { contactsCollection };
export const useTasks = () => useLiveQuery(tasksCollection);
export const useCategories = () => useLiveQuery(categoriesCollection);
export const useNotes = () => useLiveQuery(notesCollection);
export const useContacts = () => useLiveQuery(contactsCollection);

export const updateTask = (id: string, fields: Partial<Task>) => {
  console.log(`[mutation] updateTask id=${id}`, fields);
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncTasks" });
  tx.mutate(() =>
    tasksCollection.update(id, (draft) => Object.assign(draft, { ...fields, updatedAt: now() })),
  );
  console.log("[mutation] optimistic applied, tx queued");
};

export const deleteTask = (id: string) => {
  console.log(`[mutation] deleteTask id=${id}`);
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncTasks" });
  tx.mutate(() => tasksCollection.delete(id));
  console.log("[mutation] optimistic applied, tx queued");
};

export const addCategory = (
  fields: Omit<Category, "id" | "createdAt" | "updatedAt" | "collaborators">,
) => {
  const id = crypto.randomUUID();
  console.log(`[mutation] addCategory id=${id}`, fields);
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncCategories" });
  tx.mutate(() =>
    categoriesCollection.insert({
      ...fields,
      id,
      createdAt: now(),
      updatedAt: now(),
      collaborators: [],
    }),
  );
  console.log("[mutation] optimistic applied, tx queued");
  return { id };
};

export const updateCategory = (id: string, fields: Partial<Category>) => {
  console.log(`[mutation] updateCategory id=${id}`, fields);
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncCategories" });
  tx.mutate(() =>
    categoriesCollection.update(id, (draft) =>
      Object.assign(draft, { ...fields, updatedAt: now() }),
    ),
  );
  console.log("[mutation] optimistic applied, tx queued");
};

/** Returns the transaction, whose `isPersisted.promise` rejects if the server refuses. */
export const deleteCategory = (id: string, tasks: CategoryTaskAction) => {
  console.log(`[mutation] deleteCategory id=${id} tasks=${tasks}`);
  const allTasks = [...(tasksCollection.state?.values() ?? [])];
  const topLevelIds = new Set(allTasks.filter((t) => t.categoryId === id).map((t) => t.id));
  const tx = offline.createOfflineTransaction({
    mutationFnName: "deleteCategory",
    metadata: { categoryId: id, tasks } satisfies CategoryDeleteMetadata,
  });
  const transaction = tx.mutate(() => {
    for (const task of allTasks) {
      if (tasks === "delete") {
        if (topLevelIds.has(task.id) || (task.parentId && topLevelIds.has(task.parentId)))
          tasksCollection.delete(task.id);
      } else if (topLevelIds.has(task.id)) {
        tasksCollection.update(task.id, (draft) =>
          Object.assign(draft, { categoryId: null, updatedAt: now() }),
        );
      }
    }
    categoriesCollection.delete(id);
  });
  console.log("[mutation] optimistic applied, tx queued");
  return transaction;
};

export const addNote = (fields: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
  const id = crypto.randomUUID();
  console.log(`[mutation] addNote id=${id}`, fields);
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncNotes" });
  tx.mutate(() => notesCollection.insert({ ...fields, id, createdAt: now(), updatedAt: now() }));
  console.log("[mutation] optimistic applied, tx queued");
  return { id };
};

export const updateNote = (id: string, fields: Partial<Note>) => {
  console.log(`[mutation] updateNote id=${id}`, fields);
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncNotes" });
  tx.mutate(() =>
    notesCollection.update(id, (draft) => Object.assign(draft, { ...fields, updatedAt: now() })),
  );
  console.log("[mutation] optimistic applied, tx queued");
};

export const deleteNote = (id: string) => {
  console.log(`[mutation] deleteNote id=${id}`);
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncNotes" });
  tx.mutate(() => notesCollection.delete(id));
  console.log("[mutation] optimistic applied, tx queued");
};
