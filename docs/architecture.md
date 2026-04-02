# New Tab Todo — Architecture

## Overview

A personal task tracker that replaces the browser new tab page. Runs as a Firefox extension and as a web app at the same URL. Local-first: data lives on-device in IndexedDB, with optional sync to a server for cross-device consistency.

---

## Principles

- **Local state is king** — the app works fully offline. Every interaction updates local state instantly.
- **Sync is optional** — set a token to enable background sync to the server. Without it, the app is a standalone local todo list.
- **Native feel** — prerendered SPA shell loads with layout visible before JS executes. No blank flash, no loading spinners.
- **Eventual consistency** — local changes sync to the server when online. Conflicts resolved by last-write-wins on `updatedAt`.

---

## Architecture

```
┌──────────────────────────────────┐        ┌────────────────────────────────┐
│   Client (extension or browser)  │        │    Fly.io (TanStack Start)     │
│                                  │        │                                │
│   Legend State observable         │◄──────►│   Server functions (CRUD)      │
│   ├─ IDB persistence (local)    │  sync  │   Drizzle ORM → Turso (libSQL) │
│   └─ syncedCrud (remote)        │        │   Bearer token auth            │
│                                  │        │                                │
│   SPA mode + prerendered shell   │        │   Nitro server + CORS          │
│   TanStack Router (hash/browser) │        │   middleware for extensions    │
└──────────────────────────────────┘        └────────────────────────────────┘
```

The client is the source of truth. The server is the sync target.

---

## Client

### SPA mode + prerendered shell

TanStack Start runs in **SPA mode** — route components only render on the client. The build prerenders an HTML shell containing:

- `<html>`, `<head>`, CSS, script tags (via `shellComponent`)
- Page layout, heading, input field (via root `component` — prerendered with static parts)

Client-only modules (stores, auth token, settings) are kept out of the prerendered shell's module graph via lazy imports and dynamic `import()`. This avoids `localStorage` / `IndexedDB` crashes during server-side prerender.

### Legend State (data layer)

Legend State v3 replaces TanStack Query. A single `syncedCrud` observable per model handles:

- **Local persistence** — IndexedDB via `observablePersistIndexedDB`. Data survives page reloads and offline use.
- **Remote sync** — CRUD operations via TanStack Start server functions. Gated by `waitForSet: authToken$` — sync only runs when a token is present in localStorage.
- **Retry** — infinite retry with exponential backoff for network errors. Non-network errors (validation, auth) are swallowed by the `rpc` wrapper to prevent infinite retry loops. Pending changes persist to IDB and survive app restarts (`retrySync: true`).
- **LWW conflict resolution** — `fieldUpdatedAt: 'updatedAt'` lets Legend State track which version wins.

```typescript
export const tasks$ = observable(
  syncedCrud({
    list: () => rpcList(() => getTasks()),
    create: (input) => rpc(() => createTask({ data: input })),
    update: (input) => rpc(() => updateTask({ data: input })),
    delete: (input) => rpc(() => deleteTask({ data: { id: input.id } })),
    persist: { name: "tasks", plugin: idbPlugin, retrySync: true },
    retry: { infinite: true },
    fieldUpdatedAt: "updatedAt",
    waitForSet: authToken$,
  }),
);
```

### Error handling

Legend State's `onError` `cancelRetry` is broken (the params object is not the retry loop's state). Error handling is done in `rpc`/`rpcList` wrappers:

- **Network errors** (TypeError, fetch failures, timeouts) → rethrow → Legend State retries
- **App errors** (validation, auth) → `rpcList` returns `[]`, `rpc` rethrows (mutation errors propagate)

### Routing

Context-aware history — browser history for the web, hash history for the extension:

```typescript
const router = createRouter({
  routeTree,
  history: isExtension ? createHashHistory() : createBrowserHistory(),
});
```

Hash history is needed in the extension because `moz-extension://<uuid>/index.html` has pathname `/index.html` which doesn't match the `/` route. Hash history makes the route `#/` regardless of the base URL.

### React hooks

Thin wrappers over the Legend State store, maintaining a familiar React API:

- `useTasks()` — returns `{ data: Task[] }` sorted by `sortOrder`
- `useAddTask()` — returns `{ add(title) }` with cuid2 ID + fractional indexing + userId
- `useUpdateTask()` — returns `{ mutate({ data }) }` for status/field changes
- `useDeleteTask()` — returns `{ mutate({ data }) }` for removal

All mutations are instant — they write to the observable directly. Remote sync happens in the background.

---

## Data Model

```
tasks       users       notes       push_subscriptions
------      ------      ------      -------------------
id (PK)     id (PK)     id (PK)     endpoint (PK)
userId (FK) name        userId (FK) p256dh
title       email       title       auth
description avatarUrl   content     createdAt
status      createdAt   createdAt
sortOrder   updatedAt   updatedAt
createdAt
updatedAt
```

Tasks and notes have a `userId` foreign key. Users are created in the settings UI.

---

## Extension

MV2, sideloaded via `about:debugging` during development.

```json
{
  "manifest_version": 2,
  "name": "New Tab Todo",
  "chrome_url_overrides": { "newtab": "index.html" },
  "permissions": ["storage"]
}
```

The extension build (`pnpm build:ext`) takes the prerendered HTML from `.output/public/`, patches inline scripts for MV2 CSP compliance, and outputs to `.output/extension/`.

---

## Server

- **Runtime**: Node.js on Fly.io (single instance)
- **Framework**: TanStack Start with Nitro server
- **Database**: Turso (libSQL) with embedded replica (local SQLite synced to Turso cloud, `syncInterval: 60`)
- **Auth**: Static bearer token validated with `crypto.timingSafeEqual`
- **CORS**: Nitro middleware allows `moz-extension://` and `chrome-extension://` origins

Server functions in `src/rpc/` are the sync API. Each validates input with Drizzle/Zod schemas and uses the auth middleware.

---

## Auth

A single long-lived static token stored in `localStorage`. Set once in the settings UI, passed as a `Bearer` header on every server function call. Without a token, the app works offline-only — no sync, no server calls.

Current user ID is stored separately in localStorage. Required for task creation (userId foreign key).

---

## Build

The build uses `scripts/build.mjs` which calls Vite's `createBuilder` API and forces `process.exit()` after completion — Vite/Nitro's prerender leaves dangling sockets that prevent clean exit (upstream bug).

| Command          | Output                                | Purpose                                    |
| ---------------- | ------------------------------------- | ------------------------------------------ |
| `pnpm build`     | `.output/server/` + `.output/public/` | Server deployment (Fly.io)                 |
| `pnpm build:ext` | `.output/extension/`                  | Extension files (load via about:debugging) |
| `pnpm dev`       | Dev server on localhost               | Development                                |

---

## Project Structure

```
src/
  router.tsx                ← router with hash/browser history
  routes/
    __root.tsx              ← shellComponent (HTML doc) + component (layout, input, settings)
    index.tsx               ← task list only (rendered into outlet)
  rpc/
    tasks.ts                ← server functions (CRUD, Zod validators)
    users.ts
    notes.ts
    notify.ts               ← SSE broadcast + Web Push after mutations
    push.ts                 ← push subscription management
  components/
    AddTaskInput.tsx         ← task creation input (pure, no store deps)
    SyncSettings.tsx         ← auth token + user setup + push toggle
    TaskItem.tsx            ← single task row
    TaskList.tsx            ← task list renderer
    ui/                     ← shadcn components (base preset)
  lib/
    stores.ts               ← Legend State syncedCrud observables + rpc wrappers
    hooks.ts                ← React hooks wrapping the stores
    add-task.ts             ← standalone addTask fn (used by root via dynamic import)
    auth-token.ts           ← authToken$ observable (localStorage + cross-tab sync)
    current-user.ts         ← currentUserId$ observable (localStorage)
    middleware.ts           ← TanStack Start auth middleware (client + server)
    sse.ts                  ← SSE connection manager
    sync/
      create-store.ts       ← syncedCrud config factory (persist, subscribe, retry)
      create-hooks.ts       ← CRUD hook factory from Legend State observable
      registry.ts           ← model definitions (name → API path + sync message)
      types.ts              ← SyncModel interface
    utils.ts                ← cn(), isoDatetime, keyById
  server/
    db/
      client.ts             ← Drizzle + Turso embedded replica
      schema.ts             ← table definitions + Zod schemas
      columns.ts            ← column helpers
      *.repo.ts             ← repository layer (per model)
    auth.ts                 ← bearer token validation
    events.ts               ← SSE broadcast via Nitro hooks
    push.ts                 ← Web Push notifications
    api/                    ← Nitro API routes
    middleware/cors.ts      ← CORS for extension origins
scripts/
  build.mjs                 ← production build with process.exit() workaround
  build-extension.ts        ← CSP patching for extension
plugins/
  generate-sw.ts            ← service worker generation (Workbox)
```
