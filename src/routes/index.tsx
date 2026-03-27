import { createFileRoute } from "@tanstack/react-router";
import { useTasks, useAddTask, useUpdateTask, useDeleteTask } from "~/lib/hooks";
import type { Task } from "~/functions/tasks";
import { AddTaskInput } from "~/components/AddTaskInput";
import { TaskList } from "~/components/TaskList";

export const Route = createFileRoute("/")({
  component: TaskApp,
});

function TaskApp() {
  const { data: tasks = [] } = useTasks();
  const addTask = useAddTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

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
        <TaskList tasks={activeTasks} onToggle={handleToggle} onDelete={handleDelete} />
        {doneTasks.length > 0 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold text-muted-foreground">Done</h2>
            <TaskList tasks={doneTasks} onToggle={handleToggle} onDelete={handleDelete} />
          </div>
        )}
      </div>
    </div>
  );
}
