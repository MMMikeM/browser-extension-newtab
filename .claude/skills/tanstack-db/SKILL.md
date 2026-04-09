---
name: tanstack-db
description: Use when writing or modifying code that touches TanStack DB collections, live queries, mutations, offline transactions, or sync — including adding features, fixing bugs, or refactoring data access patterns. Triggers on imports from @tanstack/db, @tanstack/react-db, @tanstack/offline-transactions, @tanstack/query-db-collection, @tanstack/browser-db-sqlite-persistence.
---

# TanStack DB

## Overview

TanStack DB provides local-first reactive collections with offline-first sync. This project uses it for all client-side data access with OPFS SQLite persistence.

## Project Architecture

### Collections

Four collections in `packages/client/src/lib/db/collections.ts`:

| Collection             | Key          | Type                |
| ---------------------- | ------------ | ------------------- |
| `tasksCollection`      | `task.id`    | `TaskWithRelations` |
| `categoriesCollection` | `cat.id`     | `CategoryWithOwner` |
| `notesCollection`      | `note.id`    | `NoteSelect`        |
| `contactsCollection`   | `contact.id` | `ContactWithUser`   |

Creation pattern — layered composition:

```ts
createCollection(
  persistedCollectionOptions<T, string>({
    persistence,
    schemaVersion: 1,
    ...queryCollectionOptions({
      id: "tasks",
      queryKey: ["tasks"] as const,
      queryFn: async () => (await client.api.tasks.$get()).json(),
      queryClient,
      getKey: (item) => item.id,
    }),
  }),
);
```

### Reading Data

Wrapper hooks in `lib/db/hooks.ts`:

```ts
export const useTasks = () => useLiveQuery(tasksCollection);
export const useCategories = () => useLiveQuery(categoriesCollection);
// Returns { data: T[] | undefined, isLoading: boolean }
```

Current pattern: fetch full collection, filter in React:

```ts
const { data: allTasks, isLoading } = useTasks();
const active = (allTasks ?? []).filter((t) => t.status !== "done");
```

For non-reactive raw access:

```ts
const all = [...(tasksCollection.state?.values() ?? [])];
```

### Live Query DSL (Preferred for New Code)

Instead of fetching everything and filtering in JS, use the query builder for reactive, optimized queries. See @live-queries.md for the full API reference. For the query collection API (TanStack Query integration, direct writes, persistence handlers), see @query-collection.md.

```ts
import { useLiveQuery } from "@tanstack/react-db";
import { eq, and } from "@tanstack/db";

// Replaces: useTasks() + .filter(t => t.categoryId === id && t.status !== "done")
const { data: tasks } = useLiveQuery(
  (q) =>
    q
      .from({ t: tasksCollection })
      .where(({ t }) => and(eq(t.categoryId, categoryId), not(eq(t.status, "done"))))
      .orderBy(({ t }) => t.sortOrder),
  [categoryId],
);
```

Key patterns for this project:

- `useLiveQuery(collection)` — subscribe to full collection (existing pattern)
- `useLiveQuery((q) => q.from(...).where(...))` — reactive filtered query
- `useLiveQuery((q) => { if (!id) return undefined; return q.from(...) }, [id])` — conditional query
- `useLiveSuspenseQuery` — for Suspense boundaries (data always defined)

### Mutations

For the full TanStack DB mutations API (createOptimisticAction, createPacedMutations, createTransaction, transaction lifecycle, PendingMutation type), see @mutations-optimistic.md.

For the full offline transactions API (OfflineExecutor, outbox, leader election, idempotency keys, NonRetriableError), see @offline-transactions.md.

This project wraps mutations in offline transactions for deferred server sync:

```ts
import { offline } from "~/lib/db/offline";

// Insert
const tx = offline.createOfflineTransaction({ mutationFnName: "syncTasks" });
tx.mutate(() =>
  tasksCollection.insert({ ...fields, id: nanoid(), createdAt: now(), updatedAt: now() }),
);

// Update (immer-like draft)
const tx = offline.createOfflineTransaction({ mutationFnName: "syncTasks" });
tx.mutate(() =>
  tasksCollection.update(id, (draft) => Object.assign(draft, { ...fields, updatedAt: now() })),
);

// Delete
const tx = offline.createOfflineTransaction({ mutationFnName: "syncTasks" });
tx.mutate(() => tasksCollection.delete(id));
```

**Rules:**

- Always wrap in `offline.createOfflineTransaction()`
- Always set `updatedAt: now()` on insert and update
- `mutationFnName` maps to sync function: `"syncTasks"`, `"syncCategories"`, `"syncNotes"`
- IDs: `nanoid()` for tasks/notes, `crypto.randomUUID()` for categories

### SSE Sync Writes

Server pushes mutations via SSE. Applied with collection utilities:

```ts
collection.utils.writeUpsert(data); // Insert or update from server
collection.utils.writeUpdate(data); // Update from server
collection.utils.writeDelete(key); // Remove
collection.utils.refetch(); // Re-fetch from queryFn
```

### Sync State

```ts
import { useSyncState, usePendingMutations } from "~/lib/sync/sse";

const state = useSyncState(); // "disconnected" | "connecting" | "connected"
const pending = usePendingMutations(); // true if unsynced mutations
await offline.waitForInit(); // Wait for storage + outbox replay
```

## Common Mistakes

| Mistake                                                      | Fix                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| Forgetting `updatedAt: now()` on mutations                   | Server uses LWW; stale timestamps cause 409                           |
| Using `tasksCollection.insert()` without offline transaction | Mutation won't sync to server                                         |
| Accessing `data` without checking `isLoading`                | `data` is `undefined` during load                                     |
| Mutating draft object directly without `Object.assign`       | Use `Object.assign(draft, fields)` pattern                            |
| Using wrong `mutationFnName`                                 | Must match keys in `offline.ts`: syncTasks, syncCategories, syncNotes |
