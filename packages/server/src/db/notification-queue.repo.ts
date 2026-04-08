import { and, eq, inArray, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "./client";
import { notificationQueue } from "./schema";

const insert = async (data: {
  userId: string;
  type: "reminder-due" | "overdue-digest";
  taskId: string | null;
  scheduledFor: string;
}) => {
  await db.insert(notificationQueue).values({ id: createId(), ...data });
};

/** Find all pending (unsent) rows scheduled at or before the given ISO timestamp. */
const findPending = async (beforeOrAt: string) =>
  db.query.notificationQueue.findMany({
    where: {
      sentAt: { isNull: true },
      scheduledFor: { lte: beforeOrAt },
    },
    with: {
      task: { columns: { id: true, title: true, dueDate: true, status: true } },
    },
  });

/** Mark rows as sent. */
const markSent = async (ids: string[], sentAt: string) => {
  if (ids.length === 0) return;
  await db
    .update(notificationQueue)
    .set({ sentAt })
    .where(inArray(notificationQueue.id, ids));
};

/** Delete all pending reminder rows for a specific task. Used when dueDate changes or is removed. */
const deleteByTask = async (taskId: string) => {
  await db
    .delete(notificationQueue)
    .where(
      and(
        eq(notificationQueue.taskId, taskId),
        eq(notificationQueue.type, "reminder-due"),
        isNull(notificationQueue.sentAt),
      ),
    );
};

/** Returns userIds that already received an overdue-digest since the given ISO timestamp. */
const findDigestUserIdsSince = async (since: string) => {
  const rows = await db.query.notificationQueue.findMany({
    where: {
      type: "overdue-digest",
      sentAt: { gte: since },
    },
    columns: { userId: true },
  });
  return rows.map((r) => r.userId);
};

/** Insert a row that is already marked as sent (used for digest dedup tracking). */
const insertSent = async (data: {
  userId: string;
  type: "reminder-due" | "overdue-digest";
  taskId: string | null;
  scheduledFor: string;
  sentAt: string;
}) => {
  await db.insert(notificationQueue).values({ id: createId(), ...data });
};

export default { insert, findPending, markSent, deleteByTask, findDigestUserIdsSince, insertSent };
