import type { VariantProps } from "tailwind-variants";
export { cn } from "tailwind-variants";

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
