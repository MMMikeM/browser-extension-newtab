import { type ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * Underline-style multi-line text input for document-like editing surfaces.
 *
 * Same visual language as TextField — no box, bottom border only.
 * Use for: task descriptions, note editing, any multi-line field that should
 * feel like a document rather than a form.
 *
 * Note: Base UI has no Textarea primitive. This wraps raw <textarea>.
 * For accessible label association, pair with a <label> or Field.Label
 * using an explicit id/htmlFor, or wrap in a Base UI <Field>.
 */
export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="text-area"
      className={cn(
        // Layout
        "w-full min-w-0 px-0 py-1.5",
        // Surface — transparent, no box
        "rounded-none border-0 border-b bg-transparent",
        // Text
        "text-sm text-foreground outline-none",
        // No resize handle — let the consumer set rows or override
        "resize-none",
        // Border: near-invisible at rest, hint on focus
        "border-ghost/40 focus-visible:border-hint",
        // No ring — border is the focus signal
        "focus-visible:ring-0",
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
