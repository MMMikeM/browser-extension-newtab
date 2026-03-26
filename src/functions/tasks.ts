import { createServerFn } from "@tanstack/react-start";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { eq, asc } from "drizzle-orm";
import { db } from "../lib/db.server";
import { tasks } from "../lib/schema";
import { authMiddleware } from "../lib/middleware";

const selectSchema = createSelectSchema(tasks).pick({ id: true });
const insertSchema = createInsertSchema(tasks);
const updateSchema = createUpdateSchema(tasks).required({ id: true, updatedAt: true });

export type Task = typeof tasks.$inferSelect;

export const getTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    return db.select().from(tasks).orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(insertSchema)
  .handler(async ({ data }) => {
    const [inserted] = await db.insert(tasks).values(data).returning({ id: tasks.id });
    return inserted;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(updateSchema)
  .handler(async ({ data }) => {
    const { id, updatedAt, ...fields } = data;
    const result = await db
      .update(tasks)
      .set({ ...fields, updatedAt })
      .where(eq(tasks.id, id!));
    return { updated: result.rowsAffected > 0 };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(selectSchema)
  .handler(async ({ data }) => {
    const result = await db.delete(tasks).where(eq(tasks.id, data.id));
    return { deleted: result.rowsAffected > 0 };
  });
