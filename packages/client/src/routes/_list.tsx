import { Suspense } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { TaskInputBar } from "~/components/task/input-bar";
import { SyncHint } from "~/components/SyncHint";
import { TaskView } from "~/components/task/view";
import { CategoryHeader } from "~/components/category-nav/CategoryHeader";

function TaskListView() {
  const navigate = useNavigate();

  return (
    <>
      {/*
       * Desktop: list title, then the input, then content — DOM order.
       * Mobile (touch): flex column with order swapped. Input gets order-2 so it sinks
       * to the bottom of the viewport; content gets order-1 and fills the remaining space.
       * CategoryHeader keeps the default order, so it sits above the content.
       * Fragment children become direct flex children of AppShell via <Outlet />.
       */}
      <CategoryHeader />
      <TaskInputBar />
      {/* Touch: widened by the rows' -mx-2, or overflow-x-hidden cuts off a swiped row's tray */}
      <div className="scroll-edge-fade touch:order-1 touch:-mx-2 touch:flex touch:min-h-0 touch:flex-1 touch:flex-col touch:overflow-x-hidden touch:overflow-y-auto touch:px-2">
        <Suspense fallback={null}>
          <SyncHint />
        </Suspense>
        <div className="mt-2 flex flex-1 flex-col gap-4">
          <TaskView
            onSelectTask={(taskId) => navigate({ to: "/task/$taskId", params: { taskId } })}
          />
          <Outlet />
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute("/_list")({
  component: TaskListView,
});
