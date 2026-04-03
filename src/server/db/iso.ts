import { z } from "zod/v4"

/** Branded ISO 8601 datetime string — validated by Zod, nominal in TypeScript. */
export const isoDatetime = z.iso.datetime().brand<"iso", "inout">();
export type ISODateString = z.output<typeof isoDatetime>;