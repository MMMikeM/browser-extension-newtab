import { useRef, useState } from "react";
import type { Task } from "~/lib/types";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { GripVertical, Plus, X } from "lucide-react";

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
  subtasks,
  onToggle,
  onDelete,
  onOpen,
  onSetDueDate,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenSubtask,
  hideDate,
  isSubtask,
}: {
  task: Task;
  subtasks?: Task[];
  onToggle: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  onSetDueDate?: (date: string | null) => void;
  onAddSubtask?: (title: string) => void;
  onToggleSubtask?: (task: Task) => void;
  onDeleteSubtask?: (id: string) => void;
  onOpenSubtask?: (id: string) => void;
  hideDate?: boolean;
  isSubtask?: boolean;
}) {
  const isDone = task.status === "done";
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;
  const showDate = !hideDate || (due && due.overdue);
  const dateRef = useRef<HTMLInputElement>(null);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const openPicker = () => {
    dateRef.current?.showPicker();
  };

  const submitSubtask = () => {
    const title = subtaskTitle.trim();
    if (title && onAddSubtask) {
      onAddSubtask(title);
      setSubtaskTitle("");
      setAddingSubtask(false);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "group/task -mx-2 flex items-start gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50 animate-[task-enter_200ms_ease-out]",
          isSubtask && "py-1.5",
        )}
      >
        {!isSubtask && (
          <span className="mt-0.5 flex cursor-grab items-center text-transparent transition-colors group-hover/task:text-ghost active:cursor-grabbing">
            <GripVertical size={14} />
          </span>
        )}
        {isSubtask && <span className="w-3.5" />}
        <Checkbox checked={isDone} onCheckedChange={onToggle} className="mt-0.5" />
        <div
          className={cn("flex min-w-0 flex-1 flex-col", onOpen && "cursor-pointer")}
          onClick={onOpen}
        >
          <span
            className={cn(
              "truncate font-medium",
              isDone && "text-muted-foreground line-through",
              isSubtask && "text-sm",
            )}
          >
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
              isDone ? "text-muted-foreground" : due.overdue ? "text-destructive" : "text-date",
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
        {onAddSubtask && !isSubtask && !isDone && (
          <button
            onClick={() => setAddingSubtask(true)}
            className="mt-1 text-transparent transition-colors hover:text-foreground group-hover/task:text-ghost"
            title="Add subtask"
          >
            <Plus size={14} />
          </button>
        )}
        <button
          onClick={onDelete}
          className="mt-1 text-transparent transition-colors hover:text-destructive group-hover/task:text-ghost"
        >
          <X size={14} />
        </button>
      </div>
      {subtasks && subtasks.length > 0 && (
        <div className="ml-6 border-l border-ghost pl-2">
          {subtasks.map((sub) => (
            <TaskItem
              key={sub.id}
              task={sub}
              isSubtask
              onToggle={() => onToggleSubtask?.(sub)}
              onDelete={() => onDeleteSubtask?.(sub.id)}
              onOpen={onOpenSubtask ? () => onOpenSubtask(sub.id) : undefined}
            />
          ))}
        </div>
      )}
      {addingSubtask && (
        <form
          className="ml-12 mb-1"
          onSubmit={(e) => {
            e.preventDefault();
            submitSubtask();
          }}
        >
          <Input
            type="text"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            placeholder="Subtask title..."
            className="h-7 text-xs"
            autoFocus
            onBlur={() => {
              if (!subtaskTitle.trim()) setAddingSubtask(false);
            }}
          />
        </form>
      )}
    </div>
  );
}
