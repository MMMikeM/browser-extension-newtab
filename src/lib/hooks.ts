import { createModelHooks } from "~/lib/sync/create-hooks";
import { categories$, tasks$, users$, notes$ } from "~/lib/stores";
import { addTask } from "~/lib/add-task";
import type { Category } from "~/rpc/categories";
import type { Task } from "~/rpc/tasks";
import type { User } from "~/rpc/users";
import type { Note } from "~/rpc/notes";

const bySortOrder = (a: Task, b: Task) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? "");

const {
  useList: useTasks,
  useUpdate: useUpdateTask,
  useDelete: useDeleteTask,
} = createModelHooks<Task>(tasks$, { sort: bySortOrder });

const useAddTask = () => ({ add: addTask });

export { useTasks, useAddTask, useUpdateTask, useDeleteTask };

const byCategorySortOrder = (a: Category, b: Category) =>
  (a.sortOrder ?? "").localeCompare(b.sortOrder ?? "");

export const {
  useList: useCategories,
  useAdd: useAddCategory,
  useUpdate: useUpdateCategory,
  useDelete: useDeleteCategory,
} = createModelHooks<Category>(categories$, { sort: byCategorySortOrder });

export const {
  useList: useUsers,
  useAdd: useAddUser,
  useUpdate: useUpdateUser,
  useDelete: useDeleteUser,
} = createModelHooks<User>(users$, {
  sort: (a, b) => a.name.localeCompare(b.name),
});

export const {
  useList: useNotes,
  useAdd: useAddNote,
  useUpdate: useUpdateNote,
  useDelete: useDeleteNote,
} = createModelHooks<Note>(notes$, {
  sort: (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
});
