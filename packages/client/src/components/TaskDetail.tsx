import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
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
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { useTasks } from "~/lib/db/hooks";

const INBOX_VALUE = "__inbox__";

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
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>{task.title}</DrawerTitle>
          <DrawerDescription>Task details</DrawerDescription>
        </DrawerHeader>
        <TaskDetailContent task={task} onClose={onClose} />
      </DrawerContent>
    </Drawer>
  );
}

const TaskDetailContent = ({ task, onClose }: { task: Task; onClose: () => void }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const isDone = task.status === "done";
  const dateRef = useRef<HTMLInputElement>(null);

  // Sync local state when task changes externally
  if (title !== task.title && document.activeElement?.tagName !== "INPUT") {
    setTitle(task.title);
  }

  const { data: allNotes = [] } = useNotes();
  const taskNotes = allNotes.filter((n) => n.taskId === task.id);

  const { data: rawCategories = [] } = useCategories();
  const taskCategory = task.categoryId
    ? rawCategories.find((c) => c.id === task.categoryId)
    : null;
  const isInSharedCategory = (taskCategory?.collaborators?.length ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 pb-8 pt-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isDone}
          onCheckedChange={() => updateTask(task.id, { status: isDone ? "todo" : "done" })}
        />
        <Field className="flex-1">
          <FieldLabel className="sr-only">Title</FieldLabel>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const trimmed = title.trim();
              if (trimmed && trimmed !== task.title) updateTask(task.id, { title: trimmed });
            }}
            className="border-ghost text-lg font-semibold focus-visible:border-hint"
          />
        </Field>
      </div>

      {/* Description */}
      <Field>
        <FieldLabel className="text-sm font-medium text-hint">Description</FieldLabel>
        <Textarea
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

      {/* Due date */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-hint">Due date</span>
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
          onClick={() => dateRef.current?.showPicker()}
          className="text-sm transition-colors"
          aria-label="Set due date"
        >
          {task.dueDate ? (
            <span className="text-date hover:text-foreground">
              {new Date(task.dueDate).toLocaleString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          ) : (
            <span className="text-hint hover:text-foreground">Set date…</span>
          )}
        </button>
        {task.dueDate && (
          <button
            onClick={() => updateTask(task.id, { dueDate: null })}
            className="text-xs text-ghost transition-colors hover:text-hint"
          >
            clear
          </button>
        )}
      </div>

      {/* Owner — only shown for tasks you don't own */}
      {task.user && task.userId !== getCurrentUserId() && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-hint">Created by</span>
          <span className="text-sm text-foreground">{task.user.name}</span>
        </div>
      )}

      {/* Category — own tasks get direct category picker, shared tasks get recipient category */}
      {task.userId === getCurrentUserId() ? (
        <OwnerCategorySection task={task} categories={rawCategories} />
      ) : (
        <RecipientCategorySection task={task} categoryName={taskCategory?.name} categories={rawCategories} />
      )}

      {/* Subtasks */}
      {!task.parentId && <SubtaskSection taskId={task.id} subtasks={task.subtasks} />}

      {/* Sharing */}
      {!task.parentId && (
        isInSharedCategory ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-hint">Sharing</span>
            <span className="text-xs text-ghost">
              Visible to all collaborators in this category
            </span>
          </div>
        ) : (
          <ShareSection taskId={task.id} taskUserId={task.userId} shares={task.shares} />
        )
      )}

      {/* Assignee — when task involves other people (shared or in shared category) */}
      {!task.parentId && (task.shares.length > 0 || isInSharedCategory) && (
        <AssigneeSection task={task} />
      )}

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-hint">Notes</p>
        {taskNotes.map((note) => (
          <NoteItem key={note.id} note={note} />
        ))}
        <AddNoteInput taskId={task.id} />
      </div>

      {/* Delete */}
      <button
        onClick={() => {
          deleteTask(task.id);
          onClose();
        }}
        className="self-start text-xs text-hint transition-colors hover:text-destructive"
      >
        Delete task
      </button>
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
    <div className="group/note flex items-start gap-2 rounded-md px-2 py-1 hover:bg-muted">
      <span className="flex-1 text-sm">{note.content || note.title}</span>
      <div className="flex gap-1 opacity-0 group-hover/note:opacity-100">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-hint transition-colors hover:text-foreground"
        >
          edit
        </button>
        <button
          onClick={() => deleteNote(note.id)}
          className="text-xs text-hint transition-colors hover:text-destructive"
        >
          delete
        </button>
      </div>
    </div>
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
        className="h-8 text-sm"
      />
    </form>
  );
};

const SubtaskSection = ({
  taskId,
  subtasks: rawSubtasks,
}: {
  taskId: string;
  subtasks: Task["subtasks"];
}) => {
  const [value, setValue] = useState("");

  const subtasks = [...rawSubtasks].sort((a, b) =>
    (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""),
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-hint">
        Subtasks{subtasks.length > 0 ? ` (${subtasks.length})` : ""}
      </p>
      {subtasks.map((sub) => (
        <div
          key={sub.id}
          className="group/sub flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
        >
          <Checkbox
            checked={sub.status === "done"}
            onCheckedChange={() =>
              updateTask(sub.id, { status: sub.status === "done" ? "todo" : "done" })
            }
            className="size-3.5"
          />
          <span
            className={cn(
              "flex-1 text-sm",
              sub.status === "done" && "text-muted-foreground line-through",
            )}
          >
            {sub.title}
          </span>
          <button
            onClick={() => deleteTask(sub.id)}
            className="text-xs text-hint opacity-0 transition-colors hover:text-destructive group-hover/sub:opacity-100"
          >
            delete
          </button>
        </div>
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
          className="h-8 text-sm"
        />
      </form>
    </div>
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
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-hint">Assignee</span>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Assignee">
        <button
          onClick={() => isOwner && updateTask(task.id, { assigneeId: null })}
          disabled={!isOwner}
          className={cn(
            "rounded-full px-3 py-1 text-xs transition-colors",
            !task.assigneeId ? "bg-primary/15 text-primary" : "text-hint hover:text-foreground",
            !isOwner && "cursor-default",
          )}
        >
          Unassigned
        </button>
        {candidates.map((c) => (
          <button
            key={c.id}
            onClick={() => isOwner && updateTask(task.id, { assigneeId: c.id })}
            disabled={!isOwner}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors",
              task.assigneeId === c.id
                ? "bg-primary/15 text-primary"
                : "text-hint hover:text-foreground",
              !isOwner && "cursor-default",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
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

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-hint">Category</span>
      <Select
        value={task.categoryId ?? INBOX_VALUE}
        onValueChange={(v) => {
          const id = v as string;
          updateTask(task.id, { categoryId: id === INBOX_VALUE ? null : id });
        }}
      >
        <SelectTrigger
          className="rounded-none border-0 border-b border-ghost bg-transparent px-0 py-2 text-sm text-foreground shadow-none hover:border-hint focus-visible:border-hint focus-visible:ring-0"
          aria-label="Category"
        >
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
    </div>
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
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-hint">Category</span>
        <span className="text-sm text-foreground">{categoryName}</span>
      </div>
    );
  }

  const myCategories = categories.filter((c) => c.userId === currentUserId);

  const handleChange = async (categoryId: unknown) => {
    const id = categoryId as string;
    const value = id === INBOX_VALUE ? null : id;
    await updateShareCategory(task.id, value);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-hint">Category</span>
      <Select value={myShare.categoryId ?? INBOX_VALUE} onValueChange={handleChange}>
        <SelectTrigger
          className="rounded-none border-0 border-b border-ghost bg-transparent px-0 py-2 text-sm text-foreground shadow-none hover:border-hint focus-visible:border-hint focus-visible:ring-0"
          aria-label="Category"
        >
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
    </div>
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
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-hint">
        Shared with{shares.length > 0 ? ` (${shares.length})` : ""}
      </p>
      {shares.map((share) => (
        <div
          key={share.id}
          className="group/share flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {(share.sharedWithUser?.name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">
              {share.sharedWithUser?.name ?? share.sharedWithUserId}
            </span>
            {share.sharedWithUser?.username && (
              <span className="text-xs text-hint">@{share.sharedWithUser.username}</span>
            )}
          </div>
          {isOwner && (
            <button
              onClick={() => removeTaskShare(share.id)}
              className="text-xs text-hint opacity-0 transition-colors hover:text-destructive group-hover/share:opacity-100"
            >
              Remove
            </button>
          )}
        </div>
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
            <SelectTrigger
              className="flex-1 rounded-none border-0 border-b border-ghost bg-transparent px-0 py-2 text-sm text-foreground shadow-none hover:border-hint focus-visible:border-hint focus-visible:ring-0"
              aria-label="Share with"
            >
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
    </div>
  );
};

export default TaskDetail;
