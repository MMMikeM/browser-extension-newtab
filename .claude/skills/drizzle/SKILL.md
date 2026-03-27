---
name: drizzle
description: Set up or modify Drizzle ORM schema, migrations, and queries for this project. Use when working with database schema, relations, migrations, or converting raw SQL to Drizzle. This project uses Drizzle v1 beta with Turso/libSQL.
argument-hint: "[task description]"
---

# Drizzle ORM Skill

This project uses **Drizzle ORM v1.0.0-beta.19** with **Turso (libSQL)**. All Drizzle code MUST follow the v1 API — not the legacy v0 API.

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

| Use Case                         | API                                   |
| -------------------------------- | ------------------------------------- |
| Fetching entities with relations | Query API (`db.query.table.*`)        |
| Simple CRUD                      | Query API                             |
| Simple filtered count            | `db.$count(table, filter)`            |
| Multiple counts in one query     | Raw SQL with scalar subqueries        |
| COUNT, SUM, AVG, GROUP BY        | Select Builder (`db.select().from()`) |
| Complex JOINs not in relations   | Select Builder                        |
| DISTINCT with JOINs              | `db.selectDistinct()`                 |

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

4. **Use `snake_case` casing option** if table columns use snake_case in the database:

   ```typescript
   const db = drizzle({ client, casing: "snake_case" });
   ```

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
