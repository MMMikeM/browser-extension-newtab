import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable, isSortableOperation } from "@dnd-kit/react/sortable";
import { useDroppable } from "@dnd-kit/react";
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
import { tasksCollection } from "~/lib/collections";
import { addTask } from "~/lib/add-task";
import { useActiveCategoryId, setActiveCategoryId } from "~/lib/active-category";
import { useCurrentUserId } from "~/lib/current-user";
import type { Task, Category } from "~/lib/types";
import { TaskList } from "~/components/TaskList";
import { Input } from "~/components/ui/input";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuSeparator,
} from "~/components/ui/context-menu";
import { TaskDetail } from "~/components/TaskDetail";
import { CATEGORY_COLORS } from "~/lib/constants";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/")({
  component: TaskListView,
});

const CATEGORY_DROP_PREFIX = "category-drop-";

function SortableCategoryTab({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: (ref: React.RefCallback<HTMLElement>) => React.ReactNode;
}) {
  const { ref } = useSortable({ id, index, type: "category" });
  return <>{children(ref)}</>;
}

function DroppableCategoryTab({
  categoryId,
  activeCategoryId,
  children,
}: {
  categoryId: string;
  activeCategoryId: string | null;
  children: (ref: React.RefCallback<HTMLElement>, isDropTarget: boolean) => React.ReactNode;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: `${CATEGORY_DROP_PREFIX}${categoryId}`,
    accept: "task",
    disabled: categoryId === activeCategoryId,
  });
  return <>{children(ref, isDropTarget)}</>;
}

function CategoryTabs({
  categories,
  activeCategoryId,
  onSelect,
  onAdd,
  onRename,
  onSetColor,
  onDeleteCategory,
}: {
  categories: Category[];
  activeCategoryId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onSetColor: (id: string, color: string | null) => void;
  onDeleteCategory: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const submitRename = () => {
    const name = renameValue.trim();
    if (name && renamingId) onRename(renamingId, name);
    setRenamingId(null);
  };

  return (
    <div className="mb-2 flex items-center gap-1">
      {categories.map((cat, index) => {
        const isActive = activeCategoryId === cat.id;
        const color = cat.color ?? undefined;

        if (renamingId === cat.id) {
          return (
            <form
              key={cat.id}
              onSubmit={(e) => {
                e.preventDefault();
                submitRename();
              }}
            >
              <Input
                ref={renameRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="h-7 w-24 text-xs"
                onBlur={submitRename}
              />
            </form>
          );
        }

        return (
          <SortableCategoryTab key={cat.id} id={cat.id} index={index}>
            {(sortableRef) => (
              <DroppableCategoryTab categoryId={cat.id} activeCategoryId={activeCategoryId}>
                {(droppableRef, isDropTarget) => (
                  <ContextMenu>
                    <ContextMenuTrigger
                      render={
                        <button
                          ref={(el) => {
                            sortableRef(el);
                            droppableRef(el);
                          }}
                          onClick={() => onSelect(cat.id)}
                          className={cn(
                            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                            isActive
                              ? color
                                ? "text-white"
                                : "bg-primary text-primary-foreground"
                              : color
                                ? "hover:bg-muted"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            isDropTarget &&
                              "ring-2 ring-primary ring-offset-1 ring-offset-background",
                          )}
                          style={
                            color ? (isActive ? { backgroundColor: color } : { color }) : undefined
                          }
                        />
                      }
                    >
                      {cat.name}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => {
                          setRenamingId(cat.id);
                          setRenameValue(cat.name);
                        }}
                      >
                        Rename
                      </ContextMenuItem>
                      <ContextMenuSub>
                        <ContextMenuSubTrigger>Color</ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          <div className="grid grid-cols-4 gap-1 p-1">
                            {CATEGORY_COLORS.map((c) => (
                              <button
                                key={c.name}
                                onClick={() => onSetColor(cat.id, c.value)}
                                className="size-6 rounded-full ring-1 ring-foreground/10 transition-transform hover:scale-110"
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                              />
                            ))}
                          </div>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => onSetColor(cat.id, null)}>
                            None
                          </ContextMenuItem>
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        variant="destructive"
                        onClick={() => onDeleteCategory(cat.id)}
                      >
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )}
              </DroppableCategoryTab>
            )}
          </SortableCategoryTab>
        );
      })}
      {adding ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            onAdd(name);
            setNewName("");
            setAdding(false);
          }}
        >
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name..."
            className="h-7 w-24 text-xs"
            autoFocus
            onBlur={() => {
              if (!newName.trim()) setAdding(false);
            }}
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground/40 transition-colors hover:text-muted-foreground"
        >
          +
        </button>
      )}
    </div>
  );
}

function DoneSection({
  tasks,
  onToggle,
  onDelete,
  onOpen,
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 border-t border-border pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        <span
          className="inline-block transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          ▸
        </span>
        Done ({tasks.length})
      </button>
      {open && (
        <div className="mt-2">
          <TaskList tasks={tasks} onToggle={onToggle} onDelete={onDelete} onOpen={onOpen} />
        </div>
      )}
    </div>
  );
}

function TaskListView() {
  const { data: allTasks = [] } = useTasks();
  const { data: categories = [] } = useCategories();
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

  const activeTasks = categoryTasks.filter((t) => t.status !== "done");
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
    }
  };

  const handleDelete = (id: string) => deleteTask(id);

  const handleSetDueDate = (id: string, date: string | null) => updateTask(id, { dueDate: date });

  const handleAddSubtask = (title: string, parentId: string) => addTask(title, null, parentId);

  const handleReorder = useCallback((taskId: string, newIndex: number, groupTasks: Task[]) => {
    const filtered = groupTasks.filter((t) => t.id !== taskId);
    const prevOrder = newIndex > 0 ? (filtered[newIndex - 1]?.sortOrder ?? null) : null;
    const nextOrder = filtered[newIndex]?.sortOrder ?? null;
    updateTask(taskId, { sortOrder: generateKeyBetween(prevOrder, nextOrder) });
  }, []);

  const handleAddCategory = (name: string) => {
    if (!userId) return;
    const cat = addCategory({ name, userId, color: null, sortOrder: null });
    setActiveCategoryId(cat.id);
  };

  const handleReorderCategory = useCallback((catId: string, newIndex: number, cats: Category[]) => {
    const filtered = cats.filter((c) => c.id !== catId);
    const prevOrder = newIndex > 0 ? (filtered[newIndex - 1]?.sortOrder ?? null) : null;
    const nextOrder = filtered[newIndex]?.sortOrder ?? null;
    updateCategory(catId, { sortOrder: generateKeyBetween(prevOrder, nextOrder) });
  }, []);

  const handleRenameCategory = (id: string, name: string) => updateCategory(id, { name });

  const handleSetCategoryColor = (id: string, color: string | null) =>
    updateCategory(id, { color });

  const handleDeleteCategory = (id: string) => {
    for (const task of tasksCollection.state?.values() ?? []) {
      if (task.categoryId === id) updateTask(task.id, { categoryId: null });
    }
    deleteCategory(id);
    const remaining = categories.filter((c) => c.id !== id);
    setActiveCategoryId(remaining.length > 0 ? remaining[0].id : null);
  };

  const handleDragEnd = useCallback(
    (
      event: Parameters<NonNullable<React.ComponentProps<typeof DragDropProvider>["onDragEnd"]>>[0],
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
        if (!source || source.initialIndex === source.index) return;
        if (source.type === "category") {
          handleReorderCategory(String(source.id), source.index, categories);
        } else {
          handleReorder(String(source.id), source.index, activeTasks);
        }
      }
    },
    [activeCategoryId, activeTasks, categories, handleReorder, handleReorderCategory],
  );

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <CategoryTabs
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelect={setActiveCategoryId}
        onAdd={handleAddCategory}
        onRename={handleRenameCategory}
        onSetColor={handleSetCategoryColor}
        onDeleteCategory={handleDeleteCategory}
      />
      <div className="flex flex-col gap-4">
        {isEmpty ? (
          <p className="py-16 text-center text-sm text-muted-foreground/70">
            Nothing here yet. What's on your mind?
          </p>
        ) : (
          <>
            <TaskList
              tasks={activeTasks}
              allTasks={allTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onOpen={setSelectedTaskId}
              onSetDueDate={handleSetDueDate}
              onAddSubtask={handleAddSubtask}
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
      <TaskDetail
        task={selectedTask}
        open={!!selectedTask}
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
    </DragDropProvider>
  );
}
