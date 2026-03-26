import type { Task } from "../functions/tasks";
import { TaskItem } from "./TaskItem";

export function TaskList({
  tasks,
  pendingUpdateId,
  pendingDeleteId,
  onToggle,
  onDelete,
}: {
  tasks: Task[];
  pendingUpdateId: string | null;
  pendingDeleteId: string | null;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          pending={pendingUpdateId === task.id || pendingDeleteId === task.id}
          onToggle={() => onToggle(task)}
          onDelete={() => onDelete(task.id)}
        />
      ))}
    </ul>
  );
}
