# TanStack DB Live Queries Reference

Live queries are reactive — results auto-update when underlying data changes. The query builder composes a declarative pipeline (like Drizzle/Kysely), not imperative JS.

## React Hooks

### useLiveQuery

```tsx
import { useLiveQuery } from "@tanstack/react-db";

// Full collection
const { data, isLoading, status } = useLiveQuery(tasksCollection);

// With query builder + dependency array
const { data } = useLiveQuery(
  (q) => q.from({ t: tasksCollection }).where(({ t }) => eq(t.categoryId, catId)),
  [catId],
);

// Conditional — return undefined/null to disable
const { data, isEnabled } = useLiveQuery(
  (q) => {
    if (!userId) return undefined;
    return q.from({ t: tasksCollection }).where(({ t }) => eq(t.userId, userId));
  },
  [userId],
);
// When disabled: status="disabled", data=undefined, isEnabled=false
```

### useLiveSuspenseQuery

Suspends until data ready. `data` is always defined (never undefined).

```tsx
const { data } = useLiveSuspenseQuery(
  (q) => q.from({ t: tasksCollection }),
  [dep],
); // Re-suspends when deps change
```

Use with `<Suspense>` + `<ErrorBoundary>`. Prefer `useLiveQuery` when using router loaders.

## Query Builder API

### from — Source collection or subquery

```ts
q.from({ alias: collection });
q.from({ alias: subquery });
```

### where — Filter rows (chained = AND)

```ts
.where(({ t }) => eq(t.status, "todo"))
.where(({ t }) => and(eq(t.active, true), or(gt(t.age, 25), eq(t.role, "admin"))))
```

### select — Project fields

```ts
.select(({ t }) => ({ id: t.id, name: t.name }))           // Specific fields
.select(({ t }) => ({ ...t, isAdult: gt(t.age, 18) }))     // Spread + computed
.select(({ t }) => ({ fullName: concat(t.first, " ", t.last) }))  // Rename + transform
```

Without `select`: full schema. With join: namespaced `{ user: User, post?: Post }`.

### join — Combine collections

```ts
// Default is left join (joined fields optional)
.join({ p: postsCollection }, ({ u, p }) => eq(u.id, p.userId))

// Explicit types
.leftJoin(...)   // joined fields optional
.rightJoin(...)  // source fields optional
.innerJoin(...)  // all fields required
.fullJoin(...)   // all fields optional

// Multiple joins
.join({ p: posts }, ({ u, p }) => eq(u.id, p.userId))
.join({ c: comments }, ({ p, c }) => eq(p.id, c.postId))
```

### includes — Nested collections in select

Produces hierarchical results (1:N) instead of flat joined rows.

```ts
q.from({ p: projectsCollection }).select(({ p }) => ({
  id: p.id,
  name: p.name,
  issues: q
    .from({ i: issuesCollection })
    .where(({ i }) => eq(i.projectId, p.id)) // Correlation condition (required)
    .orderBy(({ i }) => i.createdAt, "desc")
    .limit(5)
    .select(({ i }) => ({ id: i.id, title: i.title })),
}));
```

Each child is a live `Collection`. Use `toArray()` to get plain arrays:

```ts
import { toArray } from "@tanstack/db";
issues: toArray(q.from({ i: issuesCollection }).where(...));
```

In React, pass child collection to subcomponent with its own `useLiveQuery`:

```tsx
<IssueList issuesCollection={project.issues} />
// Inside: const { data } = useLiveQuery(issuesCollection)
```

### groupBy + Aggregates

```ts
import { count, sum, avg, min, max } from "@tanstack/db";

.groupBy(({ t }) => t.categoryId)
.groupBy(({ t }) => [t.dept, t.role])  // Multiple columns
.select(({ t }) => ({ dept: t.dept, total: count(t.id), avgSalary: avg(t.salary) }))
.having(({ $selected }) => gt($selected.total, 5))
```

Select must only contain grouped fields or aggregates. Without groupBy, aggregates treat entire set as one group.

### findOne — Single result

```ts
.where(({ t }) => eq(t.id, taskId)).findOne()
// Returns T | undefined instead of T[]
```

### distinct — Unique rows (requires select)

```ts
.select(({ t }) => ({ country: t.country })).distinct()
```

### orderBy, limit, offset

```ts
.orderBy(({ t }) => t.name)                    // asc (default)
.orderBy(({ t }) => t.createdAt, "desc")       // desc
.orderBy(({ $selected }) => $selected.total, "desc")  // Order by computed field
.limit(20).offset(40)                           // Pagination
```

### Subqueries

```ts
const active = q.from({ u: usersCollection }).where(({ u }) => eq(u.active, true));
return q.from({ u: active }).join({ p: posts }, ({ u, p }) => eq(u.id, p.userId));
```

Same subquery used multiple times is auto-deduplicated.

### Composable Queries

```ts
// Reusable filters with Ref<T>
import type { Ref } from "@tanstack/db";
const isActive = ({ t }: { t: Ref<Task> }) => eq(t.status, "todo");

q.from({ t: tasksCollection }).where(isActive);
```

## Expression Functions

### Comparison

`eq(a, b)`, `gt(a, b)`, `gte(a, b)`, `lt(a, b)`, `lte(a, b)`, `like(a, pattern)`, `ilike(a, pattern)`, `inArray(a, [1,2,3])`, `isUndefined(a)`, `isNull(a)`

No `ne` operator — use `not(eq(a, b))` for not-equal.

### Logical

`and(...conds)`, `or(...conds)`, `not(cond)`

### String

`upper(s)`, `lower(s)`, `length(s)`, `concat(a, b, ...)`

### Math

`add(a, b)`, `coalesce(a, b, fallback)`

### Aggregates (use with groupBy or implicit single-group)

`count(field)`, `sum(field)`, `avg(field)`, `min(field)`, `max(field)`

## Functional Variants

For complex logic the declarative API can't express. **Cannot be optimized or indexed.**

```ts
.fn.where((row) => row.t.email.includes("@company.com"))
.fn.select((row) => ({ ...row.t, tier: row.t.salary > 100000 ? "senior" : "junior" }))
.fn.having(({ $selected }) => $selected.total > 1000 && $selected.count >= 3)
```

`fn.select()` cannot be used with `groupBy()`.

## Reactive Effects

Fire callbacks on enter/exit/update without materializing full results.

```ts
import { createEffect } from "@tanstack/db";

const effect = createEffect({
  query: (q) => q.from({ t: tasksCollection }).where(({ t }) => eq(t.status, "done")),
  skipInitial: true, // Only react to changes after initial load
  onEnter: async (event, ctx) => {
    /* event.value, event.key, ctx.signal */
  },
  onUpdate: (event) => {
    /* event.value, event.previousValue */
  },
  onExit: (event) => {
    /* event.value */
  },
  onBatch: (events) => {
    /* all events for this graph run */
  },
  onError: (error, event) => {
    /* handler error */
  },
});
await effect.dispose();
```

React: `useLiveQueryEffect({ query, onEnter, skipInitial }, [deps])` — auto-disposes on unmount.

## Virtual Properties

Every query result row includes read-only virtual props:

- `$synced`: `true` when confirmed by sync, `false` when optimistic
- `$origin`: `"local"` or `"remote"`
- `$key`, `$collectionId`

Usable in `where`, `select`, `orderBy`.
