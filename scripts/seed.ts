import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const userId = "sdcuvncpvl1i9vpch303nynb";
const now = new Date().toISOString();
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

// Create categories
await client.batch([
  {
    sql: "INSERT OR IGNORE INTO categories (id, user_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: ["cat-work", userId, "Work", "a0", now, now],
  },
  {
    sql: "INSERT OR IGNORE INTO categories (id, user_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: ["cat-home", userId, "Home", "a1", now, now],
  },
]);

// Update existing tasks to have category + due dates
const tasks = await client.execute("SELECT id FROM tasks WHERE user_id = ?", [userId]);
for (const task of tasks.rows) {
  await client.execute("UPDATE tasks SET category_id = ?, due_date = ? WHERE id = ?", [
    "cat-work",
    today,
    task.id,
  ]);
}

// Add sample tasks
await client.batch([
  {
    sql: "INSERT OR IGNORE INTO tasks (id, user_id, category_id, title, status, due_date, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: ["task-groceries", userId, "cat-home", "Buy groceries", "todo", today, "a0", now, now],
  },
  {
    sql: "INSERT OR IGNORE INTO tasks (id, user_id, category_id, title, status, due_date, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: ["task-kitchen", userId, "cat-home", "Fix kitchen tap", "todo", null, "a1", now, now],
  },
  {
    sql: "INSERT OR IGNORE INTO tasks (id, user_id, category_id, title, status, due_date, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: ["task-review", userId, "cat-work", "Review PR", "todo", tomorrow, "b0", now, now],
  },
  {
    sql: "INSERT OR IGNORE INTO tasks (id, user_id, category_id, title, status, due_date, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: ["task-tests", userId, "cat-work", "Write tests", "todo", nextWeek, "c0", now, now],
  },
  {
    sql: "INSERT OR IGNORE INTO tasks (id, user_id, category_id, title, status, due_date, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: ["task-refactor", userId, "cat-work", "Refactor auth", "todo", null, "d0", now, now],
  },
  {
    sql: "INSERT OR IGNORE INTO tasks (id, user_id, category_id, title, status, due_date, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [
      "task-overdue",
      userId,
      "cat-work",
      "Fix deployment bug",
      "todo",
      yesterday,
      "a5",
      now,
      now,
    ],
  },
]);

console.log("Seeded categories + tasks");
