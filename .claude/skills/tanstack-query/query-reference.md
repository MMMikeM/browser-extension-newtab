# TanStack Query Reference (for this project)

## queryOptions — single source of truth for a query

Define query config once. Types flow through to all cache operations automatically.

```typescript
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

const tasksQueryOptions = () =>
  queryOptions({
    queryKey: ["tasks"] as const,
    queryFn: () => getTasks(),
  });

// Usage — types infer everywhere, no generics needed
const { data } = useQuery(tasksQueryOptions());

const opts = tasksQueryOptions();
queryClient.getQueryData(opts.queryKey); // typed as Task[] | undefined
queryClient.setQueryData(opts.queryKey, newData); // type-checked
queryClient.invalidateQueries(opts);
queryClient.cancelQueries(opts);
```

**Anti-pattern — never do this:**

```typescript
// ❌ Manual generics
queryClient.getQueryData<Task[]>(["tasks"]);
queryClient.setQueryData<Task[]>(["tasks"], data);
```

---

## Optimistic Updates — two approaches

### 1. UI-based (preferred for most cases)

Use `useMutation`'s `variables` and `isPending` directly in the render. No cache manipulation, no rollback logic.

```typescript
const addTodo = useMutation({
  mutationFn: createTodo,
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
})

// In JSX:
<ul>
  {todos.map((todo) => (
    <li key={todo.id}>{todo.text}</li>
  ))}
  {addTodo.isPending && (
    <li style={{ opacity: 0.5 }}>{addTodo.variables.data.text}</li>
  )}
</ul>
```

**Error handling — show retry:**

```typescript
{addTodo.isError && (
  <li style={{ color: 'red' }}>
    {addTodo.variables.data.text}
    <button onClick={() => addTodo.mutate(addTodo.variables)}>Retry</button>
  </li>
)}
```

**Cross-component access via `useMutationState`:**

```typescript
const { mutate } = useMutation({
  mutationFn: createTodo,
  onSettled: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  mutationKey: ["addTodo"],
});

// In another component:
const pendingTodos = useMutationState<string>({
  filters: { mutationKey: ["addTodo"], status: "pending" },
  select: (mutation) => mutation.state.variables,
});
```

**When to use UI approach:**

- Mutation and query in same component (or accessible via `useMutationState`)
- Simple add/update/delete
- You want less code and simpler reasoning

### 2. Cache-based (for complex cases)

Manipulate the cache directly in `onMutate`. Required when multiple components need to see the update immediately.

```typescript
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo, context) => {
    await context.client.cancelQueries({ queryKey: ["todos"] });
    const previous = context.client.getQueryData(["todos"]);
    context.client.setQueryData(["todos"], (old) => [...old, newTodo]);
    return { previous };
  },
  onError: (err, newTodo, onMutateResult, context) => {
    context.client.setQueryData(["todos"], onMutateResult.previous);
  },
  onSettled: (data, error, variables, onMutateResult, context) =>
    context.client.invalidateQueries({ queryKey: ["todos"] }),
});
```

**When to use cache approach:**

- Multiple components need to reflect the optimistic state
- Complex list operations (reordering, moving between lists)
- UI approach doesn't fit the component structure

---

## Updates from Mutation Responses

When the server returns the updated data, use it directly — don't refetch.

```typescript
const mutation = useMutation({
  mutationFn: editTodo,
  onSuccess: (data) => {
    queryClient.setQueryData(["todo", { id: data.id }], data);
  },
});
```

**As a reusable hook:**

```typescript
const useMutateTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editTodo,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["todo", { id: variables.id }], data);
    },
  });
};
```

---

## Cache immutability

**Always create new objects.** Never mutate cached data in place.

```typescript
// ❌ WRONG — mutating in place
queryClient.setQueryData(["posts", { id }], (old) => {
  if (old) old.title = "new title";
  return old;
});

// ✅ RIGHT — spreading
queryClient.setQueryData(["posts", { id }], (old) => (old ? { ...old, title: "new title" } : old));
```

---

## Patterns for this project

### Server functions as mutationFn

Pass TanStack Start server functions directly — don't wrap them:

```typescript
// ✅ Direct
const mutation = useMutation({ mutationFn: createTask });

// ❌ Unnecessary wrapper
const mutation = useMutation({
  mutationFn: (input: CreateTaskInput) => createTask({ data: input }),
});
```

When passed directly, `onMutate` receives the full fetcher options `{ data, headers }`, not just the data. Destructure:

```typescript
onMutate: async ({ data }) => {
  // data is your typed input
};
```

And `mutate` calls need `{ data: {...} }`:

```typescript
mutation.mutate({ data: { id: "123", title: "New task" } });
```

### Auth is transparent

The `authMiddleware` in `src/lib/middleware.ts` handles auth headers on every server function call. Hooks and queries never touch tokens.

### Type derivation

```typescript
// Task type from query return (not hand-rolled)
type Task = Awaited<ReturnType<typeof getTasks>>[number];

// Mutation input types from Drizzle schemas (not hand-rolled)
import { createInsertSchema, createUpdateSchema } from "drizzle-orm/zod";
const insertSchema = createInsertSchema(tasks).required({ id: true });
// z.infer<typeof insertSchema> gives you the typed input
```

---

## Common mistakes to avoid

1. **Hand-rolling types** that duplicate the schema — derive from `$inferSelect`, `createInsertSchema`, or query return types.

2. **Passing generics to `getQueryData`/`setQueryData`** — use `queryOptions()` and pass `opts.queryKey` instead.

3. **Wrapping server functions** in `(input) => fn({ data: input })` — pass directly as `mutationFn`.

4. **Tacking auth tokens onto every call** — use middleware, not data fields.

5. **Using cache-based optimistic updates for simple cases** — the UI approach (`variables` + `isPending`) is simpler and covers most scenarios.

6. **Forgetting `onSettled` invalidation** — always refetch to sync with server truth.

7. **Mutating cached objects in place** — always spread to create new references.
