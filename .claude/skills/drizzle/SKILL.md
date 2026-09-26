---
name: drizzle
description: Set up or modify Drizzle ORM schema, migrations, and queries for this project. Use when working with database schema, relations, migrations, or converting raw SQL to Drizzle. This project uses Drizzle v1 beta with Turso/libSQL. IMPORTANT — invoke this skill BEFORE writing ANY Drizzle code, even simple queries or schema changes. This includes adding columns, writing findFirst/findMany calls, creating new repos, defining relations, or writing any db.query/db.insert/db.update/db.delete code. The v1 API has non-obvious differences from v0 that cause type errors if you guess. Read the skill first, write code second.
argument-hint: "[task description]"
---

# Drizzle ORM Skill

This project uses **Drizzle ORM v1.0.0-rc.4** with **Turso (libSQL)**. All Drizzle code MUST follow the v1 API — not the legacy v0 API.

Your task: $ARGUMENTS

Before starting, read the reference docs in this skill directory:

- `${CLAUDE_SKILL_DIR}/v1-reference.md` — v1 API, schema, relations, queries, config

## Project context

- **Driver**: `@libsql/client` (HTTP client for Turso)
- **ORM import**: `drizzle-orm/libsql`
- **Schema column imports**: `drizzle-orm/sqlite-core`
- **Config dialect**: `turso`
- **Env vars**: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`

## File conventions for this project

```
src/
  lib/
    db.ts              ← Drizzle client instance
    schema.ts          ← Table definitions (create if missing)
    relations.ts       ← defineRelations (create if needed)
drizzle.config.ts      ← Drizzle Kit config (create if missing)
drizzle/               ← Generated migrations (drizzle-kit output)
```

## Performance rules (Turso = remote DB, 100-400ms per round-trip)

### NEVER query inside loops

```typescript
// WRONG — N+1 queries, each paying network latency
for (const task of tasks) {
  const column = await db.query.columns.findFirst({ where: { id: task.columnId } });
}

// CORRECT — batch fetch + Map lookup
const columnIds = tasks.map((t) => t.columnId);
const columns = await db.query.columns.findMany({ where: { id: { in: columnIds } } });
const columnMap = new Map(columns.map((c) => [c.id, c]));
for (const task of tasks) {
  const column = columnMap.get(task.columnId);
}
```

Same for writes — batch them:

```typescript
// WRONG: N inserts
for (const task of tasks) await db.insert(tasksTable).values(task);

// CORRECT: 1 insert
await db.insert(tasksTable).values(tasks);
```

### Prefer relations over multiple queries

One query with `with:` = one HTTP request. Multiple queries = multiple round-trips.

```typescript
// CORRECT — single query (~150ms)
const task = await db.query.tasks.findFirst({
  where: { id },
  with: { column: true },
});

// WRONG — 2 queries = 2x latency
const task = await db.query.tasks.findFirst({ where: { id } });
const column = await db.query.columns.findFirst({ where: { id: task.columnId } });
```

### Guard empty arrays before `in` queries

```typescript
const findByIds = async (ids: string[]) => {
  if (ids.length === 0) return [];
  return db.query.tasks.findMany({ where: { id: { in: ids } } });
};
```

### Choose the right API

**Default to the Query API (`db.query`) for all reads.** The Select Builder (`db.select().from()`) exists but should only be used for aggregates, complex JOINs not expressible via relations, or `DISTINCT`. If you reach for `db.select()` for a simple lookup, you're using the wrong API.

| Use Case                         | API                                   |
| -------------------------------- | ------------------------------------- |
| Fetching entities with relations | Query API (`db.query.table.*`)        |
| Simple CRUD reads                | Query API                             |
| Single-row lookup by ID/field    | Query API (`findFirst`)               |
| Simple filtered count            | `db.$count(table, filter)`            |
| Multiple counts in one query     | Raw SQL with scalar subqueries        |
| COUNT, SUM, AVG, GROUP BY        | Select Builder (`db.select().from()`) |
| Complex JOINs not in relations   | Select Builder                        |
| DISTINCT with JOINs              | `db.selectDistinct()`                 |

```typescript
// CORRECT — Query API for lookups
const user = await db.query.users.findFirst({ where: { id: userId } });
const tasks = await db.query.tasks.findMany({ where: { userId } });

// WRONG — don't use Select Builder for simple reads
const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
```

## Implementation rules

1. **Always use v1 API** — see the reference doc. Key differences from v0:
   - Relations use `defineRelations()`, not scattered `relations()` calls
   - Relation params: `from`/`to` (not `fields`/`references`), `alias` (not `relationName`)
   - Query `where` uses object syntax `{ id: 1 }`, not function syntax `(t, { eq }) => eq(t.id, 1)`
   - Query `orderBy` uses object syntax `{ id: "asc" }`, not function syntax

2. **Use the `drizzle()` factory** from `drizzle-orm/libsql` — pass `{ client }` or `{ connection: { url, authToken } }`

3. **Pass `relations`** to `drizzle()`, not `schema`:

   ```typescript
   const db = drizzle({ client, relations });
   ```

4. **Name columns explicitly in snake_case** (project convention, e.g. `text("user_id")`). The `casing` option on `drizzle()` was removed in rc; casing is now per table via `snakeCase.table()` from `drizzle-orm/sqlite-core`. Don't reintroduce `casing` on `drizzle()`, it no longer typechecks.

5. **For migrations**, use `drizzle-kit push` during development, `drizzle-kit generate` + `drizzle-kit migrate` for production

6. **Schema changes** — after modifying schema.ts, always run `npx drizzle-kit generate` to create a migration, then remind the user to apply it

7. **Don't import from legacy packages** — validators come from `drizzle-orm/zod`, `drizzle-orm/valibot`, etc. (not `drizzle-zod`, `drizzle-valibot`)

8. **Derive validators from schema** — use `createSelectSchema`, `createInsertSchema`, `createUpdateSchema` from `drizzle-orm/zod` to generate Zod schemas from table definitions. Never hand-roll input types that duplicate the schema. Use refinements to add constraints (`.min()`, `.max()`, etc.).

## Common patterns

### Upsert

```typescript
await db.insert(tasks).values({ id, title, columnId }).onConflictDoUpdate({
  target: tasks.id,
  set: { title, columnId },
});
```

### Always use `.returning()` on mutations

```typescript
// CORRECT — caller gets generated ID, timestamps, defaults
const [task] = await db.insert(tasks).values(data).returning();

const [updated] = await db.update(tasks).set({ title }).where(eq(tasks.id, id)).returning();
```

Skip `.returning()` only for fire-and-forget operations (batch cleanup, etc.).

### Simple counts with `db.$count()`

```typescript
const taskCount = await db.$count(tasks, eq(tasks.columnId, columnId));
```

For multiple counts in one round-trip, use raw SQL:

```typescript
const [stats] = await db.all<{ total: number; done: number }>(sql`
  SELECT
    (SELECT COUNT(*) FROM tasks) as total,
    (SELECT COUNT(*) FROM tasks WHERE done = 1) as done
`);
```
