import { createFileRoute } from "@tanstack/react-router";
import { useTasks, useUpdateTask, useDeleteTask } from "~/lib/hooks";
import type { Task } from "~/rpc/tasks";
import { TaskList } from "~/components/TaskList";

export const Route = createFileRoute("/")({
  component: TaskListView,
});

function TaskListView() {
  const { data: tasks = [] } = useTasks();
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
    <>
      <TaskList tasks={activeTasks} onToggle={handleToggle} onDelete={handleDelete} />
      {doneTasks.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold text-muted-foreground">Done</h2>
          <TaskList tasks={doneTasks} onToggle={handleToggle} onDelete={handleDelete} />
        </div>
      )}
    </>
  );
}
