# Plan: Background sync — unified architecture

## Context

Background sync keeps IDB fresh across devices. Three contexts need it:

- **Web/PWA**: service worker wakes on silent push
- **Extension**: event page wakes on `browser.alarms`
- **App (foreground)**: Legend State's `subscribe` callback

All three do the same thing: authenticated fetch → Legend State → IDB. The abstraction is a shared REST endpoint + shared IDB config.

## Architecture

```
         /api/tasks (Nitro route)
         Accepts cookie OR bearer token
                    │
       ┌────────────┼────────────┐
       │            │            │
   SW push     alarm event   subscribe
   (web/PWA)   (extension)   (app open)
       │            │            │
       └────────────┼────────────┘
                    │
         Legend State syncedCrud
         (shared IDB config)
                    │
           newtab-todo IDB
           tasks object store
```

## Auth strategy

`/api/tasks` validates BOTH mechanisms — one route serves all contexts:

- **Web/PWA**: httpOnly cookie (set via `POST /api/auth`, SW sends it automatically)
- **Extension**: `Authorization: Bearer <token>` header (read from `browser.storage.local`)
- **Main app (browser)**: cookie (already set by `/api/auth`)
- **Main app (extension)**: bearer header (current approach, from localStorage)

### Cookie flow (web/PWA)

1. User enters token in SyncSettings → POST to `/api/auth` with token
2. Server validates → `Set-Cookie: auth=<token>; HttpOnly; Secure; SameSite=None; Path=/`
3. All subsequent fetch (app, SW) includes cookie automatically
4. `SameSite=None` needed for extension cross-origin, `Secure` required with it

### Bearer flow (extension)

1. User enters token in SyncSettings → writes to `localStorage` (main app) + `browser.storage.local` (if extension APIs available)
2. Auth middleware attaches `Authorization: Bearer` header
3. Event page reads from `browser.storage.local` for background sync

## Dependencies

```
pnpm add @mmmike/web-push   # already installed
```

No new deps. `web-push` already installed for push sending.

## Shared config

**`src/sync/config.ts`** — IDB + API constants shared across all contexts:

```typescript
export const IDB_CONFIG = {
  databaseName: "newtab-todo",
  version: 1,
  tableNames: ["tasks"],
};
export const API_PATH = "/api/tasks";
```

## Files

### New: Nitro API routes

**`server/routes/api/tasks.get.ts`** — authenticated task list endpoint

- Reads cookie OR Authorization header
- Validates token with same `validateToken()` from `src/server/auth.ts`
- Returns `Task[]` as JSON
- Used by SW, event page, and potentially main app

**`server/routes/api/auth.post.ts`** — sets httpOnly cookie

- Receives `{ token }` in body
- Validates token
- Sets `Set-Cookie: auth=<token>; HttpOnly; Secure; SameSite=None; Path=/`
- Returns 200 on success

### New: Shared sync config

**`src/sync/config.ts`** — shared IDB config + API path constant

### Modified: Service worker

**`src/sw.ts`** — on push, use Legend State to sync:

```typescript
self.addEventListener("push", (event) => {
  // If clients open → postMessage (subscribe handles it)
  // If no clients → create Legend State store, fetch via /api/tasks, write to IDB
});
```

Import Legend State + IDB plugin in the SW. Create a minimal store with:

- `list`: `fetch("/api/tasks")` (cookie sent automatically)
- `persist`: shared IDB config
- Call `syncState(tasks$).sync()` then let it GC

### Modified: Main app store

**`src/lib/store.ts`** — use shared config, add build-target-aware subscribe:

```typescript
subscribe: ({ refresh }) => {
  if (getBuildTarget() === "browser") {
    // Listen for SW SYNC_TASKS messages
    const handler = (e) => { if (e.data?.type === "SYNC_TASKS") refresh(); };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }
},
```

### Modified: SyncSettings

**`src/components/SyncSettings.tsx`** — on token save:

- POST to `/api/auth` to set httpOnly cookie (web context)
- Write to `localStorage` + `authToken$` (current behavior, for Legend State gating)
- If extension: also write to `browser.storage.local`

### Modified: Auth middleware

**`src/lib/middleware.ts`** — client side still attaches bearer header (extension compatibility)

### Modified: Server auth

**`src/server/auth.ts`** — add `extractToken(event)` that checks cookie first, falls back to Authorization header

### New: Extension background script (future)

**`manifests/background.js`** — event page with `browser.alarms`:

```javascript
browser.alarms.create("sync-tasks", { periodInMinutes: 5 });
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "sync-tasks") return;
  const { token } = await browser.storage.local.get("token");
  if (!token) return;
  // Use Legend State to fetch and write to IDB
});
```

This is separate from the web/PWA push flow. Can be added in a follow-up.

### Modified: Extension manifest

**`manifests/extension.json`** — add background script + alarms permission:

```json
{
  "background": { "scripts": ["background.js"], "persistent": false },
  "permissions": ["storage", "alarms"]
}
```

## Implementation order

### Phase 1: API + auth (foundation)

1. Create `src/sync/config.ts`
2. Create `server/routes/api/tasks.get.ts`
3. Create `server/routes/api/auth.post.ts`
4. Update `src/server/auth.ts` — cookie + bearer extraction
5. Update `src/components/SyncSettings.tsx` — POST to `/api/auth`

### Phase 2: SW background sync (web/PWA)

6. Update `src/sw.ts` — Legend State sync on push when no clients open
7. Update `src/lib/store.ts` — build-target-aware subscribe + shared config
8. Test: push arrives, app closed → IDB updated → app opens with fresh data

### Phase 3: Extension background sync (follow-up)

9. Create `manifests/background.js` — alarms-based sync
10. Update `manifests/extension.json` — background script + permissions
11. Update extension build script — bundle background.js

## Verification

1. **Web (app open)**: change task on Device A → Device B updates live via subscribe
2. **Web (app closed)**: change task on Device A → Device B SW syncs to IDB → open Device B → fresh data
3. **Web (offline)**: open app → IDB data renders instantly → syncs when back online
4. **Extension**: open new tab → IDB data renders → background alarm syncs periodically
5. **Cookie auth**: POST to `/api/auth` → cookie set → `/api/tasks` works without explicit header
6. **Bearer auth**: extension requests with Authorization header → `/api/tasks` works
