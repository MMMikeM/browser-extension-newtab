# Legend State v3 — Reference

## Observables

### Creating

```typescript
import { observable } from "@legendapp/state";

// Object
const state$ = observable({ count: 0, user: { name: "Mike" } });

// Primitive
const count$ = observable(0);

// With computed properties (functions auto-track dependencies)
const state$ = observable({
  fname: "Mike",
  lname: "M",
  fullName: () => state$.fname.get() + " " + state$.lname.get(),
});

// Async (resolves to value, starts as undefined)
const data$ = observable(() => fetch("/api").then((r) => r.json()));
```

### Reading

```typescript
// get() — returns value, tracks in observing contexts
const value = state$.count.get();
const raw = state$.get(); // entire object

// peek() — returns value WITHOUT tracking (no re-renders)
const value = state$.count.peek();

// Deep access — safe even if undefined
state$.user.profile.name.get(); // undefined, no crash
```

### Writing

```typescript
// set() — set value at any path
state$.count.set(1);
state$.count.set((prev) => prev + 1);

// assign() — shallow merge (batched)
state$.assign({ count: 1, user: { name: "New" } });

// delete() — remove key or array element
state$.user.delete();
state$[0].delete(); // array element

// Deep set — auto-creates intermediate objects
state$.deeply.nested.path.set("value");
```

### Arrays

```typescript
const list$ = observable([1, 2, 3]);

// Standard methods return observables in callbacks
list$.map((item$) => item$.get());
list$.filter((item$) => item$.get() > 1);
list$.find((item$) => item$.get() === 2);

// Mutating
list$.push(4);
list$.splice(0, 1);
list$[0].set(10);
```

### Computed (linked)

```typescript
import { linked } from "@legendapp/state";

// Two-way computed
const selectedAll$ = observable(
  linked({
    get: () => items$.every((item$) => item$.get()),
    set: (value) => items$.forEach((item$) => item$.set(value)),
  }),
);
```

### Events

```typescript
import { event } from "@legendapp/state";

const onSave$ = event();
onSave$.on(() => console.log("saved"));
onSave$.fire();
```

---

## Reactivity

### observe() — re-runs when tracked observables change

```typescript
import { observe } from "@legendapp/state";

const dispose = observe((e) => {
  console.log(state$.count.get());
  // cleanup on next run or dispose
  e.onCleanup = () => console.log("cleaning up");
});

dispose(); // stop observing
```

### when() — runs once when truthy

```typescript
import { when } from "@legendapp/state";

// Promise form
await when(state$.isReady);

// Callback form
when(
  () => state$.count.get() > 5,
  () => console.log("count exceeded 5"),
);
```

### onChange() — listen for changes

```typescript
state$.count.onChange(({ value, previous }) => {
  console.log(`${previous} → ${value}`);
});

// Deep changes
state$.onChange(({ value }) => console.log("anything changed", value));
```

### batch() — group updates

```typescript
import { batch } from "@legendapp/state";

batch(() => {
  state$.a.set(1);
  state$.b.set(2);
  state$.c.set(3);
  // single notification after batch completes
});
```

### What triggers tracking

| Tracks              | Doesn't track           |
| ------------------- | ----------------------- |
| `obs$.get()`        | `obs$.peek()`           |
| `obs$.map(...)`     | `obs$` (bare reference) |
| `obs$.length`       |                         |
| `Object.keys(obs$)` |                         |

---

## React Integration

### useValue() — read observable in React

```typescript
import { useValue } from "@legendapp/state/react";

function Component() {
  const count = useValue(state$.count);
  // re-renders only when count changes
  return <div>{count}</div>;
}
```

### useObservable() — component-local observable

```typescript
import { useObservable } from "@legendapp/state/react";

function Component() {
  const local$ = useObservable({ editing: false, draft: "" });
  const editing = useValue(local$.editing);
  return <div>{editing ? "editing" : "viewing"}</div>;
}
```

### Memo — fine-grained reactive text

```typescript
import { Memo } from "@legendapp/state/react";

// Only the text node re-renders, not the parent
function Component() {
  return (
    <div>
      Count: <Memo>{state$.count}</Memo>
    </div>
  );
}
```

### Show — conditional rendering

```typescript
import { Show } from "@legendapp/state/react";

function Component() {
  return (
    <Show if={state$.isVisible} else={<Fallback />}>
      {() => <Content />}
    </Show>
  );
}
```

### useIsMounted()

```typescript
import { useIsMounted } from "@legendapp/state/react";

const isMounted = useIsMounted();
// isMounted.get() — safe to check before async state updates
```

---

## Configuration

### enableReactTracking — warn about missing useValue

```typescript
import { enableReactTracking } from "@legendapp/state/config/enableReactTracking";
enableReactTracking({ warnMissingUse: true });
```

Call once at app entry. Logs warnings when `get()` is used in React without `useValue()`.

### enable$GetSet — shorthand syntax

```typescript
import { enable$GetSet } from "@legendapp/state/config/enable$GetSet";
enable$GetSet();

state$.count.$; // get()
state$.count.$ = 5; // set(5)
```

---

## Persistence & Sync

### Local persistence only

```typescript
import { observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";

const state$ = observable({ tasks: [] });
syncObservable(state$, {
  persist: {
    name: "my-app",
    plugin: observablePersistIndexedDB,
  },
});
```

### synced() — lazy persistence + remote

```typescript
import { observable } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";

const state$ = observable(
  synced({
    get: () => fetch("/api/data").then((r) => r.json()),
    set: ({ value }) => fetch("/api/data", { method: "POST", body: JSON.stringify(value) }),
    persist: { name: "data" },
    initial: { items: [] },
    mode: "merge", // 'set' | 'merge' | 'append' | 'prepend' | 'assign'
  }),
);
```

### syncState() — check status, control sync

```typescript
import { syncState } from "@legendapp/state";

const status$ = syncState(state$);

status$.isPersistLoaded.get(); // local cache loaded?
status$.isLoaded.get(); // remote fetch done?
status$.isSyncEnabled.get(); // sync active?
status$.lastSync.get(); // timestamp
status$.error.get(); // latest error

// Toggle sync
status$.isSyncEnabled.set(false);

// Manual sync
await status$.sync();

// Clear local cache
await status$.clearPersist();
```

---

## CRUD Sync Plugin

### syncedCrud — full CRUD with persistence and sync

```typescript
import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";

const items$ = observable(
  syncedCrud({
    // Remote operations
    list: () => api.listItems(), // fetch collection
    create: (item) => api.createItem(item), // returns created item
    update: (item) => api.updateItem(item), // returns updated item
    delete: (id) => api.deleteItem(id),

    // Local persistence
    persist: {
      name: "items",
      plugin: observablePersistIndexedDB,
      retrySync: true, // pending changes survive restarts
    },

    // Offline-first
    retry: {
      infinite: true,
      backoff: "exponential",
      maxDelay: 30, // seconds
    },

    // Conflict resolution
    fieldUpdatedAt: "updatedAt",
    fieldCreatedAt: "createdAt",
    changesSince: "last-sync", // only sync diffs

    // Shape
    as: "object", // 'object' (keyed by id) | 'array' | 'Map' | 'value'

    // Partial updates (send only changed fields + id)
    updatePartial: true,

    // Soft delete (calls update with field set to true instead of delete)
    fieldDeleted: "deleted",

    // Auto-merge server timestamps after save
    onSavedUpdate: "createdUpdatedAt",

    // Debounce saves
    debounceSet: 500,

    // Wait for condition before syncing
    waitForSet: authToken$, // delay saves until auth is ready

    // Real-time subscription
    subscribe: ({ refresh, update }) => {
      const unsub = websocket.on("items:change", (data) => {
        update(data); // apply incoming data
        // OR refresh(); // re-run list
      });
      return unsub;
    },
  }),
);
```

### How syncedCrud determines operation type

| Trigger                                  | Operation |
| ---------------------------------------- | --------- |
| New key added to object                  | `create`  |
| Existing key's properties changed        | `update`  |
| Key set to undefined/null or `.delete()` | `delete`  |
| Has `fieldCreatedAt` and value is empty  | `create`  |

### The 5-step sync flow

1. Save pending changes to local persistence (survives crash)
2. Save current state to local persistence
3. Send changes to remote (create/update/delete)
4. Merge server-generated fields back to observable + local
5. Clear pending changes from local persistence

### Differential sync with changesSince: 'last-sync'

Requires:

- `fieldUpdatedAt` pointing to a server-managed timestamp
- `list` function accepts `{ lastSync }` parameter
- Use soft deletes or include deleted rows in list response

```typescript
list: ({ lastSync }) => {
  if (lastSync) {
    return api.listItems({ updatedSince: lastSync });
  }
  return api.listItems();
},
fieldUpdatedAt: "updatedAt",
changesSince: "last-sync",
```

### Data transforms

```typescript
syncedCrud({
  // ...
  transform: {
    load: (value) => {
      // Transform data coming from server/storage
      return { ...value, date: new Date(value.date) };
    },
    save: (value) => {
      // Transform data going to server/storage
      return { ...value, date: value.date.toISOString() };
    },
  },
});
```

---

## Persistence Plugins

| Plugin                          | Import                                           | Async | Use case               |
| ------------------------------- | ------------------------------------------------ | ----- | ---------------------- |
| `ObservablePersistLocalStorage` | `@legendapp/state/persist-plugins/local-storage` | No    | Small data             |
| `observablePersistIndexedDB`    | `@legendapp/state/persist-plugins/indexeddb`     | Yes   | Large data, structured |

### IndexedDB plugin modes

```typescript
// Dictionary mode — each item stored separately by id
persist: {
  name: "tasks",
  plugin: observablePersistIndexedDB,
}

// Single item mode
persist: {
  name: "settings",
  plugin: observablePersistIndexedDB,
  indexedDB: { itemID: "user-settings" },
}
```

---

## Global defaults with configureSynced

```typescript
import { configureSynced } from "@legendapp/state/sync";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";
import { observablePersistIndexedDB } from "@legendapp/state/persist-plugins/indexeddb";

// Create a pre-configured syncedCrud with project defaults
export const synced$ = configureSynced(syncedCrud, {
  persist: {
    plugin: observablePersistIndexedDB,
    retrySync: true,
  },
  retry: { infinite: true },
  fieldUpdatedAt: "updatedAt",
  changesSince: "last-sync",
});

// Use it — only specify what's unique per store
const tasks$ = observable(
  synced$({
    list: () => getTasks(),
    create: (task) => createTask({ data: task }),
    update: (task) => updateTask({ data: task }),
    delete: (id) => deleteTask({ data: { id } }),
    persist: { name: "tasks" },
  }),
);
```

---

## Helper Functions

### trackHistory — undo/redo history

```typescript
import { trackHistory } from "@legendapp/state/helpers/trackHistory";

const history = trackHistory(state$);
// history is an observable of { [timestamp]: previousValue }
```

### undoRedo

```typescript
import { undoRedo } from "@legendapp/state/helpers/undoRedo";

const { undo, redo, getHistory } = undoRedo(state$.todos, { limit: 100 });

state$.todos.push("New task");
undo(); // reverts push
redo(); // re-applies push
```

### mergeIntoObservable

```typescript
import { mergeIntoObservable } from "@legendapp/state";

// Deep merge into existing observable, preserving listeners
mergeIntoObservable(state$, newData);
```

### ObservableHint

```typescript
import { ObservableHint } from "@legendapp/state";

// Treat as primitive — don't track child properties
ObservableHint.opaque(domElement);

// Skip recursion for performance
ObservableHint.plain(largeObject);
```
