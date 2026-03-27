# Server Directory

This directory is **import-protected** — the TanStack Start bundler blocks any file in `**/server/**` from the client bundle. See `importProtection` in `vite.config.ts`.

## What goes here

Files that use Node builtins, database clients, secrets, or anything that must never reach the browser:

- `db.ts` — Drizzle instance + Turso embedded replica
- `auth.ts` — bearer token validation (`crypto.timingSafeEqual`)
- `schema.ts` — Drizzle table definitions
- `columns.ts` — column helper functions

## What does NOT go here

- **Server functions** (`createServerFn`) — these are isomorphic. The bundler replaces handler implementations with RPC stubs in the client bundle, so clients need to import them. They live in `src/functions/`.
- **Middleware** (`createMiddleware`) — the auth middleware has both `.client()` and `.server()` handlers, so it must be importable from both environments. It lives in `src/lib/middleware.ts`.
