import { Suspense, useState, lazy } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { TaskInputBar } from "~/components/task/input-bar";
import { SyncHint } from "~/components/SyncHint";
import { Toast, Toasts } from "~/components/ui/toast";
import { TaskView } from "~/components/task/view";

// Lazy-load: defers @base-ui/drawer, @tanstack/react-form (69KB)
// Import starts immediately on route load; lazy() uses the same promise for Suspense integration
const taskDetailModule = import("~/components/task/detail");
const TaskDetail = lazy(() => taskDetailModule);

function TaskListView() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  return (
    <>
      {/*
       * Desktop: input renders first (top), content below — DOM order.
       * Mobile (touch): flex column with order swapped. Input gets order-2 so it sinks
       * to the bottom of the viewport; content gets order-1 and fills the remaining space.
       * Fragment children become direct flex children of AppShell via <Outlet />.
       */}
      <TaskInputBar />
      <div className="touch:order-1 touch:flex touch:min-h-0 touch:flex-1 touch:flex-col touch:overflow-x-hidden touch:overflow-y-auto">
        <Suspense fallback={null}>
          <SyncHint />
        </Suspense>
        <div className="mt-2 flex flex-1 flex-col gap-4">
          <TaskView onSelectTask={setSelectedTaskId} />
          <Suspense>
            <TaskDetail taskId={selectedTaskId} open onClose={() => setSelectedTaskId(null)} />
          </Suspense>
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
