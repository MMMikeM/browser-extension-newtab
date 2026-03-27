# New Tab Todo — Architecture & Technical Plan

## Overview

A personal task tracker built as a Firefox browser extension, replacing the new tab page. Single user, 2–3 machines, no offline requirement as a primary concern. The guiding principle throughout is simplicity: every architectural decision biases towards the least complex solution that satisfies the constraints.

---

## Constraints & Goals

- **Personal use only** — sideloaded, not distributed via AMO
- **Single user, multi-device** — 2–3 machines needing consistent state
- **No offline-first requirement** — offline read cache is a nice-to-have, not a hard requirement
- **Zero-infra preference** — no self-managed databases, minimal operational overhead
- **TypeScript throughout** — both client and server
- **Native feel** — instant shell render on new tab open, no visible loading flash

---

## Architecture Overview

Two components, cleanly separated:

```
┌─────────────────────────────┐        ┌───────────────────────────────┐
│     Firefox Extension       │        │       Fly.io (Start server)   │
│                             │        │                               │
│  TanStack Start (SPA mode)  │◄──────►│  Start server functions       │
│  Static prerendered shell   │  HTTPS │  Turso via @libsql/client     │
│  TanStack Query (hydration) │        │  JWT auth                     │
└─────────────────────────────┘        └───────────────────────────────┘
       Runs locally                            Single deployment
     (files in .xpi)                         (same repo as client)
```

The backend is the single source of truth. The extension is a thin client. No local database, no sync engine, no WASM, no CRDT.

---

## Open Questions / Spikes Required

> **All resolved — see CLAUDE.md for spike results.**

---

## Extension

### Manifest

MV2 with `"persistent": false` (non-persistent event page). MV2 is the right choice here:

- No deprecation timeline from Mozilla
- Event pages have full DOM access (unlike MV3 service workers)
- No `'wasm-unsafe-eval'` CSP complications

With a static long-lived auth token (see Auth section), no background script is needed at all — the manifest simplifies to:

```json
{
  "manifest_version": 2,
  "name": "New Tab Todo",
  "version": "1.0.0",
  "browser_specific_settings": {
    "gecko": { "id": "newtab-todo@local" }
  },
  "chrome_url_overrides": {
    "newtab": "index.html"
  },
  "permissions": ["storage", "https://your-app.fly.dev/*"]
}
```

### Sideloading & Dev Workflow

The `.xpi` is signed as "self-distributed" (unlisted) via AMO — uploaded, signed, downloaded. Installed manually via `about:addons` → "Install Add-on From File". Re-sign and reinstall on frontend changes.

During initial development this re-sign cycle is the highest-friction part of the workflow. Two options to reduce it:

- **`about:debugging` temporary install** — load the unpacked `dist/` folder directly, no signing needed. Survives browser restarts as long as you re-load it. Fine for active development.
- **Localhost bookmark** — run `vite dev` and open the app as a regular browser tab. Loses the new-tab override behaviour but is the fastest iteration loop for pure UI work. Switch to the extension once the UI stabilises.

### Structure

```
extension/
  index.html              ← prerendered shell (Start SPA output)
  assets/                 ← JS/CSS chunks from build
  manifest.json
```

The extension carries no logic beyond the UI. All business logic lives in server functions on Fly.io.

---

## Frontend

### TanStack Start — SPA Mode

TanStack Start in SPA mode outputs a fully static `dist/` folder — HTML, JS, CSS — with no server required. This folder becomes the extension's content. The server functions run on Fly.io from the same repo.

Why Start over plain Vite + React:

- TanStack Router, Query, and Form in one cohesive setup
- Server functions are the API layer — end-to-end type safety from server to client call, no separate framework, no hand-rolled fetch clients, no API contract to maintain
- Single repo — client and server code live together, server functions co-located with the routes that use them
- If a web version of the app is ever wanted, the same codebase deploys as a full Start app with SSR — near-zero migration cost
- SPA mode static prerendering gives a native-feel new tab without a server

ISR is not applicable — the extension ships static files and frontend updates require a reinstall. That is an acceptable trade-off for a personal tool.

### Prerendering & Hydration

The prerendered shell is a static skeleton: layout, chrome, empty task list with a loading state. No data is baked in at build time. On new tab open:

1. Browser renders prerendered HTML from disk — **instant, no network request**
2. JS bundle loads and hydrates
3. TanStack Query fires server function calls to Fly.io
4. Data renders in-place — no layout shift because the skeleton already occupies the space

This eliminates the white flash that makes browser extension new tab pages feel janky.

### TanStack Query Configuration

Query handles cross-device consistency without any custom sync logic:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s before background refetch
      refetchOnWindowFocus: true, // syncs when switching back to this tab
      refetchOnReconnect: true, // syncs after coming back online
      networkMode: "offlineFirst", // serves cache while offline
    },
  },
});
```

`refetchOnWindowFocus` is the primary cross-device sync mechanism. Open a new tab on machine B — Query fires a background refetch and the UI updates with any changes made on machine A. No polling, no websockets, no manual sync logic.

### Offline Cache (Secondary)

`persistQueryClient` with an IndexedDB adapter gives free offline read capability — open a new tab offline and the last known task list is still visible. Mutations queue and retry on reconnect via `networkMode: 'offlineFirst'`. This requires no additional architecture; it's a Query config option.

---

## Backend

### Stack

- **Runtime**: Node.js on Fly.io (persistent VM, no cold starts)
- **API layer**: TanStack Start server functions — no separate framework needed
- **Database**: Turso (libSQL) via `@libsql/client` HTTP client — no WASM, no native deps, free tier is generous (5 GB, 500M row reads/month)
- **Auth**: Static long-lived bearer token — no JWT library, no session store, no refresh logic

### Repo Structure

```
src/
  routes/
    index.tsx              ← new tab UI
  functions/
    tasks.ts               ← server functions: getTasks, createTask, updateTask, deleteTask
  lib/
    db.ts                  ← Turso client
    auth.ts                ← bearer token middleware
```

### Conflict Resolution — Last Write Wins

With a backend mediating all writes, conflict resolution is a single SQL condition:

```sql
UPDATE tasks
SET title = ?, status = ?, updated_at = ?
WHERE id = ? AND updated_at < ?
```

**Clock skew caveat**: `updated_at < ?` relies on wall-clock timestamps agreeing across machines. For 2–3 personal devices this is unlikely to cause problems in practice, but if it ever does, the fix is a one-column schema change — replace `updated_at` with a monotonic `version INTEGER` incremented server-side on every write.

---

## Data Model

```sql
CREATE TABLE tasks (
  id          TEXT PRIMARY KEY,        -- cuid2 generated client-side
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'todo',  -- todo | in_progress | done
  sort_order  TEXT,                    -- fractional indexing (see below)
  created_at  TEXT NOT NULL,           -- ISO 8601
  updated_at  TEXT NOT NULL            -- ISO 8601, used for LWW
);
```

`sort_order` uses TEXT-based fractional indices via the `fractional-indexing` npm package rather than REAL.

---

## Auth

A single long-lived static token is the right choice for a personal tool. Set it once via the token gate UI, stored in `localStorage` (works in both extension and browser tab contexts), passed as a `Bearer` header on every server function call.

The server validates the token on every request with a simple constant-time comparison.

---

## Release & Update Flow

| Change                  | Action                                                      |
| ----------------------- | ----------------------------------------------------------- |
| UI / frontend (dev)     | Edit → `about:debugging` reload — no signing needed         |
| UI / frontend (release) | Rebuild → re-sign `.xpi` via AMO unlisted → reinstall       |
| API / server functions  | `fly deploy` → live immediately, no extension change needed |
| Schema migration        | Deploy migration to Fly.io → backend handles it             |
