# Server Package

Hono API server with Drizzle ORM (Turso/libSQL). Package boundaries prevent server code from leaking into the client bundle.

## API routes

Routes are in `src/routes/`. Each file exports Hono route handlers.

## Database

Single Turso instance with embedded replica. `syncInterval: 60` keeps local SQLite in sync. All writes go through Turso (remote-first), reads are local.

## Query patterns

- **Always use `db.query` (relational API)** for reads — never `db.select().from()`.
- **Drizzle v1 `where` uses object syntax**, not `eq()` operators: `where: { id: someId }`.
- **`db.insert()` / `db.update()` / `db.delete()`** (classic API) are fine for writes.
- Check existing repos in `src/db/` for the canonical patterns before writing new queries.
