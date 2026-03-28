import { defineRelations } from "drizzle-orm";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { pk, string, nullableString, oneOf, createdAt, updatedAt } from "./columns";

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
