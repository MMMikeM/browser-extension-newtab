import { useValue } from "@legendapp/state/react";
import { createId } from "@paralleldrive/cuid2";
import { generateKeyBetween } from "fractional-indexing";
import { tasks$ } from "./store";
import type { Task } from "~/functions/tasks";

export function useTasks() {
  const tasksMap = useValue(tasks$);
  const tasks = tasksMap
    ? (Object.values(tasksMap) as Task[]).sort((a, b) =>
        (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""),
      )
    : [];
  return { data: tasks };
}

export function useAddTask() {
  return {
    add: (title: string) => {
      const tasksMap = tasks$.peek() ?? {};
      const sorted = (Object.values(tasksMap) as Task[]).sort((a, b) =>
        (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""),
      );
      const lastOrder = sorted.length > 0 ? sorted[sorted.length - 1].sortOrder : null;
      const id = createId();
      tasks$[id].set({
        id,
        title,
        status: "todo",
        description: null,
        sortOrder: generateKeyBetween(lastOrder, null),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Task);
    },
  };
}

export function useUpdateTask() {
  return {
    mutate: ({ data: { id, ...fields } }: { data: { id: string; [k: string]: unknown } }) => {
      tasks$[id].assign(fields);
    },
  };
}

export function useDeleteTask() {
  return {
    mutate: ({ data: { id } }: { data: { id: string } }) => {
      tasks$[id]?.delete();
    },
  };
}
