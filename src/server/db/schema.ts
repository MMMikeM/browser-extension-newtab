import { defineRelations } from "drizzle-orm";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { text } from "drizzle-orm/sqlite-core";
import { pk, string, nullableString, oneOf, fk, nullableFk, createdAt, updatedAt } from "./columns";

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

// --- Tasks ---

export const taskStatuses = ["todo", "in_progress", "done"] as const;

export const tasks = sqliteTable("tasks", {
  id: pk(),
  userId: fk("user_id", () => users.id, { onDelete: "cascade" }),
  categoryId: nullableFk("category_id", () => categories.id, { onDelete: "set null" }),
  parentId: text("parent_id"),
  title: string("title"),
  description: nullableString("description"),
  status: oneOf("status", taskStatuses).default("todo"),
  dueDate: nullableString("due_date"),
  sortOrder: nullableString("sort_order"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// --- Users ---

export const users = sqliteTable("users", {
  id: pk(),
  name: string("name"),
  username: string("username").unique(),
  passwordHash: string("password_hash"),
  avatarUrl: nullableString("avatar_url"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// --- Sessions ---

export const sessions = sqliteTable("sessions", {
  id: pk(),
  userId: fk("user_id", () => users.id, { onDelete: "cascade" }),
  expiresAt: string("expires_at"),
  createdAt: createdAt(),
});

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

// --- Task Shares ---

export const sharePermissions = ["view", "edit"] as const;

export const taskShares = sqliteTable("task_shares", {
  id: pk(),
  taskId: fk("task_id", () => tasks.id, { onDelete: "cascade" }),
  sharedWithUserId: fk("shared_with_user_id", () => users.id, { onDelete: "cascade" }),
  permission: oneOf("permission", sharePermissions).default("edit"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

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
  { tasks, users, notes, categories, pushSubscriptions, sessions, taskShares },
  (r) => ({
    users: {
      tasks: r.many.tasks(),
      notes: r.many.notes(),
      categories: r.many.categories(),
      sessions: r.many.sessions(),
      sharedTasks: r.many.taskShares(),
    },
    sessions: {
      user: r.one.users({
        from: r.sessions.userId,
        to: r.users.id,
      }),
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
      parent: r.one.tasks({
        from: r.tasks.parentId,
        to: r.tasks.id,
      }),
      subtasks: r.many.tasks(),
      notes: r.many.notes(),
      shares: r.many.taskShares(),
    },
    taskShares: {
      task: r.one.tasks({
        from: r.taskShares.taskId,
        to: r.tasks.id,
      }),
      sharedWithUser: r.one.users({
        from: r.taskShares.sharedWithUserId,
        to: r.users.id,
      }),
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
