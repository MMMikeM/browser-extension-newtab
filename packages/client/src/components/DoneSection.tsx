import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { TaskList } from "~/components/TaskList";
import type { Task } from "~/lib/types";

export function DoneSection({
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
    <div className="mt-1 border-t border-border pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          size={14}
          className="transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        />
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
