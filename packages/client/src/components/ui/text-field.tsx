import { Input as InputPrimitive } from "@base-ui/react/input";
import { type ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * Underline-style single-line text input for document-like editing surfaces.
 *
 * Use for: task titles, inline field editing, any surface where the input
 * should feel like editable text rather than a form widget.
 *
 * Contrast with `Input` (ui/input.tsx) which uses a box style — keep that
 * for auth forms and sidebar inputs where a discrete container is appropriate.
 *
 * Matches the AddTaskInput visual language:
 * - Transparent background, no box
 * - Bottom border only: ghost/40 at rest → hint on focus
 * - Placeholder in --hint colour
 * - No focus ring — border upgrade is the only focus signal
 */
export function TextField({ className, ...props }: ComponentProps<"input">) {
  return (
    <InputPrimitive
      data-slot="text-field"
      className={cn(
        // Layout
        "w-full min-w-0 px-0",
        // Surface — transparent, no box
        "rounded-none border-0 border-b bg-transparent",
        // Text
        "text-foreground outline-none",
        // Border: near-invisible at rest, hint on focus
        "border-ghost/40 focus-visible:border-hint",
        // No ring — border is the focus signal
        "focus-visible:ring-0 focus-visible:ring-transparent",
        // Placeholder uses --hint (contrast-safe secondary token)
        "placeholder:text-hint",
        // Transition
        "transition-colors duration-150",
        // Disabled
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
