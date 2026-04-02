import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useValue } from "@legendapp/state/react";
import { useTasks, useUpdateTask, useDeleteTask, useCategories, useAddCategory } from "~/lib/hooks";
import { activeCategoryId$, setActiveCategoryId } from "~/lib/active-category";
import { currentUserId$ } from "~/lib/current-user";
import type { Task } from "~/rpc/tasks";
import type { Category } from "~/rpc/categories";
import { TaskList } from "~/components/TaskList";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/")({
  component: TaskListView,
});

const isToday = (dateStr: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr <= today;
};

const isUpcoming = (dateStr: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr > today;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < 0) return `${-diffDays}d overdue`;

  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
};

function CategoryTabs({
  categories,
  activeCategoryId,
  onSelect,
  onAdd,
}: {
  categories: Category[];
  activeCategoryId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  return (
    <div className="mb-4 flex items-center gap-1">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeCategoryId === cat.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {cat.name}
        </button>
      ))}
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
  );
}

function TemporalGroup({ label, tasks, onToggle, onDelete }: {
  label: string;
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <TaskList tasks={tasks} onToggle={onToggle} onDelete={onDelete} />
    </div>
  );
}

function TaskListView() {
  const { data: allTasks = [] } = useTasks();
  const { data: categories = [] } = useCategories();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { add: addCategory } = useAddCategory();
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

  const todayTasks = activeTasks.filter((t) => t.dueDate && isToday(t.dueDate));
  const upcomingTasks = activeTasks.filter((t) => t.dueDate && isUpcoming(t.dueDate));
  const noDateTasks = activeTasks.filter((t) => !t.dueDate);

  const handleToggle = (task: Task) =>
    updateTask.mutate({
      data: {
        id: task.id,
        status: task.status === "done" ? "todo" : "done",
        updatedAt: new Date().toISOString(),
      },
    });

  const handleDelete = (id: string) => deleteTask.mutate({ data: { id } });

  const handleAddCategory = (name: string) => {
    if (!userId) return;
    const cat = addCategory({ name, userId, color: null, sortOrder: null });
    setActiveCategoryId(cat.id);
  };

  return (
    <>
      <CategoryTabs
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelect={setActiveCategoryId}
        onAdd={handleAddCategory}
      />
      <div className="flex flex-col gap-4">
        <TemporalGroup label="Today" tasks={todayTasks} onToggle={handleToggle} onDelete={handleDelete} />
        <TemporalGroup label="Upcoming" tasks={upcomingTasks} onToggle={handleToggle} onDelete={handleDelete} />
        <TemporalGroup label="No date" tasks={noDateTasks} onToggle={handleToggle} onDelete={handleDelete} />
        {doneTasks.length > 0 && (
          <DoneSection tasks={doneTasks} onToggle={handleToggle} onDelete={handleDelete} />
        )}
      </div>
    </>
  );
}

function DoneSection({
  tasks,
  onToggle,
  onDelete,
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
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
      {open && <TaskList tasks={tasks} onToggle={onToggle} onDelete={onDelete} />}
    </div>
  );
}
