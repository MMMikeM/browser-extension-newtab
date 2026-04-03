import { createId } from "@paralleldrive/cuid2";
import { generateKeyBetween } from "fractional-indexing";
import { getCurrentUserId } from "~/lib/current-user";
import { now } from "~/lib/utils";
import { tasksCollection } from "~/lib/collections";
import { offline } from "~/lib/offline";
import type { Task } from "~/lib/types";

const bySortOrder = (a: Task, b: Task) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? "");

export const addTask = (title: string, categoryId?: string | null, parentId?: string | null) => {
  const userId = getCurrentUserId();
  if (!userId) {
    alert("Set up your user in settings first");
    return;
  }

  const allTasks = [...tasksCollection.state?.values()];
  const siblings = parentId
    ? allTasks.filter((t) => t.parentId === parentId).sort(bySortOrder)
    : allTasks.filter((t) => !t.parentId).sort(bySortOrder);
  const lastOrder = siblings.length > 0 ? siblings[siblings.length - 1].sortOrder : null;
  const sortOrder = generateKeyBetween(lastOrder, null);

  const timestamp = now();
  const tx = offline.createOfflineTransaction({ mutationFnName: "syncTasks" });
  tx.mutate(() =>
    tasksCollection.insert({
      id: createId(),
      userId,
      categoryId: parentId ? null : (categoryId ?? null),
      parentId: parentId ?? null,
      title,
      status: "todo",
      description: null,
      dueDate: null,
      sortOrder,
      createdAt: timestamp,
      updatedAt: timestamp,
      subtasks: [],
      shares: [],
    }),
  );
};
