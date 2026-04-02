import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable, isSortableOperation } from "@dnd-kit/react/sortable";
import { generateKeyBetween } from "fractional-indexing";
import { useValue } from "@legendapp/state/react";
import {
  useTasks,
  useUpdateTask,
  useDeleteTask,
  useCategories,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "~/lib/hooks";
import { tasks$ } from "~/lib/stores";
import { activeCategoryId$, setActiveCategoryId } from "~/lib/active-category";
import { currentUserId$ } from "~/lib/current-user";
import type { Task } from "~/rpc/tasks";
import type { Category } from "~/rpc/categories";
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

function SortableCategoryTab({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: (ref: React.RefCallback<HTMLElement>) => React.ReactNode;
}) {
  const { ref } = useSortable({ id, index });
  return <>{children(ref)}</>;
}

function CategoryTabs({
  categories,
  activeCategoryId,
  onSelect,
  onAdd,
  onRename,
  onSetColor,
  onDeleteCategory,
  onReorder,
}: {
  categories: Category[];
  activeCategoryId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onSetColor: (id: string, color: string | null) => void;
  onDeleteCategory: (id: string) => void;
  onReorder: (catId: string, newIndex: number, cats: Category[]) => void;
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
    <DragDropProvider
      onDragEnd={(event) => {
        if (!isSortableOperation(event.operation)) return;
        const { source } = event.operation;
        if (!source || source.initialIndex === source.index) return;
        onReorder(String(source.id), source.index, categories);
      }}
    >
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
              <ContextMenu>
                <ContextMenuTrigger
                  render={
                    <button
                      ref={sortableRef}
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
                      )}
                      style={
                        color
                          ? isActive
                            ? { backgroundColor: color }
                            : { color }
                          : undefined
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
              <ContextMenuItem variant="destructive" onClick={() => onDeleteCategory(cat.id)}>
                Delete
              </ContextMenuItem>
              </ContextMenuContent>
              </ContextMenu>
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
          className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          +
        </button>
      )}
      </div>
    </DragDropProvider>
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
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        Done ({tasks.length}) {open ? "▾" : "▸"}
      </button>
      {open && <TaskList tasks={tasks} onToggle={onToggle} onDelete={onDelete} onOpen={onOpen} />}
    </div>
  );
}

function TaskListView() {
  const { data: allTasks = [] } = useTasks();
  const { data: categories = [] } = useCategories();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { add: addCategory } = useAddCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategoryHook = useDeleteCategory();
  const activeCategoryId = useValue(activeCategoryId$);
  const userId = useValue(currentUserId$);

  // Auto-select first category if none active
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const categoryTasks = allTasks.filter((t) =>
    activeCategoryId ? t.categoryId === activeCategoryId : !t.categoryId,
  );

  const activeTasks = categoryTasks.filter((t) => t.status !== "done");
  const doneTasks = categoryTasks.filter((t) => t.status === "done");

  const isEmpty = activeTasks.length === 0 && doneTasks.length === 0;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = selectedTaskId
    ? allTasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  const handleToggle = (task: Task) =>
    updateTask.mutate({
      data: {
        id: task.id,
        status: task.status === "done" ? "todo" : "done",
      },
    });

  const handleDelete = (id: string) => deleteTask.mutate({ data: { id } });

  const handleSetDueDate = (id: string, date: string | null) =>
    updateTask.mutate({ data: { id, dueDate: date } });

  const handleReorder = useCallback(
    (taskId: string, newIndex: number, groupTasks: Task[]) => {
      const filtered = groupTasks.filter((t) => t.id !== taskId);
      const prevOrder = newIndex > 0 ? filtered[newIndex - 1]?.sortOrder ?? null : null;
      const nextOrder = filtered[newIndex]?.sortOrder ?? null;
      const newSortOrder = generateKeyBetween(prevOrder, nextOrder);
      updateTask.mutate({ data: { id: taskId, sortOrder: newSortOrder } });
    },
    [updateTask],
  );

  const handleAddCategory = (name: string) => {
    if (!userId) return;
    const cat = addCategory({ name, userId, color: null, sortOrder: null });
    setActiveCategoryId(cat.id);
  };

  const handleReorderCategory = useCallback(
    (catId: string, newIndex: number, cats: Category[]) => {
      const filtered = cats.filter((c) => c.id !== catId);
      const prevOrder = newIndex > 0 ? filtered[newIndex - 1]?.sortOrder ?? null : null;
      const nextOrder = filtered[newIndex]?.sortOrder ?? null;
      const newSortOrder = generateKeyBetween(prevOrder, nextOrder);
      updateCategory.mutate({ data: { id: catId, sortOrder: newSortOrder } });
    },
    [updateCategory],
  );

  const handleRenameCategory = (id: string, name: string) =>
    updateCategory.mutate({ data: { id, name } });

  const handleSetCategoryColor = (id: string, color: string | null) =>
    updateCategory.mutate({ data: { id, color } });

  const handleDeleteCategory = (id: string) => {
    const tasksMap = tasks$.peek() ?? {};
    for (const [taskId, task] of Object.entries(tasksMap)) {
      if ((task as Task).categoryId === id) {
        (tasks$ as any)[taskId].assign({ categoryId: null });
      }
    }

    deleteCategoryHook.mutate({ data: { id } });

    const remaining = categories.filter((c) => c.id !== id);
    setActiveCategoryId(remaining.length > 0 ? remaining[0].id : null);
  };

  return (
    <>
      <CategoryTabs
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelect={setActiveCategoryId}
        onAdd={handleAddCategory}
        onRename={handleRenameCategory}
        onSetColor={handleSetCategoryColor}
        onDeleteCategory={handleDeleteCategory}
        onReorder={handleReorderCategory}
      />
      <div className="flex flex-col gap-4">
        {isEmpty ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No tasks yet. Type above to add one.
          </p>
        ) : (
          <>
            <DragDropProvider
              onDragEnd={(event) => {
                const { source, target } = event.operation;
                if (!source || !target || source.id === target.id) return;
                const oldIndex = activeTasks.findIndex((t) => t.id === source.id);
                const newIndex = activeTasks.findIndex((t) => t.id === target.id);
                if (oldIndex === -1 || newIndex === -1) return;
                handleReorder(activeTasks[oldIndex].id, newIndex, activeTasks);
              }}
            >
              <TaskList
                tasks={activeTasks}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onOpen={setSelectedTaskId}
                onSetDueDate={handleSetDueDate}
                onReorder={handleReorder}
              />
            </DragDropProvider>
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
          if (selectedTaskId) updateTask.mutate({ data: { id: selectedTaskId, ...fields } });
        }}
        onDelete={() => {
          if (selectedTaskId) {
            handleDelete(selectedTaskId);
            setSelectedTaskId(null);
          }
        }}
      />
    </>
  );
}
