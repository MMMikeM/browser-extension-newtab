import { createId } from "@paralleldrive/cuid2";
import { generateKeyBetween } from "fractional-indexing";
import { createModelHooks } from "~/lib/sync/create-hooks";
import { tasks$, users$, notes$ } from "~/lib/stores";
import type { Task } from "~/rpc/tasks";
import type { User } from "~/rpc/users";
import type { Note } from "~/rpc/notes";

const bySortOrder = (a: Task, b: Task) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? "");

const {
  useList: useTasks,
  useUpdate: useUpdateTask,
  useDelete: useDeleteTask,
} = createModelHooks<Task>(tasks$, { sort: bySortOrder });

const useAddTask = () => ({
  add: (title: string) => {
    const tasksMap = tasks$.peek() ?? {};
    const sorted = (Object.values(tasksMap) as Task[]).sort(bySortOrder);
    const lastOrder = sorted.length > 0 ? sorted[sorted.length - 1].sortOrder : null;
    const id = createId();
    tasks$[id].set({
      id,
      title,
      status: "todo",
      description: null,
      sortOrder: generateKeyBetween(lastOrder, null),
    } as Task);
  },
});

export { useTasks, useAddTask, useUpdateTask, useDeleteTask };

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
