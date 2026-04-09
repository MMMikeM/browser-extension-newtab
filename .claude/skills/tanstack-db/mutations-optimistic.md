# Mutations & Optimistic State

TanStack DB mutations follow a unidirectional loop:
**optimistic mutation -> handler persists to backend -> sync back -> confirmed state**.
Optimistic state is applied in the current tick and dropped when the handler resolves.

## Collection Write Operations

### insert

```ts
collection.insert({ id: crypto.randomUUID(), text: "Buy groceries", completed: false });
collection.insert([item1, item2]); // Multiple items
collection.insert(item, { metadata: { source: "import" } }); // With metadata
collection.insert(item, { optimistic: false }); // Non-optimistic
```

### update (Immer-style draft proxy)

```ts
// Mutate the draft, do NOT reassign it
collection.update(id, (draft) => {
  draft.completed = true;
  draft.completedAt = new Date();
});

// Multiple items
collection.update([id1, id2], (drafts) => {
  drafts.forEach((d) => {
    d.completed = true;
  });
});

// With metadata (metadata arg comes before callback)
collection.update(id, { metadata: { reason: "user-edit" } }, (draft) => {
  draft.text = "Updated";
});
```

### delete

```ts
collection.delete(id);
collection.delete([id1, id2]);
collection.delete(id, { metadata: { reason: "completed" } });
```

All three return a `Transaction` object. Use `tx.isPersisted.promise` to await persistence or catch rollback errors.

## createOptimisticAction — intent-based mutations

Use when the optimistic change is a guess at server transformation, or when mutating multiple collections atomically.

```ts
import { createOptimisticAction } from "@tanstack/db";

const likePost = createOptimisticAction<string>({
  // MUST be synchronous — applied in the current tick
  onMutate: (postId) => {
    postCollection.update(postId, (draft) => {
      draft.likeCount += 1;
      draft.likedByMe = true;
    });
  },
  mutationFn: async (postId, { transaction }) => {
    await api.posts.like(postId);
    await postCollection.utils.refetch();
  },
});

const tx = likePost(postId);
await tx.isPersisted.promise;
```

Multi-collection:

```ts
const createProject = createOptimisticAction<{ name: string; ownerId: string }>({
  onMutate: ({ name, ownerId }) => {
    projectCollection.insert({ id: crypto.randomUUID(), name, ownerId });
    userCollection.update(ownerId, (d) => {
      d.projectCount += 1;
    });
  },
  mutationFn: async ({ name, ownerId }) => {
    await api.projects.create({ name, ownerId });
    await Promise.all([projectCollection.utils.refetch(), userCollection.utils.refetch()]);
  },
});
```

## createPacedMutations — auto-save with debounce/throttle/queue

```ts
import { createPacedMutations, debounceStrategy } from "@tanstack/db";

const autoSaveNote = createPacedMutations<string>({
  onMutate: (text) => {
    noteCollection.update(noteId, (draft) => {
      draft.body = text;
    });
  },
  mutationFn: async ({ transaction }) => {
    const mutation = transaction.mutations[0];
    await api.notes.update(mutation.key, mutation.changes);
    await noteCollection.utils.refetch();
  },
  strategy: debounceStrategy({ wait: 500 }),
});

autoSaveNote("Hello");
autoSaveNote("Hello, world"); // only this version persists
```

### Strategies

```ts
import { debounceStrategy, throttleStrategy, queueStrategy } from "@tanstack/db"

debounceStrategy({ wait: 500, leading?: false, trailing?: true })
throttleStrategy({ wait: 200, leading?: true, trailing?: true })
queueStrategy({ wait?: 0, maxSize?: 100, addItemsTo?: "back", getItemsFrom?: "front" })
```

Queue creates a separate transaction per call (unlike debounce/throttle which merge). Each awaits `isPersisted` before the next starts.

## createTransaction — manual batching

```ts
import { createTransaction } from "@tanstack/db";

const tx = createTransaction({
  autoCommit: false,
  mutationFn: async ({ transaction }) => {
    await api.batchUpdate(transaction.mutations);
  },
});

tx.mutate(() => {
  todoCollection.update(id1, (d) => {
    d.status = "reviewed";
  });
  todoCollection.update(id2, (d) => {
    d.status = "reviewed";
  });
});

await tx.commit(); // or tx.rollback()
```

Inside `tx.mutate(() => { ... })`, the transaction is on an ambient stack. Any `collection.insert/update/delete` auto-joins via `getActiveTransaction()`.

## Transaction Lifecycle

`pending` -> `persisting` -> `completed` | `failed`

- `mutate()` only in `pending` (throws `TransactionNotPendingMutateError`)
- `commit()` only in `pending` (throws `TransactionNotPendingCommitError`)
- Failed `mutationFn` auto-triggers `rollback()`
- Rollback cascades to other pending transactions sharing the same item keys

```ts
const tx = collection.insert({ id: "1", text: "Hello" });
try {
  await tx.isPersisted.promise;
  console.log(tx.state); // "completed"
} catch (error) {
  console.log(tx.state); // "failed" — optimistic state rolled back
}
```

## Mutation Merging Rules

Same item (globalKey) within a transaction:

| Existing | Incoming | Result    | Notes                              |
| -------- | -------- | --------- | ---------------------------------- |
| insert   | update   | insert    | Merge changes, keep empty original |
| insert   | delete   | _removed_ | Both cancel out                    |
| update   | update   | update    | Union changes, keep first original |
| update   | delete   | delete    | Delete dominates                   |


## Common Mistakes

| Severity | Mistake                                                | Fix                                                                         |
| -------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| CRITICAL | Passing object to `update()` instead of draft callback | `collection.update(id, (draft) => { draft.title = "new" })`                 |
| CRITICAL | `onMutate` returning a Promise                         | Must be synchronous (throws `OnMutateMustBeSynchronousError`)               |
| CRITICAL | Mutations without handler or ambient transaction       | Need `onInsert`/`onUpdate`/`onDelete` on collection OR ambient transaction  |
| HIGH     | Not awaiting refetch in query collection handler       | Optimistic state dropped before server data arrives — flash of missing data |
| HIGH     | Changing primary key via update                        | Throws `KeyUpdateNotAllowedError` — delete and re-insert instead            |
| HIGH     | Inserting duplicate key                                | Throws `DuplicateKeyError` — generate unique key or check first             |
| HIGH     | Calling `.mutate()` after commit/rollback              | Throws `TransactionNotPendingMutateError` — create new transaction          |
