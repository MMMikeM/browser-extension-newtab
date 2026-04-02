import { createId } from "@paralleldrive/cuid2";
import { generateKeyBetween } from "fractional-indexing";
import { tasks$ } from "~/lib/stores";
import { currentUserId$ } from "~/lib/current-user";
import type { Task } from "~/rpc/tasks";

const bySortOrder = (a: Task, b: Task) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? "");

export const addTask = (title: string, categoryId?: string | null) => {
  const userId = currentUserId$.peek();
  if (!userId) {
    alert("Set up your user in settings first");
    return;
  }
  const tasksMap = tasks$.peek() ?? {};
  const sorted = (Object.values(tasksMap) as Task[]).sort(bySortOrder);
  const lastOrder = sorted.length > 0 ? sorted[sorted.length - 1].sortOrder : null;
  const id = createId();
  tasks$[id].set({
    id,
    userId,
    categoryId: categoryId ?? null,
    title,
    status: "todo",
    description: null,
    dueDate: null,
    sortOrder: generateKeyBetween(lastOrder, null),
  } as Task);
};
