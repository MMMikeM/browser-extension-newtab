import { ComponentProps, lazy, Suspense, useEffect, useState } from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { AddTaskInput } from "~/components/AddTaskInput";
import { SyncHint } from "~/components/SyncHint";
import UndoToast from "~/components/UndoToast";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortableOperation } from "@dnd-kit/react/sortable";
import { generateKeyBetween } from "fractional-indexing";
import {
  useTasks,
  updateTask,
  deleteTask,
  useCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "~/lib/hooks";
import { tasksCollection, categoriesCollection } from "~/lib/collections";
import { addTask } from "~/lib/add-task";
import { useActiveCategoryId, setActiveCategoryId } from "~/lib/active-category";
import { useCurrentUserId } from "~/lib/current-user";
import type { Task, Category } from "~/lib/types";
import { TaskList } from "~/components/TaskList";
import { CategoryTabs, CATEGORY_DROP_PREFIX } from "~/components/CategoryTabs";
import { DoneSection } from "~/components/DoneSection";
import { pushUndo } from "~/lib/undo";

// Lazy-load: defers @base-ui/drawer, @tanstack/react-form (69KB)
const TaskDetail = lazy(() => import("~/components/TaskDetail"));

function TaskListView() {
  const router = useRouter();
  const { data: allTasks, isLoading: tasksLoading } = useTasks();
  const { data: rawCategories, isLoading: categoriesLoading } = useCategories();
  const activeCategoryId = useActiveCategoryId();
  const userId = useCurrentUserId();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleAdd = (title: string) => {
    addTask(title, activeCategoryId ?? null);
  };

  // Compute categories here so the useEffect below can reference them without
  // being declared after the early return (which would violate Rules of Hooks).
  const categories = rawCategories
    ? [...rawCategories].sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""))
    : [];

  // Auto-select first category if none active
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  // While OPFS is initialising, data is undefined or the collection is loading.
  // Guard both: data===undefined catches the pre-ready state, isLoading catches
  // the brief window where the collection is ready but hasn't emitted yet.
  // Render the input shell immediately so it's never hidden during load.
  if (tasksLoading || categoriesLoading || allTasks === undefined || rawCategories === undefined) {
    return (
      <>
        <div className="touch:order-2 touch:shrink-0 touch:-mx-6 touch:px-6 touch:border-t touch:border-border/20 touch:pt-3 touch:pb-[env(safe-area-inset-bottom,0px)]">
          <AddTaskInput onAdd={handleAdd} />
        </div>
        <div className="touch:order-1 touch:flex-1 touch:overflow-y-auto touch:min-h-0" />
      </>
    );
  }

  const categoryTasks = allTasks.filter(
    (t) => !t.parentId && (activeCategoryId ? t.categoryId === activeCategoryId : !t.categoryId),
  );
  const activeTasks = categoryTasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""));
  const doneTasks = categoryTasks.filter((t) => t.status === "done");
  const isEmpty = activeTasks.length === 0 && doneTasks.length === 0;

  const selectedTask = selectedTaskId
    ? (allTasks.find((t) => t.id === selectedTaskId) ?? null)
    : null;

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
    deleteTask(id);
    pushUndo("Task deleted", () => {
      tasksCollection.insert(task);
    });
  };

  const handleReorder = (taskId: string, newIndex: number, groupTasks: Task[]) => {
    const filtered = groupTasks.filter((t) => t.id !== taskId);
    const prevOrder = newIndex > 0 ? (filtered[newIndex - 1]?.sortOrder ?? null) : null;
    const nextOrder = filtered[newIndex]?.sortOrder ?? null;
    updateTask(taskId, { sortOrder: generateKeyBetween(prevOrder, nextOrder) });
  };

  const handleAddCategory = (name: string) => {
    if (!userId) return;
    const cat = addCategory({ name, userId, color: null, sortOrder: null });
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

  const handleDragEnd = (
    event: Parameters<NonNullable<ComponentProps<typeof DragDropProvider>["onDragEnd"]>>[0],
  ) => {
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

  return (
    <>
      {/*
       * Desktop: input renders first (top), content below — DOM order.
       * Mobile (touch): flex column with order swapped. Input gets order-2 so it sinks
       * to the bottom of the viewport; content gets order-1 and fills the remaining space.
       * Fragment children become direct flex children of AppShell via <Outlet />.
       */}
      <div className="touch:order-2 touch:shrink-0 touch:-mx-6 touch:px-6 touch:border-t touch:border-border/20 touch:pt-3 touch:pb-[env(safe-area-inset-bottom,0px)]">
        <AddTaskInput onAdd={handleAdd} />
      </div>
      <div className="touch:order-1 touch:flex-1 touch:overflow-y-auto touch:min-h-0">
        <Suspense fallback={null}>
          <SyncHint onSignIn={() => router.navigate({ to: "/auth" })} />
        </Suspense>
        <div className="mt-2 flex flex-col gap-4">
          <DragDropProvider onDragEnd={handleDragEnd}>
            <CategoryTabs
              categories={categories}
              activeCategoryId={activeCategoryId}
              onSelect={setActiveCategoryId}
              onAdd={handleAddCategory}
              onRename={(id, name) => updateCategory(id, { name })}
              onSetColor={(id, color) => updateCategory(id, { color })}
              onDeleteCategory={handleDeleteCategory}
            />
            <div className="flex flex-col gap-4">
              <TaskList
                tasks={activeTasks}
                allTasks={allTasks}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onOpen={setSelectedTaskId}
                onSetDueDate={(id, date) => updateTask(id, { dueDate: date })}
                onAddSubtask={(title, parentId) => addTask(title, null, parentId)}
                onReorder={handleReorder}
              />
              {doneTasks.length > 0 && (
                <DoneSection
                  tasks={doneTasks}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onOpen={setSelectedTaskId}
                />
              )}
            </div>
            {selectedTask && (
              <Suspense>
                <TaskDetail
                  task={selectedTask}
                  open
                  onClose={() => setSelectedTaskId(null)}
                  onUpdate={(fields) => {
                    if (selectedTaskId) updateTask(selectedTaskId, fields);
                  }}
                  onDelete={() => {
                    if (selectedTaskId) {
                      deleteTask(selectedTaskId);
                      setSelectedTaskId(null);
                    }
                  }}
                />
              </Suspense>
            )}
          </DragDropProvider>
        </div>
      </div>
      <Suspense fallback={null}>
        <UndoToast />
      </Suspense>
    </>
  );
}

export const Route = createLazyFileRoute("/")({
  component: TaskListView,
});
