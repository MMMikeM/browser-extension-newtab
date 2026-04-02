import type { Task } from "~/rpc/tasks";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const formatDueDate = (dateStr: string) => {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: `${-diffDays}d ago`, overdue: true };
  if (diffDays === 0) return { label: "Today", overdue: false };
  if (diffDays === 1) return { label: "Tomorrow", overdue: false };
  return {
    label: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
    overdue: false,
  };
};

export function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isDone = task.status === "done";
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <li className="flex items-center gap-3 py-1.5">
      <Checkbox checked={isDone} onCheckedChange={onToggle} />
      <span className={cn("flex-1", isDone && "text-muted-foreground line-through")}>
        {task.title}
      </span>
      {due && (
        <span
          className={cn(
            "text-xs",
            isDone
              ? "text-muted-foreground"
              : due.overdue
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {due.label}
        </span>
      )}
      <Button variant="ghost" size="icon-xs" onClick={onDelete}>
        x
      </Button>
    </li>
  );
}
