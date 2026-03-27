---
name: legend-state
description: Work with Legend State — local-first reactive state with persistence, sync, and CRUD operations.
argument-hint: "[task description]"
---

Your task: $ARGUMENTS

Before starting, read the reference doc:

- `${CLAUDE_SKILL_DIR}/legend-state-reference.md` — observables, reactivity, React hooks, sync, CRUD, persistence

## Project context

This project uses Legend State v3 as the **primary state management and sync layer**, replacing TanStack Query. The architecture is local-first:

- **Local state is king** — data lives in IDB via Legend State persistence
- **Sync is optional** — server functions are the sync backend, enabled by setting an auth token
- **Optimistic by default** — local changes apply instantly, sync happens in the background
- **LWW conflict resolution** — `fieldUpdatedAt: 'updatedAt'` handles multi-device conflicts

## Stack integration

- Legend State observables are the source of truth (persisted to IndexedDB)
- `syncedCrud` connects to TanStack Start server functions for remote sync
- TanStack Router handles routing (Legend State handles data)
- React components use `useValue()` to read observables
- `syncState()` controls sync enable/disable

## Key patterns

### Define a synced store

```typescript
import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";
import { getTasks, createTask, updateTask, deleteTask } from "~/functions/tasks";

export const tasks$ = observable(
  syncedCrud({
    list: () => getTasks(),
    create: (task) => createTask({ data: task }),
    update: (task) => updateTask({ data: task }),
    delete: (id) => deleteTask({ data: { id } }),
    persist: {
      name: "tasks",
      plugin: observablePersistIndexedDB,
      retrySync: true,
    },
    retry: { infinite: true },
    fieldUpdatedAt: "updatedAt",
    changesSince: "last-sync",
  }),
);
```

### Read in React components

```typescript
import { useValue } from "@legendapp/state/react";

function TaskList() {
  const tasks = useValue(tasks$);
  // tasks is the raw value, re-renders only when tasks change
}
```

### Toggle sync

```typescript
import { syncState } from "@legendapp/state";

// Disable sync (offline-only mode)
syncState(tasks$).isSyncEnabled.set(false);

// Enable sync
syncState(tasks$).isSyncEnabled.set(true);
```

### Wait for persistence to load

```typescript
import { syncState, when } from "@legendapp/state";

await when(syncState(tasks$).isPersistLoaded);
```

## Rules

1. **Never use `get()` in React render** without `useValue()` — use `useValue(obs$)` or `<Memo>{obs$}</Memo>` for reactivity.
2. **Use `peek()` when you don't want tracking** — e.g., in event handlers where you just need the current value without subscribing.
3. **Modify via observable methods** — `obs$.set()`, `obs$.assign()`, `obs$.delete()`. Never mutate the raw value from `get()`.
4. **Use `batch()` for multiple updates** — prevents cascading re-renders.
5. **`syncedCrud` with `list`** returns an object keyed by `id` by default — use `as: 'array'` if you need array shape.
6. **`fieldUpdatedAt` must be server-managed** — don't set `updatedAt` client-side when using `changesSince: 'last-sync'`.
7. **`retrySync: true`** persists pending changes to IDB — offline mutations survive page reload.
