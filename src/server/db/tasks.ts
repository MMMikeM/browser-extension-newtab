import { and, eq, lt } from "drizzle-orm";
import { db } from "./client";
import { tasks } from "./schema";

export type TaskInsert = typeof tasks.$inferInsert;
export type TaskSelect = typeof tasks.$inferSelect;

export const listTasks = async () =>
  (await db.query.tasks.findMany({ orderBy: { sortOrder: "asc", createdAt: "asc" } })) ?? [];

export const insertTask = async (data: TaskInsert) => {
  const [row] = await db.insert(tasks).values(data).returning();
  if (!row) throw new Error("Insert failed: no row returned");
  return row;
};

export const updateTask = async (id: string, updatedAt: string, fields: Partial<TaskInsert>) => {
  const [row] = await db
    .update(tasks)
    .set({ ...fields, updatedAt })
    .where(and(eq(tasks.id, id), lt(tasks.updatedAt, updatedAt)))
    .returning();
  if (!row) throw new Error(`Update failed: stale or missing task ${id}`);
  return row;
};

export const deleteTask = async (id: string) => {
  const [row] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  if (!row) throw new Error(`Delete failed: task ${id} not found`);
  return row;
};
