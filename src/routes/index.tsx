import { createFileRoute } from "@tanstack/react-router";
import { useTasks, useAddTask, useUpdateTask, useDeleteTask } from "~/lib/hooks";
import type { Task } from "~/functions/tasks";
import { TokenGate } from "~/components/TokenGate";
import { AddTaskInput } from "~/components/AddTaskInput";
import { TaskItem } from "~/components/TaskItem";
import { TaskList } from "~/components/TaskList";

export const Route = createFileRoute("/")({
  component: () => (
    <TokenGate>
      <TaskApp />
    </TokenGate>
  ),
});

function TaskApp() {
  const { data: tasks = [], isLoading } = useTasks();
  const addTask = useAddTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  const pendingDeleteId = deleteTask.isPending ? (deleteTask.variables?.data.id ?? null) : null;
  const pendingUpdate = updateTask.isPending ? (updateTask.variables?.data ?? null) : null;

  const visibleTasks = tasks
    .filter((t) => t.id !== pendingDeleteId)
    .map((t) => (pendingUpdate?.id === t.id ? ({ ...t, ...pendingUpdate } as Task) : t));

  const activeTasks = visibleTasks.filter((t) => t.status !== "done");
  const doneTasks = visibleTasks.filter((t) => t.status === "done");

  const handleToggle = (task: Task) =>
    updateTask.mutate({
      data: {
        id: task.id,
        status: task.status === "done" ? "todo" : "done",
        updatedAt: new Date().toISOString(),
      },
    });

  const handleDelete = (id: string) => deleteTask.mutate({ data: { id } });

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Tasks</h1>
      <AddTaskInput onAdd={(title) => addTask.add(title)} />
      <div className="mt-4 flex flex-col gap-6">
        <TaskList
          tasks={activeTasks}
          pendingUpdateId={pendingUpdate?.id ?? null}
          pendingDeleteId={pendingDeleteId}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
        {addTask.isPending && (
          <ul className="flex flex-col">
            <TaskItem
              task={
                {
                  ...addTask.variables!.data,
                  status: "todo",
                  description: null,
                  sortOrder: null,
                  createdAt: "",
                  updatedAt: "",
                } as Task
              }
              pending
              onToggle={() => {}}
              onDelete={() => {}}
            />
          </ul>
        )}
        {doneTasks.length > 0 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold text-muted-foreground">Done</h2>
            <TaskList
              tasks={doneTasks}
              pendingUpdateId={pendingUpdate?.id ?? null}
              pendingDeleteId={pendingDeleteId}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </div>
  );
}
