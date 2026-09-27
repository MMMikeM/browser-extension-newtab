import { sql } from "drizzle-orm";
import type { AnySQLiteColumn, SQLiteColumn } from "drizzle-orm/sqlite-core";
import { integer, text } from "drizzle-orm/sqlite-core";
export const pk = (name = "id") => text(name).primaryKey();

export const string = (name: string) => text(name).notNull();
export const nullableString = (name: string) => text(name);

export const oneOf = <T extends readonly [string, ...string[]]>(name: string, options: T) =>
  text(name, { enum: options }).notNull();

export const nullableOneOf = <T extends readonly [string, ...string[]]>(name: string, options: T) =>
  text(name, { enum: options });

export const int = (name: string) => integer(name).notNull();
export const nullableInt = (name: string) => integer(name);

export const bool = (name: string) => integer(name, { mode: "boolean" }).notNull();

// The Z suffix makes JS parse these as UTC; SQLite's own datetime format has none
export const createdAt = (name = "created_at") =>
  text(name)
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);

export const updatedAt = (name = "updated_at") =>
  text(name)
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);

type FkAction = "cascade" | "restrict" | "no action" | "set null" | "set default";
type FkOptions = { onDelete?: FkAction; onUpdate?: FkAction };

export const fk = (
  name: string,
  ref: SQLiteColumn | (() => AnySQLiteColumn),
  options?: FkOptions,
) => {
  const refThunk = typeof ref === "function" ? ref : () => ref;
  return text(name).notNull().references(refThunk, options);
};

export const nullableFk = (
  name: string,
  ref: SQLiteColumn | (() => AnySQLiteColumn),
  options?: FkOptions,
) => {
  const refThunk = typeof ref === "function" ? ref : () => ref;
  return text(name).references(refThunk, options);
};
