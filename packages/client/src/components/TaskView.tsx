import { useState, type ReactNode, type RefCallback } from "react";
import { ChevronRight } from "lucide-react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useTasks, useCategories } from "~/lib/db/hooks";
import { useActiveCategoryId } from "~/lib/state/active-category";
import { useCurrentUserId } from "~/lib/auth/current-user";
import { CategoryNav } from "~/components/category-nav";
import { TaskItem } from "./TaskItem";
import { useTaskActions } from "./use-task-actions";
import { useTaskActions as useDndActions } from "~/lib/hooks/use-task-actions";
import type { Task } from "~/lib/types";

const DoneSection = ({ count, children }: { count: number; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div className="mt-1 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          size={14}
          className="transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        />
        Done ({count})
      </button>
      {open && children}
    </div>
  );
};

const getEmptyPhrase = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Morning.";
  if (hour >= 12 && hour < 17) return "All clear.";
  if (hour >= 17 && hour < 22) return "Nothing here yet.";
  return "All quiet.";
};

const EmptySection = ({ activeTasks, doneTasks }: { activeTasks: Task[]; doneTasks: Task[] }) => {
  if (activeTasks.length !== 0) return null;

  if (doneTasks.length === 0)
    return (
      <div className="flex-1 flex flex-col items-center justify-center pb-8 touch:pb-0 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <p className="text-base text-hint">{getEmptyPhrase()}</p>
        <p className="mt-1 text-sm text-hint">type something above to begin</p>
      </div>
    );

  return (
    <p className="text-sm text-hint animate-in fade-in slide-in-from-bottom-1 duration-300">
      All done.
    </p>
  );
};

function SortableTask({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: (ref: RefCallback<HTMLElement>) => ReactNode;
}) {
  const { ref } = useSortable({ id, index, type: "task" });
  return <>{children(ref)}</>;
}

export function TaskView({ onSelectTask }: { onSelectTask: (taskId: string) => void }) {
  const { data: allTasks, isLoading: tasksLoading } = useTasks();
  const { data: rawCategories, isLoading: categoriesLoading } = useCategories();
  const activeCategoryId = useActiveCategoryId();
  const userId = useCurrentUserId();
  const actions = useTaskActions();

  const categories = rawCategories
    ? [...rawCategories].sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""))
    : [];

  // Computed before loading guard so useDndActions always receives stable values
  const categoryTasks = (allTasks ?? []).filter((t) => {
    if (t.parentId) return false;

    const isOwner = t.userId === userId;

    if (isOwner) {
      // Own tasks: filter by the task's categoryId
      return activeCategoryId ? t.categoryId === activeCategoryId : !t.categoryId;
    }

    // Shared tasks: find the current user's share and check THEIR categoryId
    const myShare = t.shares.find((s) => s.sharedWithUserId === userId);
    if (!myShare) {
      // Category collaborator task — show when viewing that category
      return activeCategoryId ? t.categoryId === activeCategoryId : false;
    }

    return activeCategoryId ? myShare.categoryId === activeCategoryId : !myShare.categoryId;
  });

  const activeTasks = categoryTasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""));

  const { handleDragEnd } = useDndActions({ categories, activeCategoryId, activeTasks });

  // While OPFS is initialising, data is undefined or the collection is loading.
  // Guard both: data===undefined catches the pre-ready state, isLoading catches
  // the brief window where the collection is ready but hasn't emitted yet.
  if (tasksLoading || categoriesLoading || allTasks === undefined || rawCategories === undefined) {
    return null;
  }

  const doneTasks = categoryTasks.filter((t) => t.status === "done");

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <CategoryNav />
      <div className="flex flex-col gap-4 flex-1">
        <ul className="flex flex-col gap-1">
          {activeTasks.map((task, index) => (
            <SortableTask key={task.id} id={task.id} index={index}>
              {(ref) => (
                <li ref={ref}>
                  <TaskItem
                    task={task}
                    subtasks={actions.getSubtasks(task.id)}
                    onOpen={onSelectTask}
                    onToggle={actions.handleToggle}
                    onDelete={actions.handleDelete}
                    onSetDueDate={actions.handleSetDueDate}
                    onAddSubtask={actions.handleAddSubtask}
                  />
                </li>
              )}
            </SortableTask>
          ))}
        </ul>

        <EmptySection activeTasks={activeTasks} doneTasks={doneTasks} />

        <DoneSection count={doneTasks.length}>
          <ul className="mt-2 flex flex-col">
            {doneTasks.map((task) => (
              <li key={task.id}>
                <TaskItem
                  task={task}
                  subtasks={actions.getSubtasks(task.id)}
                  onOpen={onSelectTask}
                  onToggle={actions.handleToggle}
                  onDelete={actions.handleDelete}
                  onSetDueDate={actions.handleSetDueDate}
                  onAddSubtask={actions.handleAddSubtask}
                />
              </li>
            ))}
          </ul>
        </DoneSection>
      </div>
    </DragDropProvider>
  );
}
