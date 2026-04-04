import { ComponentProps, lazy, Suspense, useEffect, useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
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
import { FirstRunState } from "~/components/FirstRunState";
import { pushUndo } from "~/lib/undo";

// Lazy-load: defers @base-ui/drawer, @tanstack/react-form (69KB)
const TaskDetail = lazy(() => import("~/components/TaskDetail"));

function TaskListView() {
  const { data: allTasks } = useTasks();
  const { data: rawCategories } = useCategories();

  // While OPFS is initialising, data is undefined — render nothing so
  // FirstRunState doesn't flash before real tasks arrive.
  if (allTasks === undefined || rawCategories === undefined) return null;
  const categories = [...rawCategories].sort((a, b) =>
    (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""),
  );
  const activeCategoryId = useActiveCategoryId();
  const userId = useCurrentUserId();

  // Auto-select first category if none active
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const categoryTasks = allTasks.filter(
    (t) => !t.parentId && (activeCategoryId ? t.categoryId === activeCategoryId : !t.categoryId),
  );
  const activeTasks = categoryTasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""));
  const doneTasks = categoryTasks.filter((t) => t.status === "done");
  const isEmpty = activeTasks.length === 0 && doneTasks.length === 0;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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
        {isEmpty ? (
          <FirstRunState />
        ) : (
          <>
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
          </>
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
  );
}

export const Route = createLazyFileRoute("/")({
  component: TaskListView,
});
