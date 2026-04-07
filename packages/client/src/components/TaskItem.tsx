import { useRef, useState } from "react";
import type { Task } from "~/lib/types";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import { Calendar, GripVertical, Plus, X } from "lucide-react";
import { useSwipeReveal } from "~/lib/hooks/use-swipe-reveal";

// Evaluated once at module init — pointer type doesn't change during a session
const IS_TOUCH = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

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
  onOpen,
  onToggle,
  onDelete,
  onSetDueDate,
  onAddSubtask,
  subtasks = [],
  hideDate,
  isSubtask,
}: {
  task: Task;
  onOpen?: (id: string) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onSetDueDate: (task: Task, date: string | null) => void;
  onAddSubtask: (task: Task, title: string) => void;
  subtasks?: Task[];
  hideDate?: boolean;
  isSubtask?: boolean;
}) {
  const isDone = task.status === "done";
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;
  const showDate = !hideDate || (due && due.overdue);
  const dateRef = useRef<HTMLInputElement>(null);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const swipe = useSwipeReveal(!IS_TOUCH || !!isSubtask);
  const swipeEnabled = IS_TOUCH && !isSubtask;

  const openPicker = () => dateRef.current?.showPicker();

  const submitSubtask = () => {
    const title = subtaskTitle.trim();
    if (title) {
      onAddSubtask(task, title);
      setSubtaskTitle("");
      setAddingSubtask(false);
    }
  };

  return (
    <div data-task-id={task.id}>
      {/* Swipe container: clips the reveal drawer on touch, inert wrapper on desktop */}
      <div
        ref={swipe.containerRef}
        className={cn("-mx-2", swipeEnabled && "relative overflow-hidden rounded-lg")}
      >
        {/* Action drawer — revealed as row slides left */}
        {swipeEnabled && (
          <div
            className="absolute right-0 top-0 h-full w-[148px] flex items-stretch"
            aria-hidden="true"
          >
            <button
              onClick={() => {
                openPicker();
                swipe.close();
              }}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-hint transition-colors active:bg-muted/60"
            >
              <Calendar size={15} />
              <span className="text-[10px]">Date</span>
            </button>
            {!isDone && (
              <button
                onClick={() => {
                  setAddingSubtask(true);
                  swipe.close();
                }}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 text-hint transition-colors active:bg-muted/60"
              >
                <Plus size={15} />
                <span className="text-[10px]">Sub</span>
              </button>
            )}
            <button
              onClick={() => {
                onDelete(task);
                swipe.close();
              }}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-destructive transition-colors active:bg-destructive/10"
              aria-label="Delete task"
            >
              <X size={15} />
              <span className="text-[10px]">Delete</span>
            </button>
          </div>
        )}

        {/* Row content — slides left on swipe */}
        <div
          ref={swipe.contentRef}
          className={cn(
            "group/task flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-muted/50 animate-[task-enter_200ms_ease-out]",
            isSubtask && "py-1",
            // relative + bg-card: positions this row above the absolute drawer in the CSS
            // stacking order (static < absolute, so without relative the drawer bleeds through)
            swipeEnabled && "relative bg-card",
          )}
        >
          {!isSubtask && (
            <span
              className="mt-0.5 flex cursor-grab items-center text-transparent transition-colors group-hover/task:text-ghost touch:text-hint active:cursor-grabbing"
              onTouchStart={(e) => e.stopPropagation()}
            >
              <GripVertical size={14} />
            </span>
          )}
          {isSubtask && <span className="w-3.5" />}
          <Checkbox checked={isDone} onCheckedChange={() => onToggle(task)} className="mt-0.5" />
          {onOpen ? (
            <button
              type="button"
              className="flex min-w-0 flex-1 flex-col cursor-pointer text-left"
              onClick={() => onOpen(task.id)}
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
            </button>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col">
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
          )}
          <input
            ref={dateRef}
            type="date"
            className="invisible absolute size-0"
            value={task.dueDate ?? ""}
            tabIndex={-1}
            onChange={(e) => onSetDueDate(task, e.target.value || null)}
          />
          {due && showDate ? (
            <button
              type="button"
              onClick={openPicker}
              className={cn(
                "mt-0.5 whitespace-nowrap text-xs cursor-pointer hover:underline",
                isDone ? "text-muted-foreground" : due.overdue ? "text-destructive" : "text-date",
              )}
            >
              {due.label}
            </button>
          ) : (
            !isDone && (
              <button
                type="button"
                onClick={openPicker}
                className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground opacity-0 transition-opacity hover:underline group-hover/task:opacity-100 touch:hidden"
              >
                set date
              </button>
            )
          )}
          {task.assignee && (
            <span
              title={task.assignee.name}
              className="mt-0.5 shrink-0 size-5 rounded-full bg-primary-subtle text-primary text-[10px] font-semibold flex items-center justify-center"
            >
              {task.assignee.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          {!isSubtask && !isDone && (
            <button
              type="button"
              onClick={() => setAddingSubtask(true)}
              className="mt-1 text-transparent transition-colors hover:text-foreground group-hover/task:text-ghost touch:hidden"
              aria-label="Add subtask"
            >
              <Plus size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="mt-1 text-transparent transition-colors hover:text-destructive group-hover/task:text-ghost touch:text-hint touch:hover:text-destructive"
            aria-label="Delete task"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!isSubtask && subtasks.length > 0 && (
        <div className="ml-6 border-l border-ghost pl-2">
          {subtasks.map((sub) => (
            <TaskItem
              key={sub.id}
              task={sub}
              isSubtask
              onOpen={onOpen}
              onToggle={onToggle}
              onDelete={onDelete}
              onSetDueDate={onSetDueDate}
              onAddSubtask={onAddSubtask}
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
            // eslint-disable-next-line jsx-a11y/no-autofocus
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
