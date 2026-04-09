import { Temporal } from "temporal-polyfill";
import { z } from "zod/v4";

/** Branded ISO 8601 datetime string (millisecond precision, UTC). */
export const isoDatetime = z.iso.datetime({ precision: 3 }).brand<"iso", "inout">();
export type ISODateString = z.output<typeof isoDatetime>;

/** Branded ISO 8601 date string (YYYY-MM-DD). */
export const isoDate = z.iso.date().brand<"isoDate", "inout">();
export type ISODateOnly = z.output<typeof isoDate>;

/** Current instant as an ISO string (millisecond precision). */
export const now = (): ISODateString =>
  Temporal.Now.instant().toString({ fractionalSecondDigits: 3 }) as ISODateString;

/** Current date as YYYY-MM-DD. */
export const today = (): ISODateOnly => Temporal.Now.plainDateISO().toString() as ISODateOnly;

/** Instant N hours from now, as an ISO string (millisecond precision). */
export const hoursFromNow = (hours: number): ISODateString =>
  Temporal.Now.instant().add({ hours }).toString({ fractionalSecondDigits: 3 }) as ISODateString;
