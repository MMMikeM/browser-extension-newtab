import { useRef } from "react";
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
  onOpen,
  onSetDueDate,
  hideDate,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  onSetDueDate?: (date: string | null) => void;
  hideDate?: boolean;
}) {
  const isDone = task.status === "done";
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;
  const showDate = !hideDate || (due && due.overdue);
  const dateRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    dateRef.current?.showPicker();
  };

  return (
    <div className="group/task flex items-center gap-3 py-1.5">
      <Checkbox checked={isDone} onCheckedChange={onToggle} />
      <div
        className={cn("flex min-w-0 flex-1 flex-col", onOpen && "cursor-pointer")}
        onClick={onOpen}
      >
        <span className={cn("truncate", isDone && "text-muted-foreground line-through")}>
          {task.title}
        </span>
        {task.description && (
          <span className="truncate text-xs text-muted-foreground">{task.description}</span>
        )}
      </div>
      {onSetDueDate && (
        <input
          ref={dateRef}
          type="date"
          className="invisible absolute size-0"
          value={task.dueDate ?? ""}
          tabIndex={-1}
          onChange={(e) => onSetDueDate(e.target.value || null)}
        />
      )}
      {due && showDate ? (
        <button
          onClick={onSetDueDate ? openPicker : undefined}
          className={cn(
            "text-xs",
            onSetDueDate && "cursor-pointer hover:underline",
            isDone
              ? "text-muted-foreground"
              : due.overdue
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {due.label}
        </button>
      ) : (
        onSetDueDate &&
        !isDone && (
          <button
            onClick={openPicker}
            className="text-xs text-muted-foreground opacity-0 transition-opacity hover:underline group-hover/task:opacity-100"
          >
            set date
          </button>
        )
      )}
      <Button variant="ghost" size="icon-xs" onClick={onDelete}>
        x
      </Button>
    </div>
  );
}
