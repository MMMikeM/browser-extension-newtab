import { useLiveQuery } from "@tanstack/react-db";
import { tasksCollection, categoriesCollection, notesCollection } from "~/lib/collections";
import type { Task, Category, Note } from "~/lib/types";
import { now } from "~/lib/utils";

export const useTasks = () => useLiveQuery(tasksCollection);
export const useCategories = () => useLiveQuery(categoriesCollection);
export const useNotes = () => useLiveQuery(notesCollection);

export const updateTask = (id: string, fields: Partial<Task>) =>
  tasksCollection.update(id, (draft) => Object.assign(draft, fields));

export const deleteTask = (id: string) => tasksCollection.delete(id);

export const addCategory = (fields: Omit<Category, "id" | "createdAt" | "updatedAt">) =>
  categoriesCollection.insert({
    ...fields,
    id: crypto.randomUUID(),
    createdAt: now(),
    updatedAt: now(),
  });

export const updateCategory = (id: string, fields: Partial<Category>) =>
  categoriesCollection.update(id, (draft) => Object.assign(draft, fields));

export const deleteCategory = (id: string) => categoriesCollection.delete(id);

export const addNote = (fields: Omit<Note, "id" | "createdAt" | "updatedAt">) =>
  notesCollection.insert({
    ...fields,
    id: crypto.randomUUID(),
    createdAt: now(),
    updatedAt: now(),
  });

export const updateNote = (id: string, fields: Partial<Note>) =>
  notesCollection.update(id, (draft) => Object.assign(draft, fields));

export const deleteNote = (id: string) => notesCollection.delete(id);
