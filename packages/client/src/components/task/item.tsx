import {
  memo,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type RefCallback,
} from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import type { Task } from "~/lib/types";
import { Button } from "~/components/ui/button";
import { Checkbox, checkboxDoneClass } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import { Calendar, Plus, Users, X } from "lucide-react";
import { InitialsAvatar } from "~/components/ui/initials-avatar";
import { useSwipeReveal } from "~/lib/hooks/use-swipe-reveal";
import { useOptimisticUserId } from "~/lib/auth/current-user";
import { canDeleteTask } from "~/lib/task-permissions";
import { rowDragSensors } from "./row-drag";
import { formatDueDate } from "~/lib/due-date";

// Read once: pointer type doesn't change during a session
const IS_TOUCH = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

// The tray's grid gives every cell the widest one's width, so labels set the size and never clip
const swipeCellClass =
  "flex min-w-14 flex-col items-center justify-center gap-1 px-2.5 text-xs whitespace-nowrap";
const swipeActionClass = cn(
  swipeCellClass,
  "text-hint transition-colors active:bg-secondary active:text-foreground",
);

// Long enough to see the tick and to undo a mis-click
const COMPLETE_LINGER_MS = 450;

// Must match the hover actions: size-6 buttons, gap-0.5, plus clearance from the meta
const hoverActionsWidth = (count: number) =>
  count === 0 ? "0rem" : `${count * 1.5 + (count - 1) * 0.125 + 0.5}rem`;

// Only a task created moments ago, here or on another device, slides in. Rows that already
// existed appear at once, so loading, switching lists or opening Done shows them without a fade.
const ENTER_WINDOW_MS = 3000;
const isJustCreated = (task: Task) => Date.now() - Date.parse(task.createdAt) < ENTER_WINDOW_MS;

const listNames = new Intl.ListFormat(undefined, { type: "conjunction" });

// As in the sidebar: a face always means whose task it is, so a task you shared never shows a
// recipient's face
function ShareChip({ ownerName, sharedWith }: { ownerName?: string; sharedWith: string[] }) {
  if (ownerName)
    return (
      <InitialsAvatar
        name={ownerName}
        label={`${ownerName}'s task`}
        className="bg-collab text-collab-foreground"
      />
    );

  const label = `Shared with ${listNames.format(sharedWith)}`;
  return (
    <span title={label} className="flex size-5.5 shrink-0 items-center justify-center text-hint">
      <Users size={14} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function TaskRow({
  task,
  onOpen,
  onToggle,
  onDelete,
  onSetDueDate,
  onAddSubtask,
  subtasks = [],
  parent,
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
  parent?: Task;
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
  const showsSharing = !isSubtask && !isInSharedCategory && task.shares.length > 0;
  const ownerName = showsSharing && !isOwned ? task.user?.name : undefined;
  const sharedWith =
    showsSharing && isOwned
      ? task.shares.flatMap((s) =>
          s.sharedWithUser && s.sharedWithUser.id !== currentUserId ? [s.sharedWithUser.name] : [],
        )
      : [];
  const hasShareChip = !!ownerName || sharedWith.length > 0;
  const hasMeta = showDate || hasShareChip || !!task.assignee;
  const canSetDate = !isDone && !showDate;
  const canAddSubtask = !isSubtask && !isDone;
  const canDelete = canDeleteTask(currentUserId, task, parent);
  const hoverActionCount = Number(canSetDate) + Number(canAddSubtask) + Number(canDelete);
  const dateRef = useRef<HTMLInputElement>(null);
  const [entering] = useState(() => isJustCreated(task));
  const [completing, setCompleting] = useState(false);
  const completeTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(completeTimer.current), []);
  const looksDone = isDone || completing;
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const {
    containerRef,
    contentRef,
    trayRef,
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
    "flex min-w-0 flex-1 flex-col text-left group-hover/task:fade-under-actions task-focus-visible:fade-under-actions",
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

  const openSubtasks = subtasks.filter((s) => s.status !== "done");
  // Ticking a parent ticks its subtasks, so on a done row the count only repeats the tick
  const doneSubtaskCount = isDone ? 0 : subtasks.length - openSubtasks.length;

  return (
    <div
      data-task-id={task.id}
      // Lifted while dragged, so it doesn't read as text floating over the rows below. Only the
      // dragged row's own: a parent's subtasks ride along inside its lift.
      className="[[data-dnd-dragging]>&]:-mx-2 [[data-dnd-dragging]>&]:rounded-lg [[data-dnd-dragging]>&]:bg-popover [[data-dnd-dragging]>&]:px-2 [[data-dnd-dragging]>&]:shadow-md"
    >
      <div
        ref={(el) => {
          containerRef.current = el;
          dragHandleRef?.(el);
        }}
        // The drag handle. Its own role and tabIndex keep dnd-kit from making it a button and a tab stop.
        role={dragHandleRef ? "group" : undefined}
        tabIndex={dragHandleRef ? -1 : undefined}
        className={cn(
          "-mx-2",
          entering && "animate-[task-enter_200ms_ease-out] motion-reduce:animate-none",
          swipeEnabled && "group/swipe relative overflow-hidden rounded-lg",
          // A long press drags the row, so iOS mustn't select its text or show the callout first
          dragHandleRef && "touch:select-none touch:[-webkit-touch-callout:none]",
        )}
      >
        {swipeEnabled && (
          // inert while closed: the tray sits under the row, so it must not be
          // focusable or announced until the row is swiped open.
          <div
            ref={trayRef}
            data-swipe-tray
            className="invisible absolute top-0 right-0 grid h-full auto-cols-fr grid-flow-col bg-muted group-data-[swiping]/swipe:visible"
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
              Date
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
                Subtask
              </button>
            )}
            {canDelete && (
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
                Delete
              </button>
            )}
          </div>
        )}

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
          <Checkbox
            checked={looksDone}
            onCheckedChange={handleCheck}
            aria-label={task.title}
            // Pinned to the first line of the title, which can wrap
            className={cn(
              "mt-1 touch:mt-[3px] touch:size-[18px] touch:after:-inset-3",
              isSubtask && "mt-0.5 touch:mt-px",
              isDone && checkboxDoneClass,
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
                "flex shrink-0 items-center gap-2 transition-transform duration-150 ease-out group-hover/task:translate-x-[calc(var(--actions-w)*-1)] motion-reduce:transition-none task-focus-visible:translate-x-[calc(var(--actions-w)*-1)]",
                isSubtask ? "h-5" : "h-6",
              )}
            >
              {due && showDate && (
                <button
                  type="button"
                  onClick={openPicker}
                  className={cn(
                    "relative cursor-pointer text-xs whitespace-nowrap after:absolute after:-inset-x-1.5 after:-inset-y-2.5 hover:underline",
                    isDone
                      ? "text-muted-foreground"
                      : due.overdue
                        ? "text-destructive"
                        : "text-date",
                  )}
                >
                  {due.label}
                </button>
              )}
              {hasShareChip && <ShareChip ownerName={ownerName} sharedWith={sharedWith} />}
              {/* Hollow, so an assignee doesn't read as the owner */}
              {task.assignee && (
                <InitialsAvatar
                  name={task.assignee.name}
                  label={`Assigned to ${task.assignee.name}`}
                  className="bg-transparent text-hint ring-1 ring-ghost ring-inset"
                />
              )}
            </div>
          )}
          <div
            className={cn(
              "pointer-events-none absolute right-2 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/task:pointer-events-auto group-hover/task:opacity-100 touch:hidden task-focus-visible:pointer-events-auto task-focus-visible:opacity-100",
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
            {canDelete && (
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
            )}
          </div>
        </div>
      </div>

      {!isSubtask && (openSubtasks.length > 0 || doneSubtaskCount > 0) && (
        <div className="mt-1 ml-2 border-l border-ghost pl-[15px] touch:pl-[19px]">
          {openSubtasks.map((sub, index) => (
            <SortableSubtask
              key={sub.id}
              index={index}
              // Done rows aren't sortable, and neither is what's under them
              disabled={isDone}
              task={sub}
              parent={task}
              isSubtask
              onOpen={onOpen}
              onToggle={onToggle}
              onDelete={onDelete}
              onSetDueDate={onSetDueDate}
              onAddSubtask={onAddSubtask}
            />
          ))}
          {doneSubtaskCount > 0 && (
            <button
              type="button"
              onClick={() => onOpen?.(task.id)}
              disabled={!onOpen}
              className="relative rounded-sm py-1 text-xs text-hint transition-colors after:absolute after:-inset-x-2 after:-inset-y-1.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring touch:py-1.5"
            >
              {doneSubtaskCount} done
              <span className="sr-only"> {doneSubtaskCount === 1 ? "subtask" : "subtasks"}</span>
            </button>
          )}
        </div>
      )}
      {addingSubtask && (
        <form
          className="mb-1 ml-6 touch:ml-7"
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

const sameRows = (a: Task[] | undefined, b: Task[] | undefined) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((t, i) => t === b[i]));

/**
 * Props unchanged, with a list's subtasks compared by their rows: the list builds those arrays
 * again on every edit, and a row that compared them by identity would render with every other row.
 */
export const sameRowProps = <P extends { subtasks?: Task[] }>(prev: P, next: P) => {
  const keys = Object.keys(next) as (keyof P)[];
  return (
    keys.length === Object.keys(prev).length &&
    keys.every((key) =>
      key === "subtasks" ? sameRows(prev.subtasks, next.subtasks) : Object.is(prev[key], next[key]),
    )
  );
};

export const TaskItem = memo(TaskRow, sameRowProps);

// Sorts within its parent only: a subtask can't join the task list or another parent
function SortableSubtask({
  index,
  disabled,
  ...props
}: { index: number; disabled: boolean } & ComponentProps<typeof TaskItem>) {
  const parentId = props.task.parentId;
  const { ref, handleRef } = useSortable({
    id: props.task.id,
    index,
    group: parentId ?? undefined,
    type: "subtask",
    data: { parentId },
    accept: (source) => source.type === "subtask" && source.data?.parentId === parentId,
    sensors: rowDragSensors,
    disabled,
  });
  return (
    <div ref={ref}>
      <TaskItem {...props} dragHandleRef={disabled ? undefined : handleRef} />
    </div>
  );
}
