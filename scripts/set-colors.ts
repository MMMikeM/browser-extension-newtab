import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

await client.batch([
  {
    sql: "UPDATE categories SET color = ? WHERE id = ?",
    args: ["oklch(0.623 0.214 259.815)", "cat-work"],
  },
  {
    sql: "UPDATE categories SET color = ? WHERE id = ?",
    args: ["oklch(0.723 0.219 149.579)", "cat-home"],
  },
]);
console.log("Colors set: Work=blue, Home=green");
