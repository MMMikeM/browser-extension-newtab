import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: "file:local.db",
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60,
});

// Enable foreign key enforcement (off by default in SQLite)
await client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle({ client, schema, casing: "snake_case" });
