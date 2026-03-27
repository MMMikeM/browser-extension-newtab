import { useQuery, useMutation, useQueryClient, queryOptions, type QueryKey } from "@tanstack/react-query";
import { createId } from "@paralleldrive/cuid2";
import { generateKeyBetween } from "fractional-indexing";
import { getTasks, createTask, updateTask, deleteTask } from "../functions/tasks";
import type { Task } from "../functions/tasks";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      invalidates?: QueryKey[];
    };
  }
}

const TOKEN_KEY = "newtab-todo-token";
const TASKS_KEY = ["tasks"] as const;

function hasSyncToken() {
  return typeof window !== "undefined" && !!localStorage.getItem(TOKEN_KEY);
}

const tasksQueryOptions = () =>
  queryOptions({
    queryKey: TASKS_KEY,
    queryFn: async () => {
      if (!hasSyncToken()) return [];
      return getTasks();
    },
  });

export const useTasks = () => useQuery(tasksQueryOptions());

export const useAddTask = () => {
  const qc = useQueryClient();
  const { data: tasks = [] } = useTasks();
  const mutation = useMutation({
    mutationFn: createTask,
    meta: { invalidates: [TASKS_KEY] },
    onMutate: async ({ data }) => {
      await qc.cancelQueries(tasksQueryOptions());
      qc.setQueryData(TASKS_KEY, (old: Task[] = []) => [
        ...old,
        { ...data, status: "todo", description: null, createdAt: "", updatedAt: "" } as Task,
      ]);
    },
  });

  return {
    ...mutation,
    add: (title: string) => {
      const lastOrder = tasks.length > 0 ? tasks[tasks.length - 1].sortOrder : null;
      mutation.mutate({
        data: { id: createId(), title, sortOrder: generateKeyBetween(lastOrder, null) },
      });
    },
  };
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    meta: { invalidates: [TASKS_KEY] },
    onMutate: async ({ data: { id, ...fields } }) => {
      await qc.cancelQueries(tasksQueryOptions());
      qc.setQueryData(TASKS_KEY, (old: Task[] = []) =>
        old.map((t) => (t.id === id ? { ...t, ...fields } : t)),
      );
    },
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    meta: { invalidates: [TASKS_KEY] },
    onMutate: async ({ data: { id } }) => {
      await qc.cancelQueries(tasksQueryOptions());
      qc.setQueryData(TASKS_KEY, (old: Task[] = []) => old.filter((t) => t.id !== id));
    },
  });
};
