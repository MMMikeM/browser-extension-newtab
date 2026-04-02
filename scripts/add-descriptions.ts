import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

await client.batch([
  {
    sql: "UPDATE tasks SET description = ? WHERE id = ?",
    args: ["Server keeps crashing on deploy, check OOM logs", "task-overdue"],
  },
  {
    sql: "UPDATE tasks SET description = ? WHERE id = ?",
    args: ["Need to add unit tests for the auth module", "task-tests"],
  },
  {
    sql: "UPDATE tasks SET description = ? WHERE id = ?",
    args: ["Faucet drips when turned off, might need new washer", "task-kitchen"],
  },
]);
console.log("Descriptions added");
