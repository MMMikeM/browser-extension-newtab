import { Temporal } from "temporal-polyfill";
import { useEffect, useRef, useState, type CSSProperties, type RefCallback } from "react";
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

const swipeActionClass =
  "flex flex-1 flex-col items-center justify-center gap-1 text-hint transition-colors active:bg-secondary active:text-foreground";

// Long enough to see the tick and to undo a mis-click
const COMPLETE_LINGER_MS = 450;

// Must match the hover actions: size-6 buttons, gap-0.5, plus clearance from the meta
const hoverActionsWidth = (count: number) => `${count * 1.5 + (count - 1) * 0.125 + 0.5}rem`;

const formatDueDate = (dateStr: string) => {
  const date = Temporal.PlainDate.from(dateStr.slice(0, 10));
  const today = Temporal.Now.plainDateISO();
  const diffDays = date.since(today, { largestUnit: "day" }).days;

  if (diffDays < 0) return { label: `${-diffDays}d ago`, overdue: true };
  if (diffDays === 0) return { label: "Today", overdue: false };
  if (diffDays === 1) return { label: "Tomorrow", overdue: false };
  return {
    // Device locale: "2 Oct" on en-GB, "Oct 2" on en-US
    label: date.toLocaleString(undefined, { month: "short", day: "numeric" }),
    overdue: false,
  };
};

const sharedWithNames = (task: Task, currentUserId: string, isOwned: boolean) => {
  const names: string[] = [];
  if (!isOwned && task.user?.name) names.push(task.user.name);
  for (const s of task.shares) {
    if (s.sharedWithUser?.id !== currentUserId && s.sharedWithUser?.name)
      names.push(s.sharedWithUser.name);
  }
  return names;
};

function ShareBadges({ names }: { names: string[] }) {
  return (
    <div className="flex items-center [&>:not(:first-child)]:-ml-1">
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
  swipeHint = false,
  dragHandleRef,
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
  swipeHint?: boolean;
  dragHandleRef?: RefCallback<HTMLElement>;
}) {
  const currentUserId = useOptimisticUserId();
  const isOwned = task.userId === currentUserId;
  const isDone = task.status === "done";
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;
  const showDate = !!due && (!hideDate || due.overdue);
  const shareNames =
    !isSubtask && !isInSharedCategory && task.shares.length > 0
      ? sharedWithNames(task, currentUserId, isOwned)
      : [];
  const hasMeta = showDate || shareNames.length > 0 || !!task.assignee;
  const canSetDate = !isDone && !showDate;
  const canAddSubtask = !isSubtask && !isDone;
  const hoverActionCount = 1 + Number(canSetDate) + Number(canAddSubtask);
  const dateRef = useRef<HTMLInputElement>(null);
  const [completing, setCompleting] = useState(false);
  const completeTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(completeTimer.current), []);
  const looksDone = isDone || completing;
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const {
    containerRef,
    contentRef,
    isOpen: isSwipeOpen,
    close: closeSwipe,
  } = useSwipeReveal(!IS_TOUCH || !!isSubtask, swipeHint);
  const swipeEnabled = IS_TOUCH && !isSubtask;

  const openPicker = () => dateRef.current?.showPicker();

  const handleCheck = () => {
    if (isDone) return onToggle(task);
    if (completing) {
      window.clearTimeout(completeTimer.current);
      setCompleting(false);
      return;
    }
    setCompleting(true);
    completeTimer.current = window.setTimeout(() => onToggle(task), COMPLETE_LINGER_MS);
  };

  const titleClass = cn(
    // Wrap rather than truncate: the column is narrow on both targets
    "line-clamp-2 font-medium break-words",
    looksDone && "text-muted-foreground line-through",
    isSubtask && "text-sm",
  );

  const titleColumnClass = cn(
    "flex min-w-0 flex-1 flex-col text-left group-hover/task:fade-under-actions group-has-[:focus-visible]/task:fade-under-actions",
    // Hit area spans the row's vertical padding
    isSubtask ? "-my-1.5 py-1.5" : "-my-2.5 py-2.5",
  );

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
          "-mx-2 animate-[task-enter_200ms_ease-out] motion-reduce:animate-none",
          swipeEnabled && "group/swipe relative overflow-hidden rounded-lg",
        )}
      >
        {/* Action drawer — revealed as row slides left */}
        {swipeEnabled && (
          // inert while closed: the tray sits under the row, so it must not be
          // focusable or announced until the row is swiped open.
          <div
            className="invisible absolute top-0 right-0 flex h-full w-[148px] items-stretch bg-muted group-data-[swiping]/swipe:visible"
            inert={!isSwipeOpen}
          >
            <button
              onClick={() => {
                openPicker();
                closeSwipe();
              }}
              className={swipeActionClass}
            >
              <Calendar size={16} />
              <span className="text-xs">Date</span>
            </button>
            {!isDone && (
              <button
                onClick={() => {
                  setAddingSubtask(true);
                  closeSwipe();
                }}
                className={swipeActionClass}
              >
                <Plus size={16} />
                <span className="text-xs">Subtask</span>
              </button>
            )}
            <button
              onClick={() => {
                onDelete(task);
                closeSwipe();
              }}
              className={cn(
                swipeActionClass,
                "bg-destructive-subtle text-destructive active:bg-destructive/20",
              )}
            >
              <X size={16} />
              <span className="text-xs">Delete</span>
            </button>
          </div>
        )}

        {/* Row content — slides left on swipe */}
        <div
          ref={contentRef}
          style={{ "--actions-w": hoverActionsWidth(hoverActionCount) } as CSSProperties}
          className={cn(
            "group/task relative flex items-start gap-2 rounded-lg px-2 py-2.5 transition-[background-color,opacity] duration-300 hover:bg-muted/50 touch:gap-2.5",
            completing && "opacity-60",
            isSubtask && "py-1.5",
            // Opaque only while swiping, to cover the tray. rounded-none: the container owns the corners.
            swipeEnabled && "rounded-none group-data-[swiping]/swipe:bg-card",
          )}
        >
          {!isSubtask && (
            // Desktop: hangs in the gutter. Touch: a 44px grab target on the first title line.
            <span
              ref={dragHandleRef}
              aria-label={dragHandleRef ? "Drag to reorder" : undefined}
              className={cn(
                "absolute top-2.5 -left-3.5 flex h-6 w-3.5 cursor-grab items-center justify-center rounded-sm text-transparent transition-colors group-hover/task:text-ghost focus-visible:text-hint active:cursor-grabbing touch:static touch:-my-2.5 touch:-ml-1 touch:h-11 touch:w-6 touch:text-hint",
                // Done rows aren't sortable; the box stays for alignment
                isDone && "invisible",
              )}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <GripVertical size={14} />
            </span>
          )}
          <Checkbox
            checked={looksDone}
            onCheckedChange={handleCheck}
            aria-label={task.title}
            // Pinned to the first line of the title, which can wrap
            className={cn(
              "mt-1 touch:mt-[3px] touch:size-[18px] touch:after:-inset-3",
              isSubtask && "mt-0.5 touch:mt-px",
            )}
          />
          {onOpen ? (
            <button
              type="button"
              className={cn(titleColumnClass, "cursor-pointer")}
              onClick={() => onOpen(task.id)}
            >
              <span className={titleClass}>{task.title}</span>
              {task.description && (
                <span className="truncate text-xs text-hint">{task.description}</span>
              )}
            </button>
          ) : (
            <div className={titleColumnClass}>
              <span className={titleClass}>{task.title}</span>
              {task.description && (
                <span className="truncate text-xs text-hint">{task.description}</span>
              )}
            </div>
          )}
          <input
            ref={dateRef}
            type="date"
            className="invisible absolute size-0"
            // Date-only input: a datetime dueDate (set from the detail view) would be invalid here
            value={task.dueDate?.slice(0, 10) ?? ""}
            tabIndex={-1}
            onChange={(e) => onSetDueDate(task, e.target.value || null)}
          />
          {hasMeta && (
            <div
              className={cn(
                "flex shrink-0 items-center gap-2 transition-transform duration-150 ease-out group-hover/task:translate-x-[calc(var(--actions-w)*-1)] group-has-[:focus-visible]/task:translate-x-[calc(var(--actions-w)*-1)] motion-reduce:transition-none",
                isSubtask ? "h-5" : "h-6",
              )}
            >
              {due && showDate && (
                <button
                  type="button"
                  onClick={openPicker}
                  className={cn(
                    "relative cursor-pointer text-xs whitespace-nowrap after:absolute after:-inset-x-1.5 after:-inset-y-2.5 hover:underline",
                    isDone ? "text-muted-foreground" : due.overdue ? "text-destructive" : "text-date",
                  )}
                >
                  {due.label}
                </button>
              )}
              {shareNames.length > 0 && <ShareBadges names={shareNames} />}
              {task.assignee && <InitialsAvatar name={task.assignee.name} size="sm" />}
            </div>
          )}
          <div
            className={cn(
              "pointer-events-none absolute right-2 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/task:pointer-events-auto group-hover/task:opacity-100 group-has-[:focus-visible]/task:pointer-events-auto group-has-[:focus-visible]/task:opacity-100 touch:hidden",
              isSubtask ? "top-1.5 h-5" : "top-2.5 h-6",
            )}
          >
            {canSetDate && (
              <Button
                variant="subtle"
                size="xs"
                icon
                onClick={openPicker}
                aria-label="Set due date"
                title="Set due date"
              >
                <Calendar size={14} />
              </Button>
            )}
            {canAddSubtask && (
              <Button
                variant="subtle"
                size="xs"
                icon
                onClick={() => setAddingSubtask(true)}
                aria-label="Add subtask"
                title="Add subtask"
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
              aria-label="Delete task"
              title="Delete task"
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      </div>

      {!isSubtask && subtasks.length > 0 && (
        <div className="mt-1 ml-2 border-l border-ghost pl-[15px] touch:ml-[38px] touch:pl-[19px]">
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
          className="mb-1 ml-6 touch:ml-[58px]"
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
            // Phones keep the primitive's 16px so iOS doesn't zoom on focus
            className="md:h-7 md:text-xs"
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
