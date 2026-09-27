import { Temporal } from "temporal-polyfill";
import { z } from "zod/v4";

export const isoDatetime = z.iso.datetime({ precision: 3 }).brand<"iso", "inout">();
export type ISODateString = z.output<typeof isoDatetime>;

export const isoDate = z.iso.date().brand<"isoDate", "inout">();
export type ISODateOnly = z.output<typeof isoDate>;

export const now = (): ISODateString =>
  Temporal.Now.instant().toString({ fractionalSecondDigits: 3 }) as ISODateString;

export const today = (): ISODateOnly => Temporal.Now.plainDateISO().toString() as ISODateOnly;

export const hoursFromNow = (hours: number): ISODateString =>
  Temporal.Now.instant().add({ hours }).toString({ fractionalSecondDigits: 3 }) as ISODateString;
