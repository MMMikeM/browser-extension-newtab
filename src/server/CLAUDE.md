# Server Directory

**Import-protected** — `importProtection` in `vite.config.ts` blocks any file matching `**/server/**` from the client bundle.

## What goes here vs `src/rpc/`

- **Here**: Node builtins, database clients, secrets — anything that must never reach the browser.
- **`src/rpc/`**: Server functions (`createServerFn`) are isomorphic — the bundler replaces handlers with RPC stubs on the client. They must NOT live here or import protection blocks the client stubs.
- **`src/lib/middleware.ts`**: Middleware (`createMiddleware`) has both `.client()` and `.server()` handlers — also must NOT live here.

## API routes

- **`events.get.ts`** — SSE event stream (clients subscribe, mutations broadcast via `events.ts`)
- **`[model].get.ts`** — generic model list endpoint (used by sync subscribe callbacks)
- **`auth.post.ts`** — token validation endpoint

## Database

Single Turso instance with embedded replica. `syncInterval: 60` keeps local SQLite in sync. All writes go through Turso (remote-first), reads are local. For a single Fly instance, `syncInterval` could be replaced with manual `client.sync()` on boot + after writes.

## Query patterns

- **Always use `db.query` (relational API)** for reads — never `db.select().from()`. The relational API is the standard in this project.
- **Drizzle v1 `where` uses object syntax**, not `eq()` operators: `where: { id: someId }`. For operators like `gt`, use: `where: { expiresAt: gt(sessions.expiresAt, now) }`.
- **`db.insert()` / `db.update()` / `db.delete()`** (classic API) are fine for writes — the relational API is read-only.
- Check existing repos in `src/server/db/` for the canonical patterns before writing new queries.
