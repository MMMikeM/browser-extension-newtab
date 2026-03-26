import type { Task } from "../functions/tasks";

export function TaskItem({
  task,
  pending,
  onToggle,
  onDelete,
}: {
  task: Task;
  pending?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.25rem 0",
        opacity: pending ? 0.5 : 1,
      }}
    >
      <input type="checkbox" checked={task.status === "done"} onChange={onToggle} disabled={pending} />
      <span style={{ flex: 1, textDecoration: task.status === "done" ? "line-through" : "none" }}>
        {task.title}
      </span>
      <button onClick={onDelete} disabled={pending} style={{ cursor: "pointer" }}>
        x
      </button>
    </li>
  );
}
