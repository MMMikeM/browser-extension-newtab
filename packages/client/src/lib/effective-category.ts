import type { Task } from "~/lib/types";

/**
 * Which list a top-level task appears in for `userId`.
 *
 * - `string` — that category
 * - `null` — the inbox
 * - `undefined` — not listed anywhere for this user
 *
 * Owners file tasks by the task's own categoryId. Tasks in a category the user
 * collaborates on stay in that category (a share never overrides category
 * membership). Recipients of a direct share file it by their share's categoryId.
 */
export const getEffectiveCategoryId = (
  task: Task,
  userId: string,
  collaboratedCategoryIds: Set<string>,
): string | null | undefined => {
  if (task.userId === userId) return task.categoryId ?? null;
  if (task.categoryId && collaboratedCategoryIds.has(task.categoryId)) return task.categoryId;

  const myShare = task.shares.find((s) => s.sharedWithUserId === userId);
  if (!myShare) return task.categoryId ?? undefined;
  return myShare.categoryId ?? null;
};

export const countOpenTasksByCategory = (
  tasks: Task[],
  userId: string,
  collaboratedCategoryIds: Set<string>,
) => {
  const counts = new Map<string | null, number>();
  for (const t of tasks) {
    if (t.parentId || t.status === "done") continue;
    const key = getEffectiveCategoryId(t, userId, collaboratedCategoryIds);
    if (key === undefined) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};
