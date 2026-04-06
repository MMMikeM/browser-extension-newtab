import { mkdirSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { relations } from "./schema";

mkdirSync(".data", { recursive: true });

const client = createClient({
  url: "file:.data/local.db",
  syncUrl: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const syncNow = () =>
  client
    .sync()
    .then(() => console.log("[libsql] sync ok"))
    .catch((err) => console.error("[libsql] sync failed:", err));

// Sync in the background — do NOT await here. The embedded replica has the
// last known good state and is immediately readable. Awaiting blocks the
// entire module graph, which prevents the HTTP server from starting while
// the Turso TCP connection is establishing (takes ~3 min on resume from
// suspend due to OS-level ETIMEDOUT).
syncNow();
setInterval(syncNow, 60_000);

// Enable foreign key enforcement (off by default in SQLite)
await client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle({ client, relations, casing: "snake_case" });
