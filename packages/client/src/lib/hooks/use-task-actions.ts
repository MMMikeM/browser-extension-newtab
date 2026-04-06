import { useRef, ComponentProps } from "react";
import { flushSync } from "react-dom";
import { Toast } from "@base-ui/react/toast";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortableOperation } from "@dnd-kit/react/sortable";
import { generateKeyBetween } from "fractional-indexing";
import {
  updateTask,
  deleteTask,
  addCategory,
  updateCategory,
  deleteCategory,
} from "~/lib/db/hooks";
import { tasksCollection, categoriesCollection } from "~/lib/db/collections";
import { addTask } from "~/lib/db/add-task";
import { setActiveCategoryId } from "~/lib/state/active-category";
import { getCurrentUserId } from "~/lib/auth/current-user";
import { CATEGORY_DROP_PREFIX } from "~/components/CategoryNav";
import type { Task, Category } from "~/lib/types";

type DragEndEvent = Parameters<
  NonNullable<ComponentProps<typeof DragDropProvider>["onDragEnd"]>
>[0];

interface Params {
  allTasks: Task[];
  categories: Category[];
  activeCategoryId: string | null;
  activeTasks: Task[];
  userId: string | null | undefined;
}

export const useTaskActions = ({
  allTasks,
  categories,
  activeCategoryId,
  activeTasks,
  userId,
}: Params) => {
  const toastManager = Toast.useToastManager();
  const undoIdRef = useRef<string | undefined>(undefined);

  const pushUndo = (message: string, onUndo: () => void) => {
    if (undoIdRef.current !== undefined) toastManager.close(undoIdRef.current);
    undoIdRef.current = toastManager.add({
      title: message,
      timeout: 5000,
      data: { onUndo },
    });
  };

  const handleAdd = (title: string) => {
    addTask(title, activeCategoryId ?? null);
  };

  const handleToggle = (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    updateTask(task.id, { status: newStatus });

    if (newStatus === "done") {
      const subtasks = allTasks.filter((t) => t.parentId === task.id && t.status !== "done");
      for (const sub of subtasks) {
        updateTask(sub.id, { status: "done" });
      }
      pushUndo("Marked done", () => {
        updateTask(task.id, { status: "todo" });
        for (const sub of subtasks) {
          updateTask(sub.id, { status: "todo" });
        }
      });
    } else {
      pushUndo("Marked incomplete", () => {
        updateTask(task.id, { status: "done" });
      });
    }
  };

  const handleDelete = (id: string) => {
    const task = allTasks.find((t) => t.id === id);
    if (!task) return;

    const originEl = document.querySelector<HTMLElement>(`[data-task-id="${id}"]`);
    const onUndo = () => tasksCollection.insert(task);

    // Dynamic import: avoid referencing document.startViewTransition at module level
    // since this file is imported during SSR prerender (see routes/CLAUDE.md).
    if (originEl && typeof (document as any).startViewTransition === "function") {
      originEl.style.viewTransitionName = "undo-morph";
      const vt = (document as any).startViewTransition(() => {
        flushSync(() => {
          if (undoIdRef.current !== undefined) toastManager.close(undoIdRef.current);
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

  const handleReorder = (taskId: string, newIndex: number, groupTasks: Task[]) => {
    const filtered = groupTasks.filter((t) => t.id !== taskId);
    const prevOrder = newIndex > 0 ? (filtered[newIndex - 1]?.sortOrder ?? null) : null;
    const nextOrder = filtered[newIndex]?.sortOrder ?? null;
    updateTask(taskId, { sortOrder: generateKeyBetween(prevOrder, nextOrder) });
  };

  const handleAddCategory = (name: string) => {
    const cat = addCategory({ name, userId: getCurrentUserId(), color: null, sortOrder: null, user: null });
    setActiveCategoryId(cat.id);
  };

  const handleReorderCategory = (catId: string, newIndex: number, cats: Category[]) => {
    const filtered = cats.filter((c) => c.id !== catId);
    const prevOrder = newIndex > 0 ? (filtered[newIndex - 1]?.sortOrder ?? null) : null;
    const nextOrder = filtered[newIndex]?.sortOrder ?? null;
    updateCategory(catId, { sortOrder: generateKeyBetween(prevOrder, nextOrder) });
  };

  const handleDeleteCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    const affectedTaskIds = [...(tasksCollection.state?.values() ?? [])]
      .filter((t) => t.categoryId === id)
      .map((t) => t.id);

    for (const tid of affectedTaskIds) {
      updateTask(tid, { categoryId: null });
    }
    deleteCategory(id);
    const remaining = categories.filter((c) => c.id !== id);
    setActiveCategoryId(remaining.length > 0 ? remaining[0].id : null);

    if (cat) {
      pushUndo("Category deleted", () => {
        categoriesCollection.insert(cat);
        for (const tid of affectedTaskIds) {
          updateTask(tid, { categoryId: id });
        }
        setActiveCategoryId(id);
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;

    const { target } = event.operation;

    if (target && typeof target.id === "string" && target.id.startsWith(CATEGORY_DROP_PREFIX)) {
      const targetCategoryId = target.id.slice(CATEGORY_DROP_PREFIX.length);
      const taskId = String(event.operation.source?.id);
      if (targetCategoryId !== activeCategoryId) {
        updateTask(taskId, { categoryId: targetCategoryId });
      }
      return;
    }

    if (isSortableOperation(event.operation)) {
      const { source } = event.operation;
      if (!source) return;
      const targetId = String(event.operation.target?.id ?? "");
      if (source.type === "category") {
        const newIndex = categories.findIndex((c) => c.id === targetId);
        if (newIndex !== -1 && String(source.id) !== targetId) {
          handleReorderCategory(String(source.id), newIndex, categories);
        }
      } else {
        const newIndex = activeTasks.findIndex((t) => t.id === targetId);
        if (newIndex !== -1 && String(source.id) !== targetId) {
          handleReorder(String(source.id), newIndex, activeTasks);
        }
      }
    }
  };

  return {
    handleAdd,
    handleToggle,
    handleDelete,
    handleReorder,
    handleAddCategory,
    handleReorderCategory,
    handleDeleteCategory,
    handleDragEnd,
  };
};
