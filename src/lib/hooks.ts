import { createModelHooks } from "~/lib/sync/create-hooks";
import { categories$, tasks$, notes$ } from "~/lib/stores";
import type { Category } from "~/rpc/categories";
import type { Task } from "~/rpc/tasks";
import type { Note } from "~/rpc/notes";

const bySortOrder = (a: Task, b: Task) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? "");

const {
  useList: useTasks,
  useUpdate: useUpdateTask,
  useDelete: useDeleteTask,
} = createModelHooks<Task>(tasks$, { sort: bySortOrder });

export { useTasks, useUpdateTask, useDeleteTask };

const byCategorySortOrder = (a: Category, b: Category) =>
  (a.sortOrder ?? "").localeCompare(b.sortOrder ?? "");

export const {
  useList: useCategories,
  useAdd: useAddCategory,
  useUpdate: useUpdateCategory,
  useDelete: useDeleteCategory,
} = createModelHooks<Category>(categories$, { sort: byCategorySortOrder });

export const {
  useList: useNotes,
  useAdd: useAddNote,
  useUpdate: useUpdateNote,
  useDelete: useDeleteNote,
} = createModelHooks<Note>(notes$, {
  sort: (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
});

