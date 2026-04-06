import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Task, Note } from "~/lib/types";
import { useNotes, useContacts, updateTask, deleteTask, addNote, updateNote, deleteNote } from "~/lib/db/hooks";
import { shareTask, removeTaskShare } from "~/lib/actions";
import { addTask } from "~/lib/db/add-task";
import { getCurrentUserId } from "~/lib/auth/current-user";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/drawer";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import { cn } from "~/lib/utils";

export function TaskDetail({
  task,
  open,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (fields: Partial<Task>) => void;
  onDelete: () => void;
}) {
  if (!task) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>{task.title}</DrawerTitle>
          <DrawerDescription>Task details</DrawerDescription>
        </DrawerHeader>
        <TaskDetailContent task={task} onUpdate={onUpdate} onDelete={onDelete} />
      </DrawerContent>
    </Drawer>
  );
}

const TaskDetailContent = ({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onUpdate: (fields: Partial<Task>) => void;
  onDelete: () => void;
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const isDone = task.status === "done";
  const dateRef = useRef<HTMLInputElement>(null);

  // Sync local state when task changes
  if (title !== task.title && document.activeElement?.tagName !== "INPUT") {
    setTitle(task.title);
  }

  const { data: allNotes = [] } = useNotes();
  const taskNotes = allNotes.filter((n) => n.taskId === task.id);

  return (
    <div className="flex flex-col gap-6 px-6 pb-8 pt-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isDone}
          onCheckedChange={() => onUpdate({ status: isDone ? "todo" : "done" })}
        />
        <Field className="flex-1">
          <FieldLabel className="sr-only">Title</FieldLabel>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const trimmed = title.trim();
              if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
            }}
            className="w-full bg-transparent text-lg font-semibold outline-none"
          />
        </Field>
      </div>

      {/* Description */}
      <Field>
        <FieldLabel className="text-xs font-medium text-muted-foreground">Description</FieldLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            const val = description.trim() || null;
            if (val !== (task.description ?? null)) onUpdate({ description: val });
          }}
          placeholder="Add a description..."
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </Field>

      {/* Due date */}
      <Field className="flex-row items-center gap-3">
        <FieldLabel className="text-xs font-medium text-muted-foreground">Due date</FieldLabel>
        <input
          ref={dateRef}
          type="date"
          value={task.dueDate ?? ""}
          onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
          className="rounded-md border border-input bg-input/30 px-2 py-1 text-sm outline-none focus-visible:border-ring"
        />
        {task.dueDate && (
          <button
            onClick={() => onUpdate({ dueDate: null })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            clear
          </button>
        )}
      </Field>

      {/* Subtasks */}
      {!task.parentId && <SubtaskSection taskId={task.id} subtasks={task.subtasks} />}

      {/* Sharing */}
      {!task.parentId && (
        <ShareSection taskId={task.id} taskUserId={task.userId} shares={task.shares} />
      )}

      {/* Assignee — only when the task has been shared with someone */}
      {!task.parentId && task.shares.length > 0 && (
        <AssigneeSection task={task} onUpdate={onUpdate} />
      )}

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Notes</p>
        {taskNotes.map((note) => (
          <NoteItem key={note.id} note={note} />
        ))}
        <AddNoteInput taskId={task.id} />
      </div>

      {/* Delete */}
      <Button variant="destructive" size="sm" onClick={onDelete} className="self-start">
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
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => {
            const val = content.trim();
            if (val) updateNote(note.id, { content: val });
            setEditing(false);
          }}
          autoFocus
          rows={2}
          className="flex-1 resize-none rounded-md border border-input bg-input/30 px-2 py-1 text-sm outline-none focus-visible:border-ring"
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
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          edit
        </button>
        <button
          onClick={() => deleteNote(note.id)}
          className="text-xs text-destructive hover:underline"
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
        const userId = getCurrentUserId();
        if (!userId) return;
        addNote({ userId, taskId, title: content, content });
        setValue("");
      }}
    >
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a note..."
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
      <p className="text-xs font-medium text-muted-foreground">
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
            className="text-xs text-destructive opacity-0 hover:underline group-hover/sub:opacity-100"
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
          placeholder="Add a subtask..."
          className="h-8 text-sm"
        />
      </form>
    </div>
  );
};

const AssigneeSection = ({
  task,
  onUpdate,
}: {
  task: Task;
  onUpdate: (fields: Partial<Task>) => void;
}) => {
  const currentUserId = getCurrentUserId();
  const isOwner = currentUserId === task.userId;

  const candidates = [
    { id: task.userId, label: "Owner" },
    ...task.shares
      .filter((s) => s.sharedWithUser)
      .map((s) => ({ id: s.sharedWithUserId, label: s.sharedWithUser!.name })),
  ];

  return (
    <Field className="flex-row items-center gap-3">
      <FieldLabel className="text-xs font-medium text-muted-foreground">Assignee</FieldLabel>
      <select
        value={task.assigneeId ?? ""}
        onChange={(e) => onUpdate({ assigneeId: e.target.value || null })}
        disabled={!isOwner}
        className="rounded-md border border-input bg-input/30 px-2 py-1 text-sm outline-none focus-visible:border-ring disabled:cursor-default disabled:opacity-60"
      >
        <option value="">Unassigned</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </Field>
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
  const currentUserId = getCurrentUserId();
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
      <p className="text-xs font-medium text-muted-foreground">
        Shared with{shares.length > 0 ? ` (${shares.length})` : ""}
      </p>
      {shares.map((share) => (
        <div
          key={share.id}
          className="group/share flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
        >
          <div className="size-7 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
            {(share.sharedWithUser?.name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">
              {share.sharedWithUser?.name ?? share.sharedWithUserId}
            </span>
            {share.sharedWithUser?.username && (
              <span className="text-xs text-muted-foreground">
                @{share.sharedWithUser.username}
              </span>
            )}
          </div>
          {isOwner && (
            <button
              onClick={() => removeTaskShare(share.id)}
              className="text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/share:opacity-100"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {isOwner && addableContacts.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedUsername}
            onChange={(e) => {
              setSelectedUsername(e.target.value);
              setError(null);
            }}
            className="flex-1 rounded-md border border-input bg-input/30 px-2 py-1.5 text-sm outline-none focus-visible:border-ring"
          >
            <option value="">Share with…</option>
            {addableContacts.map((c) => (
              <option key={c.contactUserId} value={c.contactUser!.username}>
                {c.contactUser!.name}
              </option>
            ))}
          </select>
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
        <p className="text-xs text-muted-foreground">
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
