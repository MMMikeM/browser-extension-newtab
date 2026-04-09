# Offline Transactions

`@tanstack/offline-transactions` orchestrates a persistent outbox (IndexedDB/localStorage), leader election (WebLocks/BroadcastChannel), retry with backoff, and connectivity detection.

## Setup

```ts
import { startOfflineExecutor } from "@tanstack/offline-transactions";

const executor = startOfflineExecutor({
  collections: { todos: todoCollection },
  mutationFns: {
    createTodo: async ({ transaction, idempotencyKey }) => {
      const mutation = transaction.mutations[0];
      await api.todos.create({ ...mutation.modified, idempotencyKey });
    },
    updateTodo: async ({ transaction, idempotencyKey }) => {
      const mutation = transaction.mutations[0];
      await api.todos.update(mutation.key, { ...mutation.changes, idempotencyKey });
    },
  },
});

await executor.waitForInit(); // Storage probe, leader election, outbox replay
```

## Core API

### createOfflineTransaction

```ts
const tx = executor.createOfflineTransaction({ mutationFnName: "createTodo" });
tx.mutate(() => {
  todoCollection.insert({ id: crypto.randomUUID(), text: "New todo" });
});
tx.commit();
```

Non-leader tabs fall back to `createTransaction` directly (no offline persistence).

### createOfflineAction

```ts
const addTodo = executor.createOfflineAction({
  mutationFnName: "createTodo",
  onMutate: (variables) => {
    todoCollection.insert({ id: crypto.randomUUID(), text: variables.text });
  },
});

addTodo({ text: "Buy milk" });
```

Non-leader tabs fall back to `createOptimisticAction` directly.

## Architecture

| Component           | Purpose                                   | Default                            |
| ------------------- | ----------------------------------------- | ---------------------------------- |
| Storage             | Persist transactions to survive reload    | IndexedDB -> localStorage fallback |
| OutboxManager       | FIFO queue of pending transactions        | Automatic                          |
| KeyScheduler        | Serialize transactions touching same keys | Automatic                          |
| TransactionExecutor | Execute with retry + backoff              | Automatic                          |
| LeaderElection      | Only one tab processes outbox             | WebLocks -> BroadcastChannel       |
| OnlineDetector      | Pause/resume on connectivity              | navigator.onLine + events          |

### Transaction lifecycle

1. Mutation applied optimistically (instant UI)
2. Transaction serialized to outbox storage
3. Leader tab picks up and executes `mutationFn`
4. Success: removed from outbox, optimistic state resolved
5. Failure: retried with exponential backoff
6. Page reload: outbox replayed, optimistic state restored

### Leader election

Only one tab processes the outbox. Non-leader tabs use regular `createTransaction`/`createOptimisticAction` (online-only).

```ts
executor.isOfflineEnabled; // true only if leader AND storage available
executor.mode; // "offline" | "online-only"
```

## Error Handling

### NonRetriableError

```ts
import { NonRetriableError } from "@tanstack/offline-transactions";

mutationFns: {
  createTodo: async ({ transaction, idempotencyKey }) => {
    const res = await fetch("/api/todos", { method: "POST", body: JSON.stringify(...) });
    if (res.status >= 400 && res.status < 500) {
      throw new NonRetriableError(`Client error: ${res.status}`);
    }
    if (!res.ok) throw new Error("Server error"); // Will retry
  },
}
```

### Idempotency keys

Every offline transaction includes an `idempotencyKey`. Pass it to your API to prevent duplicate execution on retry.

## Outbox Management

```ts
await executor.peekOutbox(); // Inspect pending transactions
executor.getPendingCount(); // Queued count
executor.getRunningCount(); // Currently executing count
await executor.clearOutbox(); // Clear all pending
executor.dispose(); // Cleanup
```

## Common Mistakes

| Severity | Mistake                                 | Fix                                                  |
| -------- | --------------------------------------- | ---------------------------------------------------- |
| CRITICAL | Not passing `idempotencyKey` to API     | Retries create duplicate records. Always forward it. |
| HIGH     | Not awaiting `waitForInit()`            | May miss leader election, use wrong code path        |
| HIGH     | Missing collection in `collections` map | Optimistic state won't restore from outbox on reload |
| MEDIUM   | Not using `NonRetriableError` for 4xx   | Permanent failures retry forever, wasting resources  |
