import { useLiveQuery } from "@tanstack/react-db";
import { tasksCollection, categoriesCollection, notesCollection } from "~/lib/collections";
import { offline } from "~/lib/offline";
import type { Task, Category, Note } from "~/lib/types";
import { now } from "~/lib/utils";

export const useTasks = () => useLiveQuery(tasksCollection);
export const useCategories = () => useLiveQuery(categoriesCollection);
export const useNotes = () => useLiveQuery(notesCollection);

export const updateTask = (id: string, fields: Partial<Task>) => {
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncTasks" });
  tx.mutate(() => tasksCollection.update(id, (draft) => Object.assign(draft, fields)));
};

export const deleteTask = (id: string) => {
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncTasks" });
  tx.mutate(() => tasksCollection.delete(id));
};

export const addCategory = (fields: Omit<Category, "id" | "createdAt" | "updatedAt">) => {
  const id = crypto.randomUUID();
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncCategories" });
  tx.mutate(() =>
    categoriesCollection.insert({ ...fields, id, createdAt: now(), updatedAt: now() }),
  );
  return { id };
};

export const updateCategory = (id: string, fields: Partial<Category>) => {
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncCategories" });
  tx.mutate(() => categoriesCollection.update(id, (draft) => Object.assign(draft, fields)));
};

export const deleteCategory = (id: string) => {
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncCategories" });
  tx.mutate(() => categoriesCollection.delete(id));
};

export const addNote = (fields: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
  const id = crypto.randomUUID();
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncNotes" });
  tx.mutate(() => notesCollection.insert({ ...fields, id, createdAt: now(), updatedAt: now() }));
  return { id };
};

export const updateNote = (id: string, fields: Partial<Note>) => {
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncNotes" });
  tx.mutate(() => notesCollection.update(id, (draft) => Object.assign(draft, fields)));
};

export const deleteNote = (id: string) => {
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncNotes" });
  tx.mutate(() => notesCollection.delete(id));
};
