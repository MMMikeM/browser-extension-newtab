import { Temporal } from "temporal-polyfill";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import type { Task, Note } from "~/lib/types";
import {
  useNotes,
  useContacts,
  useCategories,
  updateTask,
  deleteTask,
  addNote,
  updateNote,
  deleteNote,
} from "~/lib/db/hooks";
import { shareTask, removeTaskShare, updateShareCategory } from "~/lib/actions";
import { addTask } from "~/lib/db/add-task";
import { getCurrentUserId, useOptimisticUserId } from "~/lib/auth/current-user";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/field";
import { Textarea } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  selectTriggerVariants,
} from "~/components/ui/select";
import { InitialsAvatar } from "~/components/ui/initials-avatar";
import { ListRow } from "~/components/ui/list-row";
import { DetailSection } from "~/components/ui/detail-section";
import { RevealButton, RevealGroup } from "~/components/ui/reveal-button";
import { TextStack } from "~/components/ui/text-stack";
import { TogglePill } from "~/components/ui/toggle-pill";
import { cn } from "~/lib/utils";
import { useTasks } from "~/lib/db/hooks";

const INBOX_VALUE = "__inbox__";
const TITLE_SLOT = "task-title";

// Device locale; time and year only when they carry information
const formatDueDateTime = (due: string) => {
  const dt = Temporal.PlainDateTime.from(due);
  const sameYear = dt.year === Temporal.Now.plainDateISO().year;
  return dt.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(!sameYear && { year: "numeric" }),
    ...(due.length > 10 && { hour: "numeric", minute: "2-digit" }),
  });
};

// Fallback for engines without `field-sizing: content`
const autoGrow = (el: HTMLTextAreaElement | null) => {
  if (!el || CSS.supports("field-sizing", "content")) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

export function TaskDetail({
  taskId,
  open,
  onClose,
}: {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: allTasks, isLoading: tasksLoading } = useTasks();

  if (!taskId || !open) return null;

  const task = allTasks?.find((t) => t.id === taskId);

  if (tasksLoading || !task) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Matches AppShell's column: max-w-sm, offset by desk:left-22 */}
      <DrawerContent className="max-h-[88dvh] max-w-sm border-x desk:translate-x-22 touch:max-w-none touch:border-x-0">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{task.title}</DrawerTitle>
          <DrawerDescription>Task details</DrawerDescription>
        </DrawerHeader>
        <TaskDetailContent
          task={task}
          // From the live collection, not task.subtasks: that embedded copy only refreshes
          // on a server refetch, so ticking or deleting a subtask here looked like a no-op
          subtasks={(allTasks ?? []).filter((t) => t.parentId === task.id)}
          onClose={onClose}
        />
      </DrawerContent>
    </Drawer>
  );
}

const TaskDetailContent = ({
  task,
  subtasks,
  onClose,
}: {
  task: Task;
  subtasks: Task[];
  onClose: () => void;
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const isDone = task.status === "done";
  const dateRef = useRef<HTMLInputElement>(null);

  // Sync local state when task changes externally (but not mid-edit)
  if (title !== task.title && document.activeElement?.getAttribute("data-slot") !== TITLE_SLOT) {
    setTitle(task.title);
  }

  const { data: allNotes = [] } = useNotes();
  const taskNotes = allNotes.filter((n) => n.taskId === task.id);

  const { data: rawCategories = [] } = useCategories();
  const taskCategory = task.categoryId ? rawCategories.find((c) => c.id === task.categoryId) : null;
  const isInSharedCategory = (taskCategory?.collaborators?.length ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] touch:px-5">
      {/* Title — a textarea so long titles wrap; Enter commits like a single-line field */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isDone}
          onCheckedChange={() => updateTask(task.id, { status: isDone ? "todo" : "done" })}
          aria-label="Mark done"
          className="mt-3 touch:mt-[11px] touch:size-[18px] touch:after:-inset-3"
        />
        {/* Bare control + aria-label: a raw <textarea> doesn't register with Base UI's
            Field, so a FieldLabel wouldn't be associated with it */}
        <div className="flex-1">
          <Textarea
            ref={autoGrow}
            data-slot={TITLE_SLOT}
            aria-label="Title"
            rows={1}
            enterKeyHint="done"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value.replace(/\n/g, " "));
              autoGrow(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            onBlur={() => {
              const trimmed = title.trim();
              if (trimmed && trimmed !== task.title) updateTask(task.id, { title: trimmed });
            }}
            className={cn(
              "py-2 text-lg leading-snug font-semibold md:text-lg",
              isDone && "text-muted-foreground line-through",
            )}
          />
        </div>
      </div>

      {/* Description */}
      <Field className="gap-2">
        <FieldLabel className="text-sm font-medium text-hint">Description</FieldLabel>
        <Textarea
          aria-label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            const val = description.trim() || null;
            if (val !== (task.description ?? null)) updateTask(task.id, { description: val });
          }}
          placeholder="Add a description…"
          rows={3}
        />
      </Field>

      <DetailSection label="Due date">
        <div className="flex items-center gap-2">
          {/* Hidden native picker — sized to zero, browser uses it for date UI */}
          <input
            ref={dateRef}
            type="datetime-local"
            step="1800"
            value={task.dueDate ?? ""}
            tabIndex={-1}
            onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
            className="invisible absolute size-0"
          />
          <button
            type="button"
            onClick={() => dateRef.current?.showPicker()}
            className={selectTriggerVariants({
              variant: "underline",
              class: cn(
                "flex-1 cursor-pointer text-left touch:h-10",
                task.dueDate ? "text-date" : "text-hint hover:text-foreground",
              ),
            })}
            aria-label="Set due date"
          >
            {task.dueDate ? formatDueDateTime(task.dueDate) : "Set date…"}
          </button>
          {task.dueDate && (
            <Button
              variant="subtle"
              size="xs"
              onClick={() => updateTask(task.id, { dueDate: null })}
              className="-mr-2.5 touch:h-10 touch:text-sm"
            >
              clear
            </Button>
          )}
        </div>
      </DetailSection>

      {/* Owner — only shown for tasks you don't own */}
      {task.user && task.userId !== getCurrentUserId() && (
        <DetailSection label="Created by">
          <span className="text-sm text-foreground">{task.user.name}</span>
        </DetailSection>
      )}

      {/* Category — own tasks get direct category picker, shared tasks get recipient category */}
      {task.userId === getCurrentUserId() ? (
        <OwnerCategorySection task={task} categories={rawCategories} />
      ) : (
        <RecipientCategorySection
          task={task}
          categoryName={taskCategory?.name}
          categories={rawCategories}
        />
      )}

      {/* Subtasks */}
      {!task.parentId && <SubtaskSection taskId={task.id} subtasks={subtasks} />}

      {/* Sharing */}
      {!task.parentId &&
        (isInSharedCategory ? (
          <DetailSection label="Sharing">
            <span className="text-xs text-hint">Visible to all collaborators in this category</span>
          </DetailSection>
        ) : (
          <ShareSection taskId={task.id} taskUserId={task.userId} shares={task.shares} />
        ))}

      {/* Assignee — when task involves other people (shared or in shared category) */}
      {!task.parentId && (task.shares.length > 0 || isInSharedCategory) && (
        <AssigneeSection task={task} />
      )}

      {/* Notes */}
      <DetailSection label="Notes">
        {taskNotes.map((note) => (
          <NoteItem key={note.id} note={note} />
        ))}
        <AddNoteInput taskId={task.id} />
      </DetailSection>

      {/* Delete */}
      <Button
        variant="subtle"
        intent="destructive"
        size="xs"
        className="-ml-2.5 self-start touch:h-10 touch:text-sm"
        onClick={() => {
          deleteTask(task.id);
          onClose();
        }}
      >
        <Trash2 />
        Delete task
      </Button>
    </div>
  );
};

const NoteItem = ({ note }: { note: Note }) => {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content ?? "");

  if (editing) {
    return (
      <div className="flex items-start gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => {
            const val = content.trim();
            if (val) updateNote(note.id, { content: val });
            setEditing(false);
          }}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- inline edit, user just clicked
          autoFocus
          rows={2}
          className="flex-1 py-1"
        />
      </div>
    );
  }

  return (
    <ListRow size="sm" className="-mx-2 items-start">
      {/* touch:py-2 centres the first line on the h-9 touch buttons */}
      <span className="flex-1 text-sm touch:py-2">{note.content || note.title}</span>
      <RevealGroup className="items-start pt-1">
        <RevealButton intent="neutral" onClick={() => setEditing(true)}>
          edit
        </RevealButton>
        <RevealButton onClick={() => deleteNote(note.id)}>delete</RevealButton>
      </RevealGroup>
    </ListRow>
  );
};

const AddNoteInput = ({ taskId }: { taskId: string }) => {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const content = value.trim();
        if (!content) return;
        addNote({ userId: getCurrentUserId(), taskId, title: content, content });
        setValue("");
      }}
    >
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a note…"
        className="md:h-8"
      />
    </form>
  );
};

const SubtaskSection = ({
  taskId,
  subtasks: rawSubtasks,
}: {
  taskId: string;
  subtasks: Task[];
}) => {
  const [value, setValue] = useState("");

  const subtasks = [...rawSubtasks].sort((a, b) =>
    (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""),
  );

  return (
    <DetailSection label={<>Subtasks{subtasks.length > 0 ? ` (${subtasks.length})` : ""}</>}>
      {subtasks.map((sub) => (
        <ListRow key={sub.id} size="sm" className="-mx-2">
          <Checkbox
            checked={sub.status === "done"}
            aria-label={sub.title}
            onCheckedChange={() =>
              updateTask(sub.id, { status: sub.status === "done" ? "todo" : "done" })
            }
            className="size-3.5 touch:size-4 touch:after:-inset-3"
          />
          <span
            className={cn(
              "flex-1 text-sm",
              sub.status === "done" && "text-muted-foreground line-through",
            )}
          >
            {sub.title}
          </span>
          <RevealGroup>
            <RevealButton onClick={() => deleteTask(sub.id)}>delete</RevealButton>
          </RevealGroup>
        </ListRow>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const title = value.trim();
          if (!title) return;
          addTask(title, null, taskId);
          setValue("");
        }}
      >
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a subtask…"
          className="md:h-8"
        />
      </form>
    </DetailSection>
  );
};

const AssigneeSection = ({ task }: { task: Task }) => {
  const currentUserId = useOptimisticUserId();
  const { data: rawCategories = [] } = useCategories();
  const isOwner = currentUserId === task.userId;

  // Build candidate list from shares + category collaborators (deduplicated)
  const seen = new Set<string>([task.userId]);
  const others: { id: string; label: string }[] = [];

  for (const s of task.shares) {
    if (s.sharedWithUser && !seen.has(s.sharedWithUserId)) {
      seen.add(s.sharedWithUserId);
      others.push({ id: s.sharedWithUserId, label: s.sharedWithUser.name });
    }
  }

  if (task.categoryId) {
    const cat = rawCategories.find((c) => c.id === task.categoryId);
    for (const collab of cat?.collaborators ?? []) {
      if (collab.user && !seen.has(collab.user.id)) {
        seen.add(collab.user.id);
        others.push({ id: collab.user.id, label: collab.user.name });
      }
    }
  }

  const candidates = [{ id: task.userId, label: "Owner" }, ...others];

  return (
    <DetailSection label="Assignee">
      <div className="flex flex-wrap gap-1.5 touch:gap-2" role="radiogroup" aria-label="Assignee">
        <TogglePill
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- styled pills in an ARIA radiogroup
          role="radio"
          aria-checked={!task.assigneeId}
          selected={!task.assigneeId}
          onClick={() => isOwner && updateTask(task.id, { assigneeId: null })}
          disabled={!isOwner}
          className={!isOwner ? "cursor-default" : undefined}
        >
          Unassigned
        </TogglePill>
        {candidates.map((c) => (
          <TogglePill
            key={c.id}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- styled pills in an ARIA radiogroup
            role="radio"
            aria-checked={task.assigneeId === c.id}
            selected={task.assigneeId === c.id}
            onClick={() => isOwner && updateTask(task.id, { assigneeId: c.id })}
            disabled={!isOwner}
            className={!isOwner ? "cursor-default" : undefined}
          >
            {c.label}
          </TogglePill>
        ))}
      </div>
    </DetailSection>
  );
};

const OwnerCategorySection = ({
  task,
  categories,
}: {
  task: Task;
  categories: { id: string; name: string; userId: string }[];
}) => {
  const myCategories = categories.filter((c) => c.userId === task.userId);
  if (myCategories.length === 0) return null;

  const items = [
    { value: INBOX_VALUE, label: "Inbox" },
    ...myCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <DetailSection label="Category">
      <Select
        value={task.categoryId ?? INBOX_VALUE}
        onValueChange={(v) => {
          const id = v as string;
          updateTask(task.id, { categoryId: id === INBOX_VALUE ? null : id });
        }}
        items={items}
      >
        <SelectTrigger variant="underline" aria-label="Category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INBOX_VALUE}>Inbox</SelectItem>
          {myCategories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </DetailSection>
  );
};

const RecipientCategorySection = ({
  task,
  categoryName,
  categories,
}: {
  task: Task;
  categoryName?: string;
  categories: { id: string; name: string; userId: string }[];
}) => {
  const currentUserId = useOptimisticUserId();

  const myShare = task.shares.find((s) => s.sharedWithUserId === currentUserId);
  if (!myShare) {
    if (!categoryName) return null;
    return (
      <DetailSection label="Category">
        <span className="text-sm text-foreground">{categoryName}</span>
      </DetailSection>
    );
  }

  const myCategories = categories.filter((c) => c.userId === currentUserId);

  const items = [
    { value: INBOX_VALUE, label: "Inbox" },
    ...myCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const handleChange = async (categoryId: unknown) => {
    const id = categoryId as string;
    const value = id === INBOX_VALUE ? null : id;
    await updateShareCategory(task.id, value);
  };

  return (
    <DetailSection label="Category">
      <Select value={myShare.categoryId ?? INBOX_VALUE} onValueChange={handleChange} items={items}>
        <SelectTrigger variant="underline" aria-label="Category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INBOX_VALUE}>Inbox</SelectItem>
          {myCategories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </DetailSection>
  );
};

const ShareSection = ({
  taskId,
  taskUserId,
  shares,
}: {
  taskId: string;
  taskUserId: string;
  shares: Task["shares"];
}) => {
  const currentUserId = useOptimisticUserId();
  const isOwner = currentUserId === taskUserId;
  const [selectedUsername, setSelectedUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: allContacts = [] } = useContacts();
  const sharedWithIds = new Set(shares.map((s) => s.sharedWithUserId));
  const addableContacts = allContacts.filter(
    (c) => c.contactUser && !sharedWithIds.has(c.contactUserId),
  );

  const handleAdd = async () => {
    if (!selectedUsername) return;
    setAdding(true);
    setError(null);
    try {
      await shareTask(taskId, selectedUsername, "edit");
      setSelectedUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setAdding(false);
    }
  };

  return (
    <DetailSection label={<>Shared with{shares.length > 0 ? ` (${shares.length})` : ""}</>}>
      {shares.map((share) => (
        <ListRow key={share.id} className="-mx-2">
          <InitialsAvatar name={share.sharedWithUser?.name ?? "?"} size="md" />
          <TextStack
            title={share.sharedWithUser?.name ?? share.sharedWithUserId}
            subtitle={
              share.sharedWithUser?.username ? `@${share.sharedWithUser.username}` : undefined
            }
          />
          {isOwner && (
            <RevealGroup>
              <RevealButton onClick={() => removeTaskShare(share.id)}>Remove</RevealButton>
            </RevealGroup>
          )}
        </ListRow>
      ))}
      {isOwner && addableContacts.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedUsername}
            onValueChange={(v) => {
              setSelectedUsername(v as string);
              setError(null);
            }}
          >
            <SelectTrigger variant="underline" className="flex-1" aria-label="Share with">
              <SelectValue placeholder="Share with…" />
            </SelectTrigger>
            <SelectContent>
              {addableContacts.map((c) => (
                <SelectItem key={c.contactUserId} value={c.contactUser!.username}>
                  {c.contactUser!.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={!selectedUsername || adding}
          >
            Share
          </Button>
        </div>
      )}
      {isOwner && allContacts.length === 0 && (
        <p className="text-xs text-hint">
          No contacts yet.{" "}
          <Link to="/people" className="underline hover:text-foreground">
            Invite someone
          </Link>{" "}
          to share this task.
        </p>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </DetailSection>
  );
};

export default TaskDetail;
