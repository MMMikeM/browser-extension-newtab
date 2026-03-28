import { and, eq, lt } from "drizzle-orm";
import { db } from "./client";
import { tasks } from "./schema";

export type TaskInsert = typeof tasks.$inferInsert;
export type TaskSelect = typeof tasks.$inferSelect;

const list = async () =>
  (await db.query.tasks.findMany({ orderBy: { sortOrder: "asc", createdAt: "asc" } })) ?? [];

const insert = async (data: TaskInsert) => {
  console.log("[repo] insert:", data.id);
  const [row] = await db.insert(tasks).values(data).returning();
  if (!row) throw new Error("Insert failed: no row returned");
  console.log("[repo] insert success:", row.id);
  return row;
};

const update = async (id: string, updatedAt: string, fields: Partial<TaskInsert>) => {
  console.log("[repo] update:", id, "updatedAt:", updatedAt, "fields:", Object.keys(fields));
  const [row] = await db
    .update(tasks)
    .set({ ...fields, updatedAt })
    .where(and(eq(tasks.id, id), lt(tasks.updatedAt, updatedAt)))
    .returning();
  if (!row) {
    console.error("[repo] update failed — stale or missing:", id);
    throw new Error(`Update failed: stale or missing task ${id}`);
  }
  console.log("[repo] update success:", id);
  return row;
};

const remove = async (id: string) => {
  console.log("[repo] delete:", id);
  const [row] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  if (!row) {
    console.error("[repo] delete failed — not found:", id);
    throw new Error(`Delete failed: task ${id} not found`);
  }
  console.log("[repo] delete success:", id);
  return row;
};

export default { list, insert, update, remove };
