import type { VariantProps } from "tailwind-variants";
import type { ISODateString } from "@newtab-todo/shared/iso";
export { cn } from "tailwind-variants";

export const now = (): ISODateString => new Date().toISOString() as ISODateString;

/**
 * Props for a base-ui primitive wrapped with a tv() variant definition.
 * Replaces base-ui's render-prop className with a plain string and
 * merges in the variant props from tv().
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StyledProps<TPrimitive, TVariants extends (...args: any[]) => unknown> = Omit<
  TPrimitive,
  "className"
> &
  VariantProps<TVariants> & { className?: string };
