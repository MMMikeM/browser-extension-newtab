import { createFileRoute } from "@tanstack/react-router";
import { useTasks, useAddTask, useUpdateTask, useDeleteTask } from "../lib/hooks";
import type { Task } from "../functions/tasks";
import { TokenGate } from "../components/TokenGate";
import { AddTaskInput } from "../components/AddTaskInput";
import { TaskItem } from "../components/TaskItem";
import { TaskList } from "../components/TaskList";

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

  if (isLoading) return <div style={{ padding: "2rem" }}>Loading...</div>;

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
    <div style={{ padding: "2rem", maxWidth: 600 }}>
      <h1>Tasks</h1>
      <AddTaskInput onAdd={(title) => addTask.add(title)} />
      <TaskList
        tasks={activeTasks}
        pendingUpdateId={pendingUpdate?.id ?? null}
        pendingDeleteId={pendingDeleteId}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
      {addTask.isPending && (
        <ul style={{ listStyle: "none", padding: 0 }}>
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
        <>
          <h2>Done</h2>
          <TaskList
            tasks={doneTasks}
            pendingUpdateId={pendingUpdate?.id ?? null}
            pendingDeleteId={pendingDeleteId}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}
