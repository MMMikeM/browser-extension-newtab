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
