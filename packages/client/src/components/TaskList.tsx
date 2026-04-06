import { useRef } from "react";
import { flushSync } from "react-dom";
import { Toast } from "@base-ui/react/toast";
import { useSortable } from "@dnd-kit/react/sortable";
import { useTasks, updateTask, deleteTask } from "~/lib/db/hooks";
import { tasksCollection } from "~/lib/db/collections";
import { addTask } from "~/lib/db/add-task";
import type { Task } from "~/lib/types";
import { TaskItem } from "./TaskItem";

// ─── Internal actions hook ──────────────────────────────────────────────────

const useTaskItemActions = () => {
  const { data: allTasks } = useTasks();
  const toastManager = Toast.useToastManager();
  const undoIdRef = useRef<string | undefined>(undefined);

  const pushUndo = (message: string, onUndo: () => void) => {
    undoIdRef.current = toastManager.add({ title: message, timeout: 5000, data: { onUndo } });
  };

  const handleToggle = (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    updateTask(task.id, { status: newStatus });

    if (newStatus === "done") {
      const subtasks = (allTasks ?? []).filter(
        (t) => t.parentId === task.id && t.status !== "done",
      );
      for (const sub of subtasks) updateTask(sub.id, { status: "done" });
      pushUndo("Marked done", () => {
        updateTask(task.id, { status: "todo" });
        for (const sub of subtasks) updateTask(sub.id, { status: "todo" });
      });
    } else {
      pushUndo("Marked incomplete", () => updateTask(task.id, { status: "done" }));
    }
  };

  const handleDelete = (id: string) => {
    const task = (allTasks ?? []).find((t) => t.id === id);
    if (!task) return;

    const originEl = document.querySelector<HTMLElement>(`[data-task-id="${id}"]`);
    const onUndo = () => tasksCollection.insert(task);

    // document.startViewTransition not referenced at module level — SSR-safe (see routes/CLAUDE.md)
    if (originEl && typeof document.startViewTransition === "function") {
      originEl.style.viewTransitionName = "undo-morph";
      const vt = document.startViewTransition(() => {
        flushSync(() => {
          deleteTask(id);
          undoIdRef.current = toastManager.add({
            title: "Task deleted",
            timeout: 5000,
            data: { onUndo },
          });
        });
        // flushSync has committed: task gone from DOM, toast portal rendered to body
        const toastEl = document.querySelector<HTMLElement>("[data-toast-undo]");
        if (toastEl) toastEl.style.viewTransitionName = "undo-morph";
      });
      vt.finished.then(() => {
        const toastEl = document.querySelector<HTMLElement>("[data-toast-undo]");
        if (toastEl) toastEl.style.viewTransitionName = "";
      });
    } else {
      // Fallback: Firefox or environments without View Transitions API
      deleteTask(id);
      pushUndo("Task deleted", onUndo);
    }
  };

  const getSubtasks = (parentId: string) =>
    (allTasks ?? [])
      .filter((t) => t.parentId === parentId && t.status !== "done")
      .sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""));

  return { handleToggle, handleDelete, getSubtasks };
};

// ─── SortableTaskItem ───────────────────────────────────────────────────────

function SortableTaskItem({
  task,
  subtasks,
  index,
  onToggle,
  onDelete,
  onOpen,
  onSetDueDate,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenSubtask,
  hideDate,
}: {
  task: Task;
  subtasks: Task[];
  index: number;
  onToggle: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  onSetDueDate?: (date: string | null) => void;
  onAddSubtask?: (title: string) => void;
  onToggleSubtask?: (task: Task) => void;
  onDeleteSubtask?: (id: string) => void;
  onOpenSubtask?: (id: string) => void;
  hideDate?: boolean;
}) {
  const { ref } = useSortable({ id: task.id, index, type: "task" });

  return (
    <li ref={ref}>
      <TaskItem
        task={task}
        subtasks={subtasks}
        onToggle={onToggle}
        onDelete={onDelete}
        onOpen={onOpen}
        onSetDueDate={onSetDueDate}
        onAddSubtask={onAddSubtask}
        onToggleSubtask={onToggleSubtask}
        onDeleteSubtask={onDeleteSubtask}
        onOpenSubtask={onOpenSubtask}
        hideDate={hideDate}
      />
    </li>
  );
}

// ─── TaskList ───────────────────────────────────────────────────────────────

export const TaskList = ({
  tasks,
  onOpen,
  sortable,
  hideDate,
}: {
  tasks: Task[];
  onOpen?: (id: string) => void;
  sortable?: boolean;
  hideDate?: boolean;
}) => {
  const { handleToggle, handleDelete, getSubtasks } = useTaskItemActions();

  if (tasks.length === 0) return null;

  const itemProps = (task: Task) => ({
    subtasks: getSubtasks(task.id),
    onToggle: () => handleToggle(task),
    onDelete: () => handleDelete(task.id),
    onOpen: onOpen ? () => onOpen(task.id) : undefined,
    onSetDueDate: (date: string | null) => updateTask(task.id, { dueDate: date }),
    onAddSubtask: (title: string) => addTask(title, null, task.id),
    onToggleSubtask: handleToggle,
    onDeleteSubtask: handleDelete,
    onOpenSubtask: onOpen,
    hideDate,
  });

  if (sortable) {
    return (
      <ul className="flex flex-col">
        {tasks.map((task, index) => (
          <SortableTaskItem key={task.id} task={task} index={index} {...itemProps(task)} />
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} {...itemProps(task)} />
      ))}
    </ul>
  );
};
