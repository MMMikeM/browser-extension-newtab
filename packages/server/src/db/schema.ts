import { defineRelations } from "drizzle-orm";
import { sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
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
  assigneeId: nullableFk("assignee_id", () => users.id, { onDelete: "set null" }),
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
  categoryId: nullableFk("category_id", () => categories.id, { onDelete: "set null" }),
  permission: oneOf("permission", sharePermissions).default("edit"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// --- Push Subscriptions ---

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: pk(),
  userId: nullableFk("user_id", () => users.id, { onDelete: "set null" }),
  endpoint: string("endpoint").unique(),
  p256dh: string("p256dh"),
  auth: string("auth"),
  createdAt: createdAt(),
});

// --- Contacts ---

// Two rows per connection (A→B and B→A) for simple WHERE userId = me queries.
export const contacts = sqliteTable(
  "contacts",
  {
    id: pk(),
    userId: fk("user_id", () => users.id, { onDelete: "cascade" }),
    contactUserId: fk("contact_user_id", () => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("contacts_user_contact_idx").on(t.userId, t.contactUserId)],
);

// --- Invite Tokens ---

export const inviteTokens = sqliteTable("invite_tokens", {
  id: pk(),
  createdByUserId: fk("created_by_user_id", () => users.id, { onDelete: "cascade" }),
  expiresAt: string("expires_at"),
  usedAt: nullableString("used_at"),
  usedByUserId: nullableFk("used_by_user_id", () => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

// --- Category Collaborators ---

export const categoryCollaborators = sqliteTable(
  "category_collaborators",
  {
    id: pk(),
    categoryId: fk("category_id", () => categories.id, { onDelete: "cascade" }),
    userId: fk("user_id", () => users.id, { onDelete: "cascade" }),
    addedAt: createdAt("added_at"),
  },
  (t) => [uniqueIndex("category_collaborators_cat_user_idx").on(t.categoryId, t.userId)],
);

// --- Notification Queue ---

export const notificationQueueTypes = ["reminder-due", "overdue-digest"] as const;

export const notificationQueue = sqliteTable("notification_queue", {
  id: pk(),
  userId: fk("user_id", () => users.id, { onDelete: "cascade" }),
  type: oneOf("type", notificationQueueTypes),
  taskId: nullableFk("task_id", () => tasks.id, { onDelete: "cascade" }),
  scheduledFor: string("scheduled_for"),
  sentAt: nullableString("sent_at"),
  createdAt: createdAt(),
});

// --- Relations ---

export const relations = defineRelations(
  {
    tasks,
    users,
    notes,
    categories,
    pushSubscriptions,
    sessions,
    taskShares,
    contacts,
    inviteTokens,
    categoryCollaborators,
    notificationQueue,
  },
  (r) => ({
    users: {
      tasks: r.many.tasks({ from: r.users.id, to: r.tasks.userId }),
      notes: r.many.notes(),
      categories: r.many.categories(),
      sessions: r.many.sessions(),
      sharedTasks: r.many.taskShares(),
      categoryCollaborations: r.many.categoryCollaborators(),
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
      collaborators: r.many.categoryCollaborators(),
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
      assignee: r.one.users({
        from: r.tasks.assigneeId,
        to: r.users.id,
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
      category: r.one.categories({
        from: r.taskShares.categoryId,
        to: r.categories.id,
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
    contacts: {
      user: r.one.users({
        from: r.contacts.userId,
        to: r.users.id,
      }),
      contactUser: r.one.users({
        from: r.contacts.contactUserId,
        to: r.users.id,
      }),
    },
    inviteTokens: {
      createdByUser: r.one.users({
        from: r.inviteTokens.createdByUserId,
        to: r.users.id,
      }),
      usedByUser: r.one.users({
        from: r.inviteTokens.usedByUserId,
        to: r.users.id,
      }),
    },
    categoryCollaborators: {
      category: r.one.categories({
        from: r.categoryCollaborators.categoryId,
        to: r.categories.id,
      }),
      user: r.one.users({
        from: r.categoryCollaborators.userId,
        to: r.users.id,
      }),
    },
    notificationQueue: {
      user: r.one.users({
        from: r.notificationQueue.userId,
        to: r.users.id,
      }),
      task: r.one.tasks({
        from: r.notificationQueue.taskId,
        to: r.tasks.id,
      }),
    },
  }),
);
