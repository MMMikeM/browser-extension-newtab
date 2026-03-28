# Milestones

## Milestone 1: MVP ✅

Core task tracker replacing the new tab page. Local-first, shipped and deployed.

- Firefox MV2 extension (sideloaded via `about:debugging`)
- TanStack Start with full SSR + build-time prerendering
- Legend State v3 with syncedCrud — local IDB persistence, optional server sync
- Turso (libSQL) with Drizzle ORM on Fly.io
- Bearer token auth (optional — app works fully offline without it)
- CRUD: add, toggle, delete tasks
- Instant local writes — sync happens in background
- Context-aware routing (hash history for extension, browser history for web)
- Prerendered HTML shell with full layout (heading, input, list containers)
- Last-write-wins conflict resolution via `fieldUpdatedAt`
- Fractional indexing for sort order
- Nitro server with CORS middleware for extension origins
- CI/CD: GitHub Actions → Fly.io deploy on push to main (~60s)

---

## Milestone 2: Daily driver

Make this the tool you actually reach for every day.

### ~~Real-time sync (SSE)~~ — superseded by silent push

~~Live updates between open tabs/devices while the app is active.~~

Silent push already handles this: push arrives → SW `postMessage` → Legend State `subscribe` calls `refresh()`. SSE would be redundant — it only works while the app is open, which push already covers, and push also handles the app-closed case that SSE can't.

### Background sync (silent push)

Keep device IDB fresh even when the app is closed — so data is there when you open it offline.

- Service worker registers for Web Push
- On task change, server sends a **silent push** to all registered devices (no visible notification)
- SW wakes up, fetches latest tasks from server, writes to IDB
- Next time you open the app (even offline), data is up to date
- Uses the `web-push` library on the server

### Visible push notifications (reminders)

Alert the user about upcoming/overdue tasks.

- `due_at` column on tasks (nullable ISO 8601)
- Date picker in the UI
- Server checks for due tasks, sends **visible push** with title/body
- SW `push` event handler shows the notification
- Click notification → opens the app

### PWA support

- `manifest.webmanifest` (name, icons, `display: standalone`, theme color)
- Service worker caches the static shell (HTML, JS, CSS) for offline app loading
- Works on phone via "Add to Home Screen"
- Same backend, same auth — just a different client entry point

### Notes

- `description` column already exists in schema — just not exposed in the UI
- Expandable task row or detail drawer to view/edit notes
- Markdown support (nice-to-have, not required)

### Drag-to-reorder

- `sortOrder` with fractional indexing already in schema and hooks
- Wire up drag-and-drop in the UI (e.g., `@dnd-kit/core` or native drag events)
- Optimistic reorder

### Differential sync

- Add `changesSince: 'last-sync'` to syncedCrud config
- Update `getTasks` server function to accept `lastSync` timestamp and return only changed rows
- Soft deletes or include deleted rows so client can remove them
- Reduces bandwidth on every sync

---

## Milestone 3: Polish

### Multiple lists / categories

- New `lists` table, `list_id` FK on tasks
- Tab or sidebar navigation between lists

### Recurring tasks

- Recurrence rules (daily, weekly, custom)
- Auto-create next occurrence on completion

### Search / filter

- Filter by status, due date, list
- Full-text search on title + description

### Skeleton loading states

- Replace empty shell with layout-preserving skeletons
- No layout shift when data arrives
