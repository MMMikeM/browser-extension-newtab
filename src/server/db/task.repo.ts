import { and, eq, lt } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "@hono/zod-openapi";
import { db } from "./client";
import { tasks, taskShares, users } from "./schema";
import { InsertFailedError, NotFoundError, StaleUpdateError } from "./errors";
import { isoDatetime } from "./iso";

export type TaskShareInsert = typeof taskShares.$inferInsert;

export const taskShareSelectSchema = createSelectSchema(taskShares).pick({ id: true });
export const taskShareResponseSchema = createSelectSchema(taskShares);

export type TaskInsert = typeof tasks.$inferInsert;

export const taskSelectSchema = createSelectSchema(tasks).pick({ id: true });
export const taskResponseSchema = createSelectSchema(tasks);

const sharedWithUserSchema = createSelectSchema(users).pick({
  id: true,
  name: true,
  username: true,
});

/** Response schema for task list — includes subtasks and shares with user info. */
export const taskListItemSchema = taskResponseSchema.extend({
  subtasks: z.array(taskResponseSchema),
  shares: z.array(
    taskShareResponseSchema.extend({
      sharedWithUser: sharedWithUserSchema.nullable(),
    }),
  ),
});
export const taskInsertSchema = createInsertSchema(tasks, {
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
})
  .required({ id: true, createdAt: true, updatedAt: true })
  .strict();
export const taskUpdateSchema = createUpdateSchema(tasks, { updatedAt: isoDatetime })
  .required({ id: true, updatedAt: true })
  .omit({ createdAt: true })
  .strict();

const list = async (userId: string) =>
  db.query.tasks.findMany({
    where: {
      OR: [{ userId }, { shares: { sharedWithUserId: userId } }],
    },
    with: {
      subtasks: true,
      shares: {
        with: {
          sharedWithUser: { columns: { id: true, name: true, username: true } },
        },
      },
    },
    orderBy: { sortOrder: "asc", createdAt: "asc" },
  });

const findById = async (id: string) => {
  const row = await db.query.tasks.findFirst({
    where: { id },
  });
  if (!row) throw new NotFoundError("task", id);
  return row;
};

const insert = async (data: TaskInsert) => {
  const [row] = await db.insert(tasks).values(data).returning();
  if (!row) throw new InsertFailedError("task");
  return row;
};

const update = async (id: string, updatedAt: string, fields: Partial<TaskInsert>) => {
  const [row] = await db
    .update(tasks)
    .set({ ...fields, updatedAt })
    .where(and(eq(tasks.id, id), lt(tasks.updatedAt, updatedAt)))
    .returning();
  if (!row) throw new StaleUpdateError("task", id);
  return row;
};

const remove = async (id: string) => {
  const [row] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  if (!row) throw new NotFoundError("task", id);
  return row;
};

export type TaskWithRelations = Awaited<ReturnType<typeof list>>[number];

// --- Shares ---

const insertShare = async (data: TaskShareInsert) => {
  const [row] = await db.insert(taskShares).values(data).returning();
  if (!row) throw new InsertFailedError("task share");
  return row;
};

const removeShare = async (id: string) => {
  const [row] = await db.delete(taskShares).where(eq(taskShares.id, id)).returning();
  if (!row) throw new NotFoundError("task share", id);
  return row;
};

export default { list, findById, insert, update, remove, insertShare, removeShare };
