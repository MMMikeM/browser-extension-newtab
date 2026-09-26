# Drizzle ORM v1 Reference (rc.4)

## Installation

```bash
npm i drizzle-orm@rc @libsql/client
npm i -D drizzle-kit@rc
```

---

## Driver Setup (Turso/libSQL)

### Using connection config

```typescript
import { drizzle } from "drizzle-orm/libsql";

const db = drizzle({
  connection: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
```

### Using existing client

```typescript
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle({ client });
```

### With relations

```typescript
import { relations } from "./relations";
const db = drizzle({ client, relations });
```

### Casing (changed in rc)

The `casing` option on `drizzle()` was removed. Casing is now set per table (or view) at definition time:

```typescript
import { snakeCase } from "drizzle-orm/sqlite-core";

// Keys map to snake_case columns: userId -> user_id
export const tasks = snakeCase.table("tasks", {
  id: text().primaryKey(),
  userId: text().notNull(),
});
```

`camelCase.table()` / `camelCase.view()` also exist. This project doesn't use either; it passes explicit column names instead.

Driver sub-imports: `/libsql`, `/libsql/node`, `/libsql/web`, `/libsql/http`, `/libsql/ws`, `/libsql/wasm`.

---

## Schema Definition (SQLite)

All column types import from `drizzle-orm/sqlite-core`.

### Table definition

```typescript
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
  role: text().$type<"admin" | "user">().default("user"),
  createdAt: text("created_at").notNull(),
});
```

### Column types

- `integer()` — INTEGER
- `text()` — TEXT
- `real()` — REAL
- `blob()` — BLOB

### Column modifiers

- `.primaryKey()` / `.primaryKey({ autoIncrement: true })`
- `.notNull()`
- `.unique()`
- `.default(value)` — static default
- `.$default(() => fn())` — dynamic default (runs in JS, not SQL)
- `.$type<T>()` — narrow the TypeScript type
- `.references(() => otherTable.column)` — foreign key

### Column name mapping

Pass the DB column name as the first argument if it differs from the JS property:

```typescript
createdAt: text("created_at").notNull();
```

Or define the table with `snakeCase.table()` to auto-map (see Casing above).

### Indexes and constraints

```typescript
export const posts = sqliteTable(
  "posts",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    slug: text().notNull(),
    title: text(),
    authorId: integer("author_id").references(() => users.id),
  },
  (table) => [uniqueIndex("slug_idx").on(table.slug), index("title_idx").on(table.title)],
);
```

### Self-referencing foreign keys

```typescript
import { type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
invitedBy: integer("invited_by").references((): AnySQLiteColumn => users.id);
```

---

## Relations v2 (v1 API)

### defineRelations

```typescript
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts(),
    profile: r.one.profiles({
      from: r.users.id,
      to: r.profiles.userId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}));
```

### Key differences from v0

| v0                                                             | v1                                                |
| -------------------------------------------------------------- | ------------------------------------------------- |
| `relations(table, ({ one, many }) => ...)` scattered per table | `defineRelations(schema, (r) => ...)` single call |
| `fields: [table.col]`                                          | `from: r.table.col` (or array)                    |
| `references: [other.col]`                                      | `to: r.other.col` (or array)                      |
| `relationName: 'foo'`                                          | `alias: 'foo'`                                    |

### Many-to-many with `through`

```typescript
users: {
  groups: r.many.groups({
    from: r.users.id.through(r.usersToGroups.userId),
    to: r.groups.id.through(r.usersToGroups.groupId),
  }),
}
```

### Optional relations

```typescript
posts: r.many.posts({
  from: r.users.id,
  to: r.posts.authorId,
  optional: false, // makes the relation required at type level
});
```

### Predefined filters on relations

```typescript
activePosts: r.many.posts({
  from: r.users.id,
  to: r.posts.authorId,
  where: { status: "active" },
});
```

### Modular relations (split across files)

```typescript
import { defineRelationsPart } from "drizzle-orm";

const part1 = defineRelations(schema, (r) => ({
  users: { posts: r.many.posts() },
}));

const part2 = defineRelationsPart(schema, (r) => ({
  posts: { author: r.one.users() },
}));

const db = drizzle({ client, relations: { ...part1, ...part2 } });
```

---

## Queries

### CRUD operations

```typescript
import { eq, lt, gt, and, or, sql } from 'drizzle-orm'

// Select
const rows = await db.select().from(users)
const filtered = await db.select().from(users).where(eq(users.id, 1))

// Insert
await db.insert(users).values({ name: 'Alice', email: '[email protected]' })
// Insert returning
const [inserted] = await db.insert(users).values({ ... }).returning()

// Update
await db.update(users).set({ name: 'Bob' }).where(eq(users.id, 1))
// Update returning
const [updated] = await db.update(users).set({ name: 'Bob' }).where(eq(users.id, 1)).returning()

// Delete
await db.delete(users).where(eq(users.id, 1))

// Upsert (insert or update on conflict)
await db.insert(users).values({ id, name, email }).onConflictDoUpdate({
  target: users.id,
  set: { name, email },
})
```

### Relational queries (v1 syntax)

**Where — object syntax (NOT function syntax):**

```typescript
// Simple
const user = await db.query.users.findFirst({
  where: { id: 1 },
});

// Operators
const users = await db.query.users.findMany({
  where: { age: { gt: 18 } },
});

// AND (implicit — multiple keys)
const users = await db.query.users.findMany({
  where: { name: "John", age: { gte: 18 } },
});

// Explicit AND/OR
const users = await db.query.users.findMany({
  where: {
    OR: [{ name: "John" }, { age: { lt: 18 } }],
  },
});

// NOT
const users = await db.query.users.findMany({
  where: {
    NOT: { id: { gt: 10 } },
    name: { like: "John%" },
  },
});

// NULL checks
const users = await db.query.users.findMany({
  where: { deletedAt: { isNull: true } },
});
const users = await db.query.users.findMany({
  where: { deletedAt: { isNull: false } }, // IS NOT NULL
});

// RAW SQL in where
const users = await db.query.users.findMany({
  where: {
    RAW: (table) => sql`LOWER(${table.name}) LIKE 'john%'`,
  },
});

// Filter by relation (v1 only)
const users = await db.query.users.findMany({
  where: {
    posts: { title: { like: "%drizzle%" } },
  },
});
```

**OrderBy — object syntax:**

```typescript
const users = await db.query.users.findMany({
  orderBy: { id: "asc" },
});
// Multiple
const users = await db.query.users.findMany({
  orderBy: { lastName: "asc", firstName: "asc" },
});
```

**With (eager loading):**

```typescript
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});

// Nested with filters
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: {
      where: { status: "published" },
      limit: 5,
      offset: 0,
      orderBy: { createdAt: "desc" },
      with: {
        comments: true,
      },
    },
  },
});
```

**Columns (select specific fields):**

```typescript
const users = await db.query.users.findMany({
  columns: { id: true, name: true },
});
```

### Offset on relations (v1 only)

```typescript
await db.query.posts.findMany({
  limit: 5,
  offset: 2,
  with: {
    comments: { offset: 3, limit: 3 },
  },
});
```

---

## Counting

### `db.$count()` — simple filtered count

```typescript
const count = await db.$count(users, eq(users.role, "admin"));
```

### `selectDistinct()` — distinct with joins

```typescript
const rows = await db
  .selectDistinct({ id: tasks.id })
  .from(tasks)
  .innerJoin(tags, eq(tasks.id, tags.taskId))
  .where(inArray(tags.name, ["urgent", "bug"]));
```

### Multiple counts in one round-trip

```typescript
const [stats] = await db.all<{ total: number; active: number }>(sql`
  SELECT
    (SELECT COUNT(*) FROM users) as total,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as active
`);
```

---

## Drizzle Kit Config

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
```

### Commands

```bash
npx drizzle-kit generate   # Generate migration SQL files
npx drizzle-kit migrate    # Apply migrations
npx drizzle-kit push       # Push schema directly (dev)
npx drizzle-kit pull       # Introspect DB → generate schema
npx drizzle-kit up         # Upgrade migration folder format to v1
npx drizzle-kit check      # Detect non-commutative migrations
npx drizzle-kit studio     # Open Drizzle Studio GUI
```

`drizzle-kit drop` is **removed** in v1.

---

## Migration folder structure (v1)

v1 removes `journal.json`. Each migration is its own folder:

```
drizzle/
  0000_initial/
    migration.sql
    snapshot.json
  0001_add_posts/
    migration.sql
    snapshot.json
```

Run `npx drizzle-kit up` to upgrade from the old flat format.

---

## Zod Schema Generation (v1)

Starting from beta.15, `drizzle-zod` is deprecated. Validators are built into `drizzle-orm`:

```typescript
// Old (removed): import { createInsertSchema } from 'drizzle-zod'
// New:
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
  createSchemaFactory,
} from "drizzle-orm/zod";
```

Also available: `drizzle-orm/valibot`, `drizzle-orm/typebox`, `drizzle-orm/arktype`.

### createSelectSchema — validate data coming FROM the database

```typescript
import { createSelectSchema } from "drizzle-orm/zod";
import { tasks } from "./schema";

const taskSelectSchema = createSelectSchema(tasks);
type Task = z.infer<typeof taskSelectSchema>;
```

### createInsertSchema — validate data going INTO the database

```typescript
const taskInsertSchema = createInsertSchema(tasks);
// Fields with defaults become optional
// Generated columns are excluded
const parsed = taskInsertSchema.parse(userInput);
await db.insert(tasks).values(parsed);
```

### createUpdateSchema — validate partial updates

```typescript
const taskUpdateSchema = createUpdateSchema(tasks);
// All fields are optional (partial update)
// Generated columns are excluded
const parsed = taskUpdateSchema.parse(userInput);
await db.update(tasks).set(parsed).where(eq(tasks.id, id));
```

### Refinements — extend or override column schemas

```typescript
// Callback extends the derived schema (applied before nullability/optionality)
const insertSchema = createInsertSchema(tasks, {
  title: (schema) => schema.min(1).max(200),
});

// Direct Zod schema overwrites entirely (including nullability)
const insertSchema = createInsertSchema(tasks, {
  title: z.string().min(1).max(200),
});
```

### createSchemaFactory — custom Zod instance or coercion

```typescript
import { createSchemaFactory } from "drizzle-orm/zod";

// Use with extended Zod (e.g. @hono/zod-openapi)
const { createInsertSchema } = createSchemaFactory({ zodInstance: z });

// Enable type coercion (e.g. string → date)
const { createInsertSchema } = createSchemaFactory({
  coerce: { date: true }, // or true for all types
});
```

### Type mappings

- `text()` → `z.string()`
- `text({ enum: [...] })` → `z.enum([...])`
- `integer()` → `z.number().int()`
- `integer({ mode: 'boolean' })` → `z.boolean()`
- `real()` → `z.number()`
- Nullable columns → `.nullable()`
- Columns with defaults → `.optional()` (in insert/update schemas)

---

## v1 beta.16+ migration infrastructure

- Migration table now has `name` and `applied_at` columns (versioned schema)
- Matching by full folder name (UTC timestamp + name)
- `drizzle-kit check` detects non-commutative migrations across branches
- Automatic upgrade from old journal format with three-step backfill

---

## Common operator imports

```typescript
import {
  eq,
  ne,
  lt,
  gt,
  lte,
  gte,
  and,
  or,
  not,
  like,
  ilike,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  between,
  sql,
  asc,
  desc,
  count,
  sum,
  avg,
  min,
  max,
} from "drizzle-orm";
```
