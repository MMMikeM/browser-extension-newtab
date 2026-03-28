import { defineRelations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { pk, string, nullableString, oneOf, createdAt, updatedAt } from "./columns";
import { isoDatetime } from "~/lib/utils";

export const taskStatuses = ["todo", "in_progress", "done"] as const;

export const tasks = sqliteTable("tasks", {
  id: pk(),
  title: string("title"),
  description: nullableString("description"),
  status: oneOf("status", taskStatuses).default("todo"),
  sortOrder: nullableString("sort_order"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: pk(),
  endpoint: string("endpoint").unique(),
  p256dh: string("p256dh"),
  auth: string("auth"),
  createdAt: createdAt(),
});

export const relations = defineRelations({ tasks, pushSubscriptions });

// Zod schemas for task validation — co-located with the table they validate
export const taskSelectSchema = createSelectSchema(tasks).pick({ id: true });
export const taskInsertSchema = createInsertSchema(tasks, {
  createdAt: isoDatetime,
})
  .omit({ updatedAt: true })
  .strict();
export const taskUpdateSchema = createUpdateSchema(tasks, {
  updatedAt: isoDatetime,
})
  .required({ id: true, updatedAt: true })
  .omit({ createdAt: true })
  .strict();
