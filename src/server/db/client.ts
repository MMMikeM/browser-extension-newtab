import { mkdirSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { relations } from "./schema";

mkdirSync(".data", { recursive: true });

const client = createClient({
  url: "file:.data/local.db",
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60,
});

// Enable foreign key enforcement (off by default in SQLite)
await client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle({ client, relations, casing: "snake_case" });
