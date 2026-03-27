import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { createId } from "@paralleldrive/cuid2";
import { generateKeyBetween } from "fractional-indexing";
import { getTasks, createTask, updateTask, deleteTask } from "../functions/tasks";

const tasksQueryOptions = () =>
  queryOptions({
    queryKey: ["tasks"] as const,
    queryFn: () => getTasks(),
  });

export const useTasks = () => useQuery(tasksQueryOptions());

export const useAddTask = () => {
  const qc = useQueryClient();
  const { data: tasks = [] } = useTasks();
  const mutation = useMutation({
    mutationFn: createTask,
    onSettled: () => qc.invalidateQueries(tasksQueryOptions()),
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
    onSettled: () => qc.invalidateQueries(tasksQueryOptions()),
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSettled: () => qc.invalidateQueries(tasksQueryOptions()),
  });
};
