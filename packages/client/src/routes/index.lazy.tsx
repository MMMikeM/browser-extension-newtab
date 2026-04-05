import { lazy, Suspense, useEffect, useState } from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { TaskInputBar } from "~/components/TaskInputBar";
import { SyncHint } from "~/components/SyncHint";
import UndoToast from "~/components/UndoToast";
import { DragDropProvider } from "@dnd-kit/react";
import { useTasks, updateTask, deleteTask, useCategories, updateCategory } from "~/lib/db/hooks";
import { addTask } from "~/lib/db/add-task";
import { useActiveCategoryId, setActiveCategoryId } from "~/lib/state/active-category";
import { useCurrentUserId } from "~/lib/auth/current-user";
import { TaskList } from "~/components/TaskList";
import { CategoryTabs } from "~/components/CategoryTabs";
import { DoneSection } from "~/components/DoneSection";
import { useTaskActions } from "~/lib/hooks/use-task-actions";

// Lazy-load: defers @base-ui/drawer, @tanstack/react-form (69KB)
const TaskDetail = lazy(() => import("~/components/TaskDetail"));

function TaskListView() {
  const router = useRouter();
  const { data: allTasks, isLoading: tasksLoading } = useTasks();
  const { data: rawCategories, isLoading: categoriesLoading } = useCategories();
  const activeCategoryId = useActiveCategoryId();
  const userId = useCurrentUserId();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Compute categories here so the useEffect below can reference them without
  // being declared after the early return (which would violate Rules of Hooks).
  const categories = rawCategories
    ? [...rawCategories].sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""))
    : [];

  const categoryTasks = (allTasks ?? []).filter(
    (t) => !t.parentId && (activeCategoryId ? t.categoryId === activeCategoryId : !t.categoryId),
  );
  const activeTasks = categoryTasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""));

  const {
    handleAdd,
    handleToggle,
    handleDelete,
    handleReorder,
    handleAddCategory,
    handleReorderCategory,
    handleDeleteCategory,
    handleDragEnd,
  } = useTaskActions({ allTasks: allTasks ?? [], categories, activeCategoryId, activeTasks, userId });

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
        <TaskInputBar onAdd={handleAdd} />
        <div className="touch:order-1 touch:flex-1 touch:overflow-y-auto touch:min-h-0" />
      </>
    );
  }

  const doneTasks = categoryTasks.filter((t) => t.status === "done");

  const selectedTask = selectedTaskId
    ? (allTasks.find((t) => t.id === selectedTaskId) ?? null)
    : null;

  return (
    <>
      {/*
       * Desktop: input renders first (top), content below — DOM order.
       * Mobile (touch): flex column with order swapped. Input gets order-2 so it sinks
       * to the bottom of the viewport; content gets order-1 and fills the remaining space.
       * Fragment children become direct flex children of AppShell via <Outlet />.
       */}
      <TaskInputBar onAdd={handleAdd} />
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
