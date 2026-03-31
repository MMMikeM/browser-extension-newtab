import { and, eq, lt } from "drizzle-orm";
import { db } from "./client";
import { notes } from "./schema";

export type NoteInsert = typeof notes.$inferInsert;
export type NoteSelect = typeof notes.$inferSelect;

const list = async () =>
  (await db.query.notes.findMany({ orderBy: { createdAt: "desc" } })) ?? [];

const insert = async (data: NoteInsert) => {
  const [row] = await db.insert(notes).values(data).returning();
  if (!row) throw new Error("Insert failed: no row returned");
  return row;
};

const update = async (id: string, updatedAt: string, fields: Partial<NoteInsert>) => {
  const [row] = await db
    .update(notes)
    .set({ ...fields, updatedAt })
    .where(and(eq(notes.id, id), lt(notes.updatedAt, updatedAt)))
    .returning();
  if (!row) throw new Error(`Update failed: stale or missing note ${id}`);
  return row;
};

const remove = async (id: string) => {
  const [row] = await db.delete(notes).where(eq(notes.id, id)).returning();
  if (!row) throw new Error(`Delete failed: note ${id} not found`);
  return row;
};

export default { list, insert, update, remove };
