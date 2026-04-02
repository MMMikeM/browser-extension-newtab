import { useRef } from "react";
import type { Task } from "~/rpc/tasks";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { DragDropVerticalIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
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
    <div className="group/task -mx-2 flex items-start gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50 animate-[task-enter_200ms_ease-out]">
      <span className="mt-0.5 flex cursor-grab items-center text-muted-foreground/0 transition-colors group-hover/task:text-muted-foreground/50 active:cursor-grabbing">
        <HugeiconsIcon icon={DragDropVerticalIcon} size={14} />
      </span>
      <Checkbox checked={isDone} onCheckedChange={onToggle} className="mt-0.5" />
      <div
        className={cn("flex min-w-0 flex-1 flex-col", onOpen && "cursor-pointer")}
        onClick={onOpen}
      >
        <span className={cn("truncate font-medium", isDone && "text-muted-foreground line-through")}>
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
            "mt-0.5 whitespace-nowrap text-xs",
            onSetDueDate && "cursor-pointer hover:underline",
            isDone
              ? "text-muted-foreground"
              : due.overdue
                ? "text-destructive"
                : "text-date",
          )}
        >
          {due.label}
        </button>
      ) : (
        onSetDueDate &&
        !isDone && (
          <button
            onClick={openPicker}
            className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground opacity-0 transition-opacity hover:underline group-hover/task:opacity-100"
          >
            set date
          </button>
        )
      )}
      <button
        onClick={onDelete}
        className="mt-1 text-muted-foreground/0 transition-colors hover:text-destructive group-hover/task:text-muted-foreground/40"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={14} />
      </button>
    </div>
  );
}
