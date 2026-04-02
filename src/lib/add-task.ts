import { createId } from "@paralleldrive/cuid2";
import { generateKeyBetween } from "fractional-indexing";
import { tasks$ } from "~/lib/stores";
import { currentUserId$ } from "~/lib/current-user";
import { now } from "~/lib/utils";
import type { Task } from "~/rpc/tasks";

const bySortOrder = (a: Task, b: Task) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? "");

export const addTask = (title: string, categoryId?: string | null, parentId?: string | null) => {
  const userId = currentUserId$.peek();
  if (!userId) {
    alert("Set up your user in settings first");
    return;
  }
  const tasksMap = tasks$.peek() ?? {};
  const allTasks = Object.values(tasksMap) as Task[];
  const siblings = parentId
    ? allTasks.filter((t) => t.parentId === parentId).sort(bySortOrder)
    : allTasks.filter((t) => !t.parentId).sort(bySortOrder);
  const lastOrder = siblings.length > 0 ? siblings[siblings.length - 1].sortOrder : null;
  const id = createId();
  const timestamp = now();
  tasks$[id].set({
    id,
    userId,
    categoryId: parentId ? null : (categoryId ?? null),
    parentId: parentId ?? null,
    title,
    status: "todo",
    description: null,
    dueDate: null,
    sortOrder: generateKeyBetween(lastOrder, null),
    createdAt: timestamp,
    updatedAt: timestamp,
    subtasks: [],
    shares: [],
  } satisfies Task);
};
