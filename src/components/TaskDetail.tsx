import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { Task } from "~/rpc/tasks";
import type { Note } from "~/rpc/notes";
import { useUpdateTask, useDeleteTask, useNotes, useAddNote, useUpdateNote, useDeleteNote } from "~/lib/hooks";
import { shareTask, deleteTaskShare } from "~/rpc/tasks";
import { addTask } from "~/lib/add-task";
import { currentUserId$ } from "~/lib/current-user";
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
        <TaskDetailContent
          task={task}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </DrawerContent>
    </Drawer>
  );
}

function TaskDetailContent({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onUpdate: (fields: Partial<Task>) => void;
  onDelete: () => void;
}) {
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
          onCheckedChange={() =>
            onUpdate({ status: isDone ? "todo" : "done" })
          }
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const trimmed = title.trim();
            if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
          }}
          className="flex-1 bg-transparent text-lg font-semibold outline-none"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
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
      </div>

      {/* Due date */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">Due date</label>
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
      </div>

      {/* Subtasks */}
      {!task.parentId && <SubtaskSection taskId={task.id} subtasks={task.subtasks} />}

      {/* Sharing */}
      {!task.parentId && <ShareSection taskId={task.id} taskUserId={task.userId} shares={task.shares} />}

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
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
}

function NoteItem({ note }: { note: Note }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content ?? "");
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  if (editing) {
    return (
      <div className="flex items-start gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => {
            const val = content.trim();
            if (val) updateNote.mutate({ data: { id: note.id, content: val } });
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
          onClick={() => deleteNote.mutate({ data: { id: note.id } })}
          className="text-xs text-destructive hover:underline"
        >
          delete
        </button>
      </div>
    </div>
  );
}

function AddNoteInput({ taskId }: { taskId: string }) {
  const [value, setValue] = useState("");
  const { add: addNote } = useAddNote();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const content = value.trim();
        if (!content) return;
        const userId = currentUserId$.peek();
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
}

function SubtaskSection({ taskId, subtasks: rawSubtasks }: { taskId: string; subtasks: Task["subtasks"] }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [value, setValue] = useState("");

  const subtasks = [...rawSubtasks].sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""));

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">
        Subtasks{subtasks.length > 0 ? ` (${subtasks.length})` : ""}
      </label>
      {subtasks.map((sub) => (
        <div
          key={sub.id}
          className="group/sub flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
        >
          <Checkbox
            checked={sub.status === "done"}
            onCheckedChange={() =>
              updateTask.mutate({
                data: { id: sub.id, status: sub.status === "done" ? "todo" : "done" },
              })
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
            onClick={() => deleteTask.mutate({ data: { id: sub.id } })}
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
}

function ShareSection({ taskId, taskUserId, shares }: { taskId: string; taskUserId: string; shares: Task["shares"] }) {
  const currentUserId = currentUserId$.peek();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { username: "" },
    onSubmit: async ({ value }) => {
      const trimmed = value.username.trim();
      if (!trimmed) return;
      setServerError(null);
      try {
        await shareTask({ data: { taskId, username: trimmed, permission: "edit" } });
        form.reset();
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "Failed to share");
      }
    },
  });

  const isOwner = currentUserId === taskUserId;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">
        Shared with{shares.length > 0 ? ` (${shares.length})` : ""}
      </label>
      {shares.map((share) => (
        <div
          key={share.id}
          className="group/share flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
        >
          <span className="flex-1 text-sm">
            {share.sharedWithUser ? `${share.sharedWithUser.name} (@${share.sharedWithUser.username})` : share.sharedWithUserId}
          </span>
          <span className="text-xs text-muted-foreground">{share.permission}</span>
          {isOwner && (
            <button
              onClick={() => deleteTaskShare({ data: { id: share.id } })}
              className="text-xs text-destructive opacity-0 hover:underline group-hover/share:opacity-100"
            >
              remove
            </button>
          )}
        </div>
      ))}
      {isOwner && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex items-center gap-2"
        >
          <form.Field name="username">
            {(field) => (
              <Input
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Share by username..."
                className="h-8 text-sm"
              />
            )}
          </form.Field>
          <Button size="sm" className="h-8 text-xs" disabled={form.state.isSubmitting}>
            Share
          </Button>
        </form>
      )}
      {serverError && <span className="text-xs text-destructive">{serverError}</span>}
    </div>
  );
}
