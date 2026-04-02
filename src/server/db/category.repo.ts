import { and, eq, lt } from "drizzle-orm";
import { db } from "./client";
import { categories } from "./schema";

export type CategoryInsert = typeof categories.$inferInsert;
export type CategorySelect = typeof categories.$inferSelect;

const list = async () =>
  (await db.query.categories.findMany({ orderBy: { sortOrder: "asc", name: "asc" } })) ?? [];

const insert = async (data: CategoryInsert) => {
  const [row] = await db.insert(categories).values(data).returning();
  if (!row) throw new Error("Insert failed: no row returned");
  return row;
};

const update = async (id: string, updatedAt: string, fields: Partial<CategoryInsert>) => {
  const [row] = await db
    .update(categories)
    .set({ ...fields, updatedAt })
    .where(and(eq(categories.id, id), lt(categories.updatedAt, updatedAt)))
    .returning();
  if (!row) throw new Error(`Update failed: stale or missing category ${id}`);
  return row;
};

const remove = async (id: string) => {
  const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
  if (!row) throw new Error(`Delete failed: category ${id} not found`);
  return row;
};

export default { list, insert, update, remove };
