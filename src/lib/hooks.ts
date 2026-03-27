import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
  type QueryKey,
} from "@tanstack/react-query";
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

const TASKS_KEY = ["tasks"] as const;

const tasksQueryOptions = () =>
  queryOptions({
    queryKey: TASKS_KEY,
    queryFn: () => getTasks(),
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
      const previous = qc.getQueryData(TASKS_KEY);
      qc.setQueryData(TASKS_KEY, (old: Task[] = []) => [
        ...old,
        { ...data, status: "todo", description: null, createdAt: "", updatedAt: "" } as Task,
      ]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
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
      const previous = qc.getQueryData(TASKS_KEY);
      qc.setQueryData(TASKS_KEY, (old: Task[] = []) =>
        old.map((t) => (t.id === id ? { ...t, ...fields } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
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
      const previous = qc.getQueryData(TASKS_KEY);
      qc.setQueryData(TASKS_KEY, (old: Task[] = []) => old.filter((t) => t.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
    },
  });
};
