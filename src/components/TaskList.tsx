import { useSortable } from "@dnd-kit/react/sortable";
import type { Task } from "~/rpc/tasks";
import { TaskItem } from "./TaskItem";

function SortableTaskItem({
  task,
  index,
  onToggle,
  onDelete,
  onOpen,
  onSetDueDate,
  hideDate,
}: {
  task: Task;
  index: number;
  onToggle: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  onSetDueDate?: (date: string | null) => void;
  hideDate?: boolean;
}) {
  const { ref } = useSortable({ id: task.id, index });

  return (
    <li ref={ref}>
      <TaskItem
        task={task}
        onToggle={onToggle}
        onDelete={onDelete}
        onOpen={onOpen}
        onSetDueDate={onSetDueDate}
        hideDate={hideDate}
      />
    </li>
  );
}

export function TaskList({
  tasks,
  onToggle,
  onDelete,
  onOpen,
  onSetDueDate,
  onReorder,
  hideDate,
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  onOpen?: (id: string) => void;
  onSetDueDate?: (id: string, date: string | null) => void;
  onReorder?: (taskId: string, newIndex: number, tasks: Task[]) => void;
  hideDate?: boolean;
}) {
  if (tasks.length === 0) return null;

  if (!onReorder) {
    return (
      <ul className="flex flex-col">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => onToggle(task)}
            onDelete={() => onDelete(task.id)}
            onOpen={onOpen ? () => onOpen(task.id) : undefined}
            onSetDueDate={onSetDueDate ? (date) => onSetDueDate(task.id, date) : undefined}
            hideDate={hideDate}
          />
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col">
      {tasks.map((task, index) => (
        <SortableTaskItem
          key={task.id}
          task={task}
          index={index}
          onToggle={() => onToggle(task)}
          onDelete={() => onDelete(task.id)}
          onOpen={onOpen ? () => onOpen(task.id) : undefined}
          onSetDueDate={onSetDueDate ? (date) => onSetDueDate(task.id, date) : undefined}
          hideDate={hideDate}
        />
      ))}
    </ul>
  );
}
