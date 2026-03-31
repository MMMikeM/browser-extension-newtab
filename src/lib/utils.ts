import type { VariantProps } from "tailwind-variants";
import z from "zod/v4";
export { cn } from "tailwind-variants";

/** Branded ISO 8601 datetime string — validated by Zod, nominal in TypeScript. */
export const isoDatetime = z.iso.datetime().brand<"iso", "inout">();
export type ISODateString = z.output<typeof isoDatetime>;
export const now = (): ISODateString => new Date().toISOString() as ISODateString;

export const keyById = <T extends { id: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]));

/**
 * Props for a base-ui primitive wrapped with a tv() variant definition.
 * Replaces base-ui's render-prop className with a plain string and
 * merges in the variant props from tv().
 */
export type StyledProps<TPrimitive, TVariants extends (...args: any) => any> = Omit<
  TPrimitive,
  "className"
> &
  VariantProps<TVariants> & { className?: string };
