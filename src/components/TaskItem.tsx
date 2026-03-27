import type { Task } from "~/functions/tasks";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <Checkbox checked={task.status === "done"} onCheckedChange={onToggle} />
      <span
        className={cn("flex-1", task.status === "done" && "line-through text-muted-foreground")}
      >
        {task.title}
      </span>
      <Button variant="ghost" size="icon-xs" onClick={onDelete}>
        x
      </Button>
    </li>
  );
}
