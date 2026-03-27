import type { Task } from "~/functions/tasks";
import { TaskItem } from "./TaskItem";

export function TaskList({
  tasks,
  onToggle,
  onDelete,
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <ul className="flex flex-col">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={() => onToggle(task)}
          onDelete={() => onDelete(task.id)}
        />
      ))}
    </ul>
  );
}
