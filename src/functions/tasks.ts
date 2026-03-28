import { createServerFn } from "@tanstack/react-start";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { and, eq, lt } from "drizzle-orm";
import { db } from "../server/db";
import { tasks } from "../server/schema";
import { authMiddleware } from "../lib/middleware";
import { notifyOtherDevices } from "../server/push";

const selectSchema = createSelectSchema(tasks).pick({ id: true });
const insertSchema = createInsertSchema(tasks);
const updateSchema = createUpdateSchema(tasks).required({ id: true, updatedAt: true });

export type Task = typeof tasks.$inferSelect;

export const getTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(
    async () =>
      (await db.query.tasks.findMany({ orderBy: { sortOrder: "asc", createdAt: "asc" } })) ?? [],
  );

export const createTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(insertSchema)
  .handler(async ({ data }) => {
    const result = await db.insert(tasks).values(data).returning({ id: tasks.id });
    notifyOtherDevices().catch(() => {});
    return result;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(updateSchema)
  .handler(async ({ data: { id, updatedAt, ...fields } }) => {
    const result = (
      await db
        .update(tasks)
        .set({ ...fields, updatedAt })
        .where(and(eq(tasks.id, id!), lt(tasks.updatedAt, updatedAt!)))
    ).toJSON();
    notifyOtherDevices().catch(() => {});
    return result;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(selectSchema)
  .handler(async ({ data }) => {
    const result = (await db.delete(tasks).where(eq(tasks.id, data.id))).toJSON();
    notifyOtherDevices().catch(() => {});
    return result;
  });
