import { useSortable } from "@dnd-kit/react/sortable";
import type { Task } from "~/lib/types";
import { TaskItem } from "./TaskItem";

function SortableTaskItem({
  task,
  subtasks,
  index,
  onToggle,
  onDelete,
  onOpen,
  onSetDueDate,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenSubtask,
  hideDate,
}: {
  task: Task;
  subtasks: Task[];
  index: number;
  onToggle: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  onSetDueDate?: (date: string | null) => void;
  onAddSubtask?: (title: string) => void;
  onToggleSubtask?: (task: Task) => void;
  onDeleteSubtask?: (id: string) => void;
  onOpenSubtask?: (id: string) => void;
  hideDate?: boolean;
}) {
  const { ref } = useSortable({ id: task.id, index, type: "task" });

  return (
    <li ref={ref}>
      <TaskItem
        task={task}
        subtasks={subtasks}
        onToggle={onToggle}
        onDelete={onDelete}
        onOpen={onOpen}
        onSetDueDate={onSetDueDate}
        onAddSubtask={onAddSubtask}
        onToggleSubtask={onToggleSubtask}
        onDeleteSubtask={onDeleteSubtask}
        onOpenSubtask={onOpenSubtask}
        hideDate={hideDate}
      />
    </li>
  );
}

export const TaskList = ({
  tasks,
  allTasks,
  onToggle,
  onDelete,
  onOpen,
  onSetDueDate,
  onAddSubtask,
  onReorder,
  hideDate,
}: {
  tasks: Task[];
  allTasks?: Task[];
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  onOpen?: (id: string) => void;
  onSetDueDate?: (id: string, date: string | null) => void;
  onAddSubtask?: (title: string, parentId: string) => void;
  onReorder?: (taskId: string, newIndex: number, tasks: Task[]) => void;
  hideDate?: boolean;
}) => {
  if (tasks.length === 0) return null;

  const getSubtasks = (parentId: string) =>
    (allTasks ?? [])
      .filter((t) => t.parentId === parentId && t.status !== "done")
      .sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""));

  if (!onReorder) {
    return (
      <ul className="flex flex-col">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            subtasks={getSubtasks(task.id)}
            onToggle={() => onToggle(task)}
            onDelete={() => onDelete(task.id)}
            onOpen={onOpen ? () => onOpen(task.id) : undefined}
            onSetDueDate={onSetDueDate ? (date) => onSetDueDate(task.id, date) : undefined}
            onAddSubtask={onAddSubtask ? (title) => onAddSubtask(title, task.id) : undefined}
            onToggleSubtask={(sub) => onToggle(sub)}
            onDeleteSubtask={(id) => onDelete(id)}
            onOpenSubtask={onOpen}
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
          subtasks={getSubtasks(task.id)}
          index={index}
          onToggle={() => onToggle(task)}
          onDelete={() => onDelete(task.id)}
          onOpen={onOpen ? () => onOpen(task.id) : undefined}
          onSetDueDate={onSetDueDate ? (date) => onSetDueDate(task.id, date) : undefined}
          onAddSubtask={onAddSubtask ? (title) => onAddSubtask(title, task.id) : undefined}
          onToggleSubtask={(sub) => onToggle(sub)}
          onDeleteSubtask={(id) => onDelete(id)}
          onOpenSubtask={onOpen}
          hideDate={hideDate}
        />
      ))}
    </ul>
  );
};
