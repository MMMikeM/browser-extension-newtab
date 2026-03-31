import { and, eq, lt } from "drizzle-orm";
import { db } from "./client";
import { users } from "./schema";

export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;

const list = async () =>
  (await db.query.users.findMany({ orderBy: { name: "asc" } })) ?? [];

const insert = async (data: UserInsert) => {
  const [row] = await db.insert(users).values(data).returning();
  if (!row) throw new Error("Insert failed: no row returned");
  return row;
};

const update = async (id: string, updatedAt: string, fields: Partial<UserInsert>) => {
  const [row] = await db
    .update(users)
    .set({ ...fields, updatedAt })
    .where(and(eq(users.id, id), lt(users.updatedAt, updatedAt)))
    .returning();
  if (!row) throw new Error(`Update failed: stale or missing user ${id}`);
  return row;
};

const remove = async (id: string) => {
  const [row] = await db.delete(users).where(eq(users.id, id)).returning();
  if (!row) throw new Error(`Delete failed: user ${id} not found`);
  return row;
};

export default { list, insert, update, remove };
