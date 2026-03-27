# New Tab Todo — Architecture

## Overview

A personal task tracker that replaces the browser new tab page. Runs as a Firefox extension and as a web app at the same URL. Local-first: data lives on-device in IndexedDB, with optional sync to a server for cross-device consistency.

---

## Principles

- **Local state is king** — the app works fully offline. Every interaction updates local state instantly.
- **Sync is optional** — set a token to enable background sync to the server. Without it, the app is a standalone local todo list.
- **Native feel** — prerendered HTML loads from disk with the full layout visible before JS executes. No blank flash, no loading spinners.
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
│   Prerendered SSR shell          │        │   Nitro server + CORS          │
│   TanStack Router (hash/browser) │        │   middleware for extensions    │
└──────────────────────────────────┘        └────────────────────────────────┘
```

The client is the source of truth. The server is the sync target.

---

## Client

### Legend State (data layer)

Legend State v3 replaces TanStack Query. A single `syncedCrud` observable handles:

- **Local persistence** — IndexedDB via `observablePersistIndexedDB`. Data survives page reloads and offline use.
- **Remote sync** — CRUD operations via TanStack Start server functions. Gated by `waitForSet: authToken$` — sync only runs when a token is present in localStorage.
- **Retry** — infinite retry with exponential backoff. Pending changes persist to IDB and survive app restarts (`retrySync: true`).
- **LWW conflict resolution** — `fieldUpdatedAt: 'updatedAt'` lets Legend State track which version wins.

```typescript
export const tasks$ = observable(
  syncedCrud({
    list: () => getTasks(),
    create: (input) => createTask({ data: input }),
    update: (input) => updateTask({ data: { ...input, updatedAt: new Date().toISOString() } }),
    delete: (input) => deleteTask({ data: { id: input.id } }),
    persist: { name: "tasks", plugin: idbPlugin, retrySync: true },
    retry: { infinite: true },
    fieldUpdatedAt: "updatedAt",
    waitForSet: authToken$,
  }),
);
```

### TanStack Start (SSR + server functions)

Full SSR mode (not SPA). The server renders complete HTML including route content. Build-time prerendering produces a static `index.html` with the full layout shell — heading, input field, list containers — visible from the first frame.

The extension ships this prerendered HTML. The web version at `fly.dev` gets live SSR on each request.

### Routing

Context-aware history — browser history for the web, hash history for the extension, memory history for SSR:

```typescript
const router = createRouter({
  routeTree,
  history: isServer
    ? createMemoryHistory({ initialEntries: ["/"] })
    : isExtension
      ? createHashHistory()
      : createBrowserHistory(),
});
```

Hash history is needed in the extension because `moz-extension://<uuid>/index.html` has pathname `/index.html` which doesn't match the `/` route. Hash history makes the route `#/` regardless of the base URL.

### React hooks

Thin wrappers over the Legend State store, maintaining a familiar React API:

- `useTasks()` — returns `{ data: Task[] }` sorted by `sortOrder`
- `useAddTask()` — returns `{ add(title) }` with cuid2 ID + fractional indexing
- `useUpdateTask()` — returns `{ mutate({ data }) }` for status/field changes
- `useDeleteTask()` — returns `{ mutate({ data }) }` for removal

All mutations are instant — they write to the observable directly. Remote sync happens in the background.

---

## Extension

MV2, sideloaded via `about:debugging` during development.

```json
{
  "manifest_version": 2,
  "name": "New Tab Todo",
  "chrome_url_overrides": { "newtab": "index.html" },
  "permissions": ["storage", "https://extension-sync-service.fly.dev/*"]
}
```

The extension build (`pnpm build:ext`) takes the prerendered HTML from `.output/public/`, patches inline scripts for MV2 CSP compliance, and outputs to `.output/extension/`.

---

## Server

- **Runtime**: Node.js 24 on Fly.io (Amsterdam region)
- **Framework**: TanStack Start with Nitro server
- **Database**: Turso (libSQL) with embedded replica (local SQLite synced to Turso cloud)
- **Auth**: Static bearer token validated with `crypto.timingSafeEqual`
- **CORS**: Nitro middleware allows `moz-extension://` and `chrome-extension://` origins

Server functions are the sync API — `getTasks`, `createTask`, `updateTask`, `deleteTask`. Each validates input with Drizzle/Zod schemas and uses the auth middleware.

---

## Data Model

```sql
CREATE TABLE tasks (
  id          TEXT PRIMARY KEY,        -- cuid2, generated client-side
  title       TEXT NOT NULL,
  description TEXT,                    -- nullable, for notes
  status      TEXT NOT NULL DEFAULT 'todo',  -- todo | in_progress | done
  sort_order  TEXT,                    -- fractional indexing
  created_at  TEXT NOT NULL,           -- ISO 8601
  updated_at  TEXT NOT NULL            -- ISO 8601, used for LWW
);
```

---

## Auth

A single long-lived static token stored in `localStorage` (works in both extension and browser contexts). Set it once, passed as a `Bearer` header on every server function call. Without a token, the app works offline-only — no sync, no server calls.

---

## Build & Deploy

| Command          | Output                                | Purpose                                    |
| ---------------- | ------------------------------------- | ------------------------------------------ |
| `pnpm build`     | `.output/server/` + `.output/public/` | Server deployment (Fly.io)                 |
| `pnpm build:ext` | `.output/extension/`                  | Extension files (load via about:debugging) |
| `pnpm dev`       | Dev server on localhost               | Development                                |
| `git push main`  | GitHub Actions → Fly.io               | Auto-deploy                                |

---

## Project Structure

```
src/
  routes/
    __root.tsx              ← HTML shell, HeadContent/Scripts
    index.tsx               ← main task UI
  functions/
    tasks.ts                ← server functions (CRUD, Drizzle, Zod)
  components/
    AddTaskInput.tsx
    TaskItem.tsx
    TaskList.tsx
    ui/                     ← shadcn components (base preset)
  lib/
    store.ts                ← Legend State store (syncedCrud + IDB)
    hooks.ts                ← React hooks wrapping the store
    middleware.ts            ← TanStack auth middleware (client + server)
    utils.ts                ← cn(), StyledProps
  server/
    db.ts                   ← Drizzle + Turso embedded replica
    auth.ts                 ← bearer token validation
    schema.ts               ← Drizzle table definitions
    columns.ts              ← column helper functions
  styles/
    app.css                 ← Tailwind v4 + shadcn theme
  router.tsx                ← context-aware history (hash/browser/memory)
server/
  middleware/
    cors.ts                 ← Nitro CORS for extension origins
extension/
  manifest.json             ← MV2 manifest (source)
scripts/
  build-extension.ts        ← CSP patching for extension build
```
