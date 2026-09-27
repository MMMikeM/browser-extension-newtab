import { and, eq, lt, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "@hono/zod-openapi";
import { db } from "./client";
import { tasks, taskShares, users } from "./schema";
import { InsertFailedError, NotFoundError, StaleUpdateError } from "./errors";
import { isoDatetime } from "@newtab-todo/shared/iso";

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

export const taskListItemSchema = taskResponseSchema.extend({
  user: z.object({ id: z.string(), name: z.string() }).nullable(),
  subtasks: z.array(taskResponseSchema),
  shares: z.array(
    taskShareResponseSchema.extend({
      sharedWithUser: sharedWithUserSchema.nullable(),
    }),
  ),
  assignee: sharedWithUserSchema.nullable(),
});
export const taskInsertSchema = createInsertSchema(tasks, {
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
}).required({ id: true, createdAt: true, updatedAt: true });
export const taskUpdateSchema = createUpdateSchema(tasks, { updatedAt: isoDatetime })
  .required({ id: true, updatedAt: true })
  .omit({ createdAt: true })
  .strict();

const list = async (userId: string) =>
  db.query.tasks.findMany({
    where: {
      OR: [
        { userId },
        { shares: { sharedWithUserId: userId } },
        { category: { collaborators: { userId } } },
        // Subtasks carry no shares or categoryId, so they're reached through their parent
        { parent: { userId } },
        { parent: { shares: { sharedWithUserId: userId } } },
        { parent: { category: { collaborators: { userId } } } },
      ],
    },
    with: {
      user: { columns: { id: true, name: true } },
      subtasks: true,
      shares: {
        with: {
          sharedWithUser: { columns: { id: true, name: true, username: true } },
        },
      },
      assignee: { columns: { id: true, name: true, username: true } },
    },
    orderBy: { sortOrder: "asc", createdAt: "asc" },
  });

const findById = async (id: string) => {
  const row = await db.query.tasks.findFirst({ where: { id } });
  if (!row) throw new NotFoundError("task", id);
  return row;
};

const findByIdWithAccess = async (id: string, _userId: string) => {
  const row = await db.query.tasks.findFirst({
    where: { id },
    with: {
      category: {
        with: { collaborators: { columns: { userId: true } } },
        columns: { id: true },
      },
      parent: {
        columns: { id: true, userId: true },
        with: {
          shares: { columns: { sharedWithUserId: true } },
          category: {
            with: { collaborators: { columns: { userId: true } } },
            columns: { id: true },
          },
        },
      },
    },
  });
  if (!row) throw new NotFoundError("task", id);
  return row;
};

// A retried insert gets the stored row back unchanged: the no-op update lets RETURNING yield it
const insert = async (data: TaskInsert) => {
  const [row] = await db
    .insert(tasks)
    .values(data)
    .onConflictDoUpdate({ target: tasks.id, set: { updatedAt: sql`${tasks.updatedAt}` } })
    .returning();
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

const updateShareCategory = async (
  taskId: string,
  sharedWithUserId: string,
  categoryId: string | null,
) => {
  const [row] = await db
    .update(taskShares)
    .set({ categoryId })
    .where(and(eq(taskShares.taskId, taskId), eq(taskShares.sharedWithUserId, sharedWithUserId)))
    .returning();
  if (!row) throw new NotFoundError("task share", taskId);
  return row;
};

/** A category's tasks and their subtasks, which carry no categoryId of their own. */
const listInCategory = async (categoryId: string) =>
  db.query.tasks.findMany({
    where: { OR: [{ categoryId }, { parent: { categoryId } }] },
    columns: { id: true, userId: true, categoryId: true },
    with: { shares: { columns: { sharedWithUserId: true } } },
  });

const listShareUserIds = async (taskId: string) => {
  const rows = await db.query.taskShares.findMany({
    where: { taskId },
    columns: { sharedWithUserId: true },
  });
  return rows.map((r) => r.sharedWithUserId);
};

const findOverdue = async (beforeDate: string) =>
  db.query.tasks.findMany({
    where: {
      dueDate: { lt: beforeDate },
      status: { in: ["todo", "in_progress"] },
    },
    columns: { id: true, title: true, dueDate: true, userId: true },
  });

export default {
  list,
  findById,
  findByIdWithAccess,
  insert,
  update,
  remove,
  insertShare,
  removeShare,
  updateShareCategory,
  listInCategory,
  listShareUserIds,
  findOverdue,
};
