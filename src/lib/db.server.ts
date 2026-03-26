import { createClient } from '@libsql/client'

export const client = createClient({
  url: 'file:local.db',
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60,
})

// TODO: Replace with Drizzle schema + migrations
export async function initDb() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'todo',
      sort_order  TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `)
}
