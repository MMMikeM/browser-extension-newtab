import { useRef } from "react";
import { flushSync } from "react-dom";
import { Toast } from "@base-ui/react/toast";
import { useTasks, updateTask, deleteTask } from "~/lib/db/hooks";
import { tasksCollection } from "~/lib/db/collections";
import { addTask } from "~/lib/db/add-task";
import type { Task } from "~/lib/types";

export const useTaskActions = () => {
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
      const incomplete = (allTasks ?? []).filter(
        (t) => t.parentId === task.id && t.status !== "done",
      );
      for (const sub of incomplete) updateTask(sub.id, { status: "done" });
      pushUndo("Marked done", () => {
        updateTask(task.id, { status: "todo" });
        for (const sub of incomplete) updateTask(sub.id, { status: "todo" });
      });
    } else {
      pushUndo("Marked incomplete", () => updateTask(task.id, { status: "done" }));
    }
  };

  const handleDelete = (task: Task) => {
    const originEl = document.querySelector<HTMLElement>(`[data-task-id="${task.id}"]`);
    const onUndo = () => tasksCollection.insert(task);

    // document.startViewTransition not referenced at module level — SSR-safe
    if (originEl && typeof document.startViewTransition === "function") {
      originEl.style.viewTransitionName = "undo-morph";
      const vt = document.startViewTransition(() => {
        flushSync(() => {
          deleteTask(task.id);
          undoIdRef.current = toastManager.add({
            title: "Task deleted",
            timeout: 5000,
            data: { onUndo },
          });
        });
        const toastEl = document.querySelector<HTMLElement>("[data-toast-undo]");
        if (toastEl) toastEl.style.viewTransitionName = "undo-morph";
      });
      vt.finished.then(() => {
        const toastEl = document.querySelector<HTMLElement>("[data-toast-undo]");
        if (toastEl) toastEl.style.viewTransitionName = "";
      });
    } else {
      deleteTask(task.id);
      pushUndo("Task deleted", onUndo);
    }
  };

  const handleSetDueDate = (task: Task, date: string | null) =>
    updateTask(task.id, { dueDate: date });

  const handleAddSubtask = (task: Task, title: string) => addTask(title, null, task.id);

  const getSubtasks = (taskId: string): Task[] =>
    (allTasks ?? [])
      .filter((t) => t.parentId === taskId && t.status !== "done")
      .sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""));

  return { handleToggle, handleDelete, handleSetDueDate, handleAddSubtask, getSubtasks };
};
