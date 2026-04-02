import { defineRelations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { pk, string, nullableString, oneOf, fk, nullableFk, createdAt, updatedAt } from "./columns";
import { isoDatetime } from "~/lib/utils";

// --- Categories ---

export const categories = sqliteTable("categories", {
  id: pk(),
  userId: fk("user_id", () => users.id, { onDelete: "cascade" }),
  name: string("name"),
  color: nullableString("color"),
  sortOrder: nullableString("sort_order"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const categorySelectSchema = createSelectSchema(categories).pick({ id: true });
export const categoryInsertSchema = createInsertSchema(categories, { createdAt: isoDatetime })
  .omit({ updatedAt: true })
  .required({ id: true, createdAt: true })
  .strict();
export const categoryUpdateSchema = createUpdateSchema(categories, { updatedAt: isoDatetime })
  .required({ id: true, updatedAt: true })
  .omit({ createdAt: true })
  .strict();

// --- Tasks ---

export const taskStatuses = ["todo", "in_progress", "done"] as const;

export const tasks = sqliteTable("tasks", {
  id: pk(),
  userId: fk("user_id", () => users.id, { onDelete: "cascade" }),
  categoryId: nullableFk("category_id", () => categories.id, { onDelete: "set null" }),
  title: string("title"),
  description: nullableString("description"),
  status: oneOf("status", taskStatuses).default("todo"),
  dueDate: nullableString("due_date"),
  sortOrder: nullableString("sort_order"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const taskSelectSchema = createSelectSchema(tasks).pick({ id: true });
export const taskInsertSchema = createInsertSchema(tasks, { createdAt: isoDatetime })
  .omit({ updatedAt: true })
  .required({ id: true, createdAt: true })
  .strict();
export const taskUpdateSchema = createUpdateSchema(tasks, { updatedAt: isoDatetime })
  .required({ id: true, updatedAt: true })
  .omit({ createdAt: true })
  .strict();

// --- Users ---

export const users = sqliteTable("users", {
  id: pk(),
  name: string("name"),
  email: string("email"),
  avatarUrl: nullableString("avatar_url"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const userSelectSchema = createSelectSchema(users).pick({ id: true });
export const userInsertSchema = createInsertSchema(users, { createdAt: isoDatetime })
  .omit({ updatedAt: true })
  .required({ id: true, createdAt: true })
  .strict();
export const userUpdateSchema = createUpdateSchema(users, { updatedAt: isoDatetime })
  .required({ id: true, updatedAt: true })
  .omit({ createdAt: true })
  .strict();

// --- Notes ---

export const notes = sqliteTable("notes", {
  id: pk(),
  userId: fk("user_id", () => users.id, { onDelete: "cascade" }),
  title: string("title"),
  content: nullableString("content"),
  taskId: nullableFk("task_id", () => tasks.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const noteSelectSchema = createSelectSchema(notes).pick({ id: true });
export const noteInsertSchema = createInsertSchema(notes, { createdAt: isoDatetime })
  .omit({ updatedAt: true })
  .required({ id: true, createdAt: true })
  .strict();
export const noteUpdateSchema = createUpdateSchema(notes, { updatedAt: isoDatetime })
  .required({ id: true, updatedAt: true })
  .omit({ createdAt: true })
  .strict();

// --- Push Subscriptions ---

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: pk(),
  endpoint: string("endpoint").unique(),
  p256dh: string("p256dh"),
  auth: string("auth"),
  createdAt: createdAt(),
});

// --- Relations ---

export const relations = defineRelations(
  { tasks, users, notes, categories, pushSubscriptions },
  (r) => ({
    users: {
      tasks: r.many.tasks(),
      notes: r.many.notes(),
      categories: r.many.categories(),
    },
    categories: {
      user: r.one.users({
        from: r.categories.userId,
        to: r.users.id,
      }),
      tasks: r.many.tasks(),
    },
    tasks: {
      user: r.one.users({
        from: r.tasks.userId,
        to: r.users.id,
      }),
      category: r.one.categories({
        from: r.tasks.categoryId,
        to: r.categories.id,
      }),
      notes: r.many.notes(),
    },
    notes: {
      user: r.one.users({
        from: r.notes.userId,
        to: r.users.id,
      }),
      task: r.one.tasks({
        from: r.notes.taskId,
        to: r.tasks.id,
      }),
    },
  }),
);
