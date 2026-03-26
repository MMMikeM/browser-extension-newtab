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
