import { sql } from "drizzle-orm";
import type { AnySQLiteColumn, SQLiteColumn } from "drizzle-orm/sqlite-core";
import { integer, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";

// Primary key (text for cuid2 IDs)
export const pk = (name = "id") => text(name).primaryKey();

// Strings
export const string = (name: string) => text(name).notNull();
export const nullableString = (name: string) => text(name);

// Enums
export const oneOf = <T extends readonly [string, ...string[]]>(name: string, options: T) =>
  text(name, { enum: options }).notNull();

export const nullableOneOf = <T extends readonly [string, ...string[]]>(name: string, options: T) =>
  text(name, { enum: options });

// Numbers
export const int = (name: string) => integer(name).notNull();
export const nullableInt = (name: string) => integer(name);

// Booleans (SQLite stores as 0/1)
export const bool = (name: string) => integer(name, { mode: "boolean" }).notNull();

// Timestamps (stored as ISO 8601 strings with Z suffix for proper UTC parsing)
// strftime with 'Z' suffix ensures JS Date parsing treats it as UTC
export const createdAt = (name = "created_at") =>
  text(name)
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);

export const updatedAt = (name = "updated_at") =>
  text(name)
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);

// Foreign keys (text for cuid2 references)
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
