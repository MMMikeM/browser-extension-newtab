# Milestones

## Milestone 1: MVP ✅

Core task tracker replacing the new tab page. Shipped and deployed.

- Firefox MV2 extension (sideloaded via `about:debugging`)
- TanStack Start SPA with server functions on Fly.io
- Turso (libSQL) with embedded replica
- Bearer token auth
- CRUD: add, toggle, delete tasks
- Optimistic updates (cache-based, no flash)
- Query cache persisted to IndexedDB (instant render on new tab)
- offlineFirst network mode (offline reads from cache)
- Cross-device sync via refetchOnWindowFocus
- Last-write-wins conflict resolution
- Fractional indexing for sort order
- Nitro server with CORS middleware for extension origins
- CI/CD: GitHub Actions → Fly.io deploy on push to main

---

## Milestone 2: Daily driver

Make this the tool you actually reach for every day.

### PWA support

- `manifest.webmanifest` (name, icons, `display: standalone`, theme color)
- Service worker for offline shell caching (static assets)
- Works on phone via "Add to Home Screen"
- Same backend, same auth — just a different client entry point

### Due dates & reminders

- `due_at` column on tasks (nullable ISO 8601)
- Date picker in the UI
- Push notifications for upcoming/overdue tasks
- Notification permission request flow
- Service worker handles push events (works even when tab is closed)

### Notes

- `description` column already exists in schema — just not exposed in the UI
- Expandable task row or detail drawer to view/edit notes
- Markdown support (nice-to-have, not required)

### Drag-to-reorder

- `sortOrder` with fractional indexing already implemented in the schema and hooks
- Wire up drag-and-drop in the UI (e.g., `@dnd-kit/core` or native drag events)
- Optimistic reorder with rollback on failure

### Task descriptions in UI

- The `description` column exists but the UI doesn't show it
- Inline editing or a detail view

---

## Milestone 3: Polish

### Skeleton loading states

- Replace "Loading..." text with layout-preserving skeletons
- No layout shift when data arrives

### Multiple lists / categories

- New `lists` table, `list_id` FK on tasks
- Tab or sidebar navigation between lists

### Recurring tasks

- Recurrence rules (daily, weekly, custom)
- Auto-create next occurrence on completion

### Offline mutation persistence

- Persist paused mutations to IndexedDB via `persistQueryClient`
- Resume on reconnect with `resumePausedMutations()`
- Requires `setMutationDefaults` with `mutationKey` for each mutation

### Search / filter

- Filter by status, due date, list
- Full-text search on title + description
