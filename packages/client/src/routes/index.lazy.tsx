import { lazy, Suspense, useState } from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { TaskInputBar } from "~/components/TaskInputBar";
import { SyncHint } from "~/components/SyncHint";
import { Toast, Toasts } from "~/components/ui/toast";
import { DragDropProvider } from "@dnd-kit/react";
import { useTasks, useCategories } from "~/lib/db/hooks";
import { useActiveCategoryId } from "~/lib/state/active-category";
import { useCurrentUserId } from "~/lib/auth/current-user";
import { TaskList } from "~/components/TaskList";
import { CategoryNav } from "~/components/category-nav";
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

  const categories = rawCategories
    ? [...rawCategories].sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""))
    : [];

  const categoryTasks = (allTasks ?? []).filter((t) => {
    if (t.parentId) return false;
    if (t.userId !== userId) return !activeCategoryId; // shared tasks → Inbox only
    return activeCategoryId ? t.categoryId === activeCategoryId : !t.categoryId;
  });
  const activeTasks = categoryTasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""));

  const { handleDragEnd } = useTaskActions({ categories, activeCategoryId, activeTasks });

  // While OPFS is initialising, data is undefined or the collection is loading.
  // Guard both: data===undefined catches the pre-ready state, isLoading catches
  // the brief window where the collection is ready but hasn't emitted yet.
  // Render the input shell immediately so it's never hidden during load.
  if (tasksLoading || categoriesLoading || allTasks === undefined || rawCategories === undefined) {
    return (
      <>
        <TaskInputBar />
        <div className="touch:order-1 touch:flex-1 touch:overflow-y-auto touch:min-h-0" />
      </>
    );
  }

  const doneTasks = categoryTasks.filter((t) => t.status === "done");

  const selectedTask = selectedTaskId
    ? (allTasks.find((t) => t.id === selectedTaskId) ?? null)
    : null;

  const emptyPhrase = (() => {
    if (doneTasks.length > 0) return "All done.";
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Morning.";
    if (hour >= 12 && hour < 17) return "All clear.";
    if (hour >= 17 && hour < 22) return "Nothing here yet.";
    return "All quiet.";
  })();

  return (
    <>
      {/*
       * Desktop: input renders first (top), content below — DOM order.
       * Mobile (touch): flex column with order swapped. Input gets order-2 so it sinks
       * to the bottom of the viewport; content gets order-1 and fills the remaining space.
       * Fragment children become direct flex children of AppShell via <Outlet />.
       */}
      <TaskInputBar />
      <div className="touch:order-1 touch:flex-1 touch:overflow-y-auto touch:min-h-0 touch:flex touch:flex-col">
        <Suspense fallback={null}>
          <SyncHint onSignIn={() => router.navigate({ to: "/auth" })} />
        </Suspense>
        <div className="mt-2 flex flex-col gap-4 flex-1">
          <DragDropProvider onDragEnd={handleDragEnd}>
            <CategoryNav />
            <div className="flex flex-col gap-4 flex-1">
              <TaskList tasks={activeTasks} onOpen={setSelectedTaskId} sortable />
              {activeTasks.length === 0 && doneTasks.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center pb-8 touch:pb-0 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <p className="text-base text-hint">{emptyPhrase}</p>
                  <p className="mt-1 text-sm text-hint">type something above to begin</p>
                </div>
              )}
              {activeTasks.length === 0 && doneTasks.length > 0 && (
                <p className="text-sm text-hint animate-in fade-in slide-in-from-bottom-1 duration-300">
                  {emptyPhrase}
                </p>
              )}
              {doneTasks.length > 0 && <DoneSection tasks={doneTasks} onOpen={setSelectedTaskId} />}
            </div>
            {selectedTask && (
              <Suspense>
                <TaskDetail task={selectedTask} open onClose={() => setSelectedTaskId(null)} />
              </Suspense>
            )}
          </DragDropProvider>
        </div>
      </div>
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 left-1/2 z-50 w-[min(360px,90vw)] -translate-x-1/2 sm:bottom-6">
          <Toasts />
        </Toast.Viewport>
      </Toast.Portal>
    </>
  );
}

export const Route = createLazyFileRoute("/")({
  component: TaskListView,
});
