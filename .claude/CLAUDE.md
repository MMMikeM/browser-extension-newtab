# New Tab Todo

## Rules

- **Never commit without explicit user permission.** Always ask before committing.

Personal task tracker Firefox extension replacing the new tab page. Single user, 2-3 machines, backend on Fly.io.

## Architecture

See `docs/architecture.md` for the full spec. Key points:

- **Extension**: MV2 Firefox extension, sideloaded (not AMO). Replaces new tab with a TanStack Start SPA.
- **Backend**: TanStack Start server functions on Fly.io, Turso (libSQL) with embedded replica, bearer token auth via middleware.
- **Stack**: TypeScript, React 19, TanStack Start (SPA mode), TanStack Router, TanStack Query, Drizzle ORM v1, Vite 8, Tailwind v4, shadcn/ui (base primitives).

## Stack decisions

- **ORM**: Drizzle v1 beta with `@libsql/client` embedded replica (local SQLite synced to Turso)
- **Auth**: `createMiddleware()` — client attaches Bearer header, server validates via `getRequestHeader()`. Token in `localStorage`, validated with `crypto.timingSafeEqual`.
- **Styling**: `tailwind-variants` replaces CVA + clsx + tailwind-merge. `tv()` for variants, `cn()` for merging.
- **UI primitives**: shadcn/ui with **base** (React Aria), NOT radix. Use `render`, not `asChild`.
- **Formatting**: oxfmt. **Linting**: oxlint.
- **Import protection**: `*.server.*` files and `server/` dirs blocked from client bundle via vite config.
- **Conflict resolution**: Last-write-wins via `WHERE updated_at < ?` on updates.

## Spike results (validated 2026-03-26)

A working spike lives at `../newtab-todo-spike/`. Critical findings that MUST be followed:

### `@tanstack/start` is DEAD

Use `@tanstack/react-start` (1.167.x+). Import map:

- `@tanstack/react-start` — `createServerFn`, `createMiddleware`
- `@tanstack/react-start/server` — `getRequestHeader`
- `@tanstack/react-start/client` — `StartClient`
- `@tanstack/react-start/plugin/vite` — `tanstackStart`
- `@tanstack/react-router` — `HeadContent`, `Scripts` (NOT from react-start)

### Router MUST use hash history

`moz-extension://` URLs don't match routes. Hash history makes path `#/`.

### MV2 CSP: inline scripts are BLOCKED

`scripts/build-extension.ts` extracts inline scripts and patches the TSR hydration manifest.

### CORS for extension → server

```
Access-Control-Allow-Origin: <moz-extension:// origin>
Access-Control-Allow-Headers: authorization, content-type, x-tsr-serverFn, accept
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Expose-Headers: x-tss-serialized, x-tss-raw
```

`Access-Control-Expose-Headers` is required or all server functions return `undefined`.

## Dev workflow

- `pnpm dev` — vite dev server (SSR + server functions, browser tab testing)
- `pnpm build` — full build + extension assembly
- `pnpm start` — production server (extension → server fn calls)
- `pnpm lint` / `pnpm fmt` — oxlint / oxfmt
- `npx drizzle-kit push` — push schema to Turso
- `npx drizzle-kit studio` — Drizzle Studio GUI
- Load `dist/extension/` via `about:debugging` → This Firefox → Load Temporary Add-on

## Project structure

```
src/
  router.tsx                ← router with hash history
  routes/
    __root.tsx              ← HTML shell, QueryClientProvider, Tailwind CSS
    index.tsx               ← main task UI (orchestration only)
  functions/
    tasks.ts                ← server functions (CRUD, Drizzle queries, Zod validators)
  components/
    TokenGate.tsx           ← auth token input gate
    AddTaskInput.tsx         ← task creation input
    TaskItem.tsx            ← single task row (shadcn Checkbox + Button)
    TaskList.tsx            ← task list renderer
    ui/                     ← shadcn components (button, checkbox, input, card)
  lib/
    db.server.ts            ← Drizzle instance + Turso embedded replica
    auth.server.ts          ← bearer token validation (constant-time compare)
    middleware.ts           ← TanStack Start auth middleware (client + server)
    schema.ts               ← Drizzle table definitions
    columns.ts              ← column helper functions (pk, string, timestamps, fk)
    hooks.ts                ← TanStack Query hooks (useTasks, useAddTask, etc.)
    utils.ts                ← cn() re-export from tailwind-variants, StyledProps type
  styles/
    app.css                 ← Tailwind v4 + shadcn theme tokens
extension/
  manifest.json             ← MV2 manifest (source, copied to dist)
scripts/
  build-extension.ts        ← post-build CSP patching
  serve-prod.ts             ← production server wrapper with CORS
drizzle.config.ts           ← Drizzle Kit config (Turso)
components.json             ← shadcn/ui config (base-maia preset)
docs/
  architecture.md           ← full architecture spec
```
