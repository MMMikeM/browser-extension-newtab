import { Temporal } from "temporal-polyfill";
import { useRef, useState } from "react";
import type { Task } from "~/lib/types";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import { Calendar, GripVertical, Plus, X } from "lucide-react";
import { InitialsAvatar } from "~/components/ui/initials-avatar";
import { useSwipeReveal } from "~/lib/hooks/use-swipe-reveal";
import { useOptimisticUserId } from "~/lib/auth/current-user";

// Evaluated once at module init — pointer type doesn't change during a session
const IS_TOUCH = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const formatDueDate = (dateStr: string) => {
  const date = Temporal.PlainDate.from(dateStr.slice(0, 10));
  const today = Temporal.Now.plainDateISO();
  const diffDays = date.since(today, { largestUnit: "day" }).days;

  if (diffDays < 0) return { label: `${-diffDays}d ago`, overdue: true };
  if (diffDays === 0) return { label: "Today", overdue: false };
  if (diffDays === 1) return { label: "Tomorrow", overdue: false };
  return {
    label: date.toLocaleString("en", { month: "short", day: "numeric" }),
    overdue: false,
  };
};

function ShareBadges({
  task,
  currentUserId,
  isOwned,
}: {
  task: Task;
  currentUserId: string;
  isOwned: boolean;
}) {
  const otherShares = task.shares.filter((s) => s.sharedWithUser?.id !== currentUserId);
  const names: string[] = [];
  if (!isOwned && task.user?.name) names.push(task.user.name);
  for (const s of otherShares) if (s.sharedWithUser?.name) names.push(s.sharedWithUser.name);
  if (names.length === 0) return null;
  return (
    <div className="mt-0.5 flex items-center [&>:not(:first-child)]:-ml-1">
      {names.map((name) => (
        <InitialsAvatar key={name} name={name} className="bg-muted text-hint" />
      ))}
    </div>
  );
}

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
  isInSharedCategory = false,
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
  isInSharedCategory?: boolean;
}) {
  const currentUserId = useOptimisticUserId();
  const isOwned = task.userId === currentUserId;
  const isDone = task.status === "done";
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;
  const showDate = !hideDate || (due && due.overdue);
  const dateRef = useRef<HTMLInputElement>(null);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const { containerRef, contentRef, close: closeSwipe } = useSwipeReveal(!IS_TOUCH || !!isSubtask);
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
        ref={containerRef}
        className={cn(
          "-mx-2 animate-[task-enter_200ms_ease-out]",
          swipeEnabled && "relative overflow-hidden rounded-lg",
        )}
      >
        {/* Action drawer — revealed as row slides left */}
        {swipeEnabled && (
          <div
            className="absolute top-0 right-0 flex h-full w-[148px] items-stretch"
            aria-hidden="true"
          >
            <button
              onClick={() => {
                openPicker();
                closeSwipe();
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
                  closeSwipe();
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
                closeSwipe();
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
          ref={contentRef}
          className={cn(
            "group/task flex items-start gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50",
            isSubtask && "py-1.5",
            // relative + bg-card: positions this row above the absolute drawer in the CSS
            // stacking order (static < absolute, so without relative the drawer bleeds through)
            swipeEnabled && "relative bg-card",
          )}
        >
          {!isSubtask && (
            <span
              className="flex cursor-grab items-center self-center text-transparent transition-colors group-hover/task:text-ghost active:cursor-grabbing touch:text-hint"
              onTouchStart={(e) => e.stopPropagation()}
            >
              <GripVertical size={14} />
            </span>
          )}
          {isSubtask && <span className="w-1" />}
          <Checkbox
            checked={isDone}
            onCheckedChange={() => onToggle(task)}
            className="self-center"
          />
          {onOpen ? (
            <button
              type="button"
              className="flex min-w-0 flex-1 cursor-pointer flex-col text-left"
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
                <span className="truncate text-xs text-hint">{task.description}</span>
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
                <span className="truncate text-xs text-hint">{task.description}</span>
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
                "mt-0.5 cursor-pointer text-xs whitespace-nowrap hover:underline",
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
                className="mt-0.5 text-xs whitespace-nowrap text-ghost opacity-0 transition-opacity group-hover/task:opacity-100 hover:underline touch:hidden"
              >
                set date
              </button>
            )
          )}
          {!isSubtask && !isInSharedCategory && task.shares.length > 0 && (
            <ShareBadges task={task} currentUserId={currentUserId} isOwned={isOwned} />
          )}
          {task.assignee && (
            <InitialsAvatar name={task.assignee.name} size="sm" className="mt-0.5" />
          )}
          {!isSubtask && !isDone && (
            <Button
              variant="ghost"
              size="xs"
              icon
              onClick={() => setAddingSubtask(true)}
              className="mt-1 text-transparent group-hover/task:text-ghost hover:text-foreground touch:hidden"
              aria-label="Add subtask"
            >
              <Plus size={14} />
            </Button>
          )}
          <Button
            variant="subtle"
            intent="destructive"
            size="xs"
            icon
            onClick={() => onDelete(task)}
            className="mt-1 text-transparent group-hover/task:text-ghost touch:hidden"
            aria-label="Delete task"
          >
            <X size={14} />
          </Button>
        </div>
      </div>

      {!isSubtask && subtasks.length > 0 && (
        <div className="mt-1 ml-6 border-l border-ghost pl-2">
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
          className="mb-1 ml-12"
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
