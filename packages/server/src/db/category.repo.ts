import { and, eq, lt, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "@hono/zod-openapi";
import { db } from "./client";
import { categories } from "./schema";
import { InsertFailedError, NotFoundError, StaleUpdateError } from "./errors";
import { isoDatetime } from "@newtab-todo/shared/iso";

export type CategoryInsert = typeof categories.$inferInsert;
export type CategorySelect = typeof categories.$inferSelect;

export const categorySelectSchema = createSelectSchema(categories).pick({ id: true });
// list() includes user; insert/update/delete return the flat row without it.
// nullish() allows the key to be absent so all routes satisfy this schema.
const collaboratorUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});

// list() includes user + collaborators; insert/update/delete return flat rows without them.
// nullish() allows these keys to be absent so all routes satisfy this schema.
export const categoryResponseSchema = createSelectSchema(categories).extend({
  user: z.object({ name: z.string() }).nullish(),
  collaborators: z
    .array(z.object({ user: collaboratorUserSchema.nullable() }))
    .nullish(),
});
export const categoryInsertSchema = createInsertSchema(categories, {
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
})
  .required({ id: true, createdAt: true, updatedAt: true })
  .strict();
export const categoryUpdateSchema = createUpdateSchema(categories, { updatedAt: isoDatetime })
  .required({ id: true, updatedAt: true })
  .omit({ createdAt: true })
  .strict();

const list = async (userId: string) =>
  db.query.categories.findMany({
    where: { OR: [{ userId }, { collaborators: { userId } }] },
    with: {
      user: { columns: { name: true } },
      collaborators: {
        with: { user: { columns: { id: true, name: true, username: true, avatarUrl: true } } },
      },
    },
    orderBy: { sortOrder: "asc", name: "asc" },
  });

export type CategoryWithOwner = Awaited<ReturnType<typeof list>>[number];

const findById = async (id: string) => {
  const row = await db.query.categories.findFirst({ where: { id } });
  if (!row) throw new NotFoundError("category", id);
  return row;
};

const findByIdWithCollaborators = async (id: string) => {
  const row = await db.query.categories.findFirst({
    where: { id },
    with: {
      collaborators: {
        with: { user: { columns: { id: true, name: true, username: true, avatarUrl: true } } },
      },
    },
  });
  if (!row) throw new NotFoundError("category", id);
  return row;
};

// LWW insert: if same id arrives again (retry), return the existing row unchanged.
const insert = async (data: CategoryInsert) => {
  const [row] = await db
    .insert(categories)
    .values(data)
    .onConflictDoUpdate({ target: categories.id, set: { updatedAt: sql`${categories.updatedAt}` } })
    .returning();
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

export default { list, findById, findByIdWithCollaborators, insert, update, remove };
