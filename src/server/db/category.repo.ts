import { and, eq, lt } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { db } from "./client";
import { categories } from "./schema";
import { InsertFailedError, NotFoundError, StaleUpdateError } from "./errors";
import { isoDatetime } from "~/lib/utils";

export type CategoryInsert = typeof categories.$inferInsert;
export type CategorySelect = typeof categories.$inferSelect;

export const categorySelectSchema = createSelectSchema(categories).pick({ id: true });
export const categoryInsertSchema = createInsertSchema(categories, { createdAt: isoDatetime, updatedAt: isoDatetime })
  .required({ id: true, createdAt: true, updatedAt: true })
  .strict();
export const categoryUpdateSchema = createUpdateSchema(categories, { updatedAt: isoDatetime })
  .required({ id: true, updatedAt: true })
  .omit({ createdAt: true })
  .strict();

const list = async (userId: string) =>
  db.query.categories.findMany({ where: { userId }, orderBy: { sortOrder: "asc", name: "asc" } });

const insert = async (data: CategoryInsert) => {
  const [row] = await db.insert(categories).values(data).returning();
  if (!row) throw new InsertFailedError("category");
  return row;
};

const update = async (id: string, updatedAt: string, fields: Partial<CategoryInsert>) => {
  const [row] = await db
    .update(categories)
    .set({ ...fields, updatedAt })
    .where(and(eq(categories.id, id), lt(categories.updatedAt, updatedAt)))
    .returning();
  if (!row) throw new StaleUpdateError("category", id);
  return row;
};

const remove = async (id: string) => {
  const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
  if (!row) throw new NotFoundError("category", id);
  return row;
};

export default { list, insert, update, remove };
