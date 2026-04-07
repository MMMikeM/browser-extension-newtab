import { Field as FieldPrimitive } from "@base-ui/react/field";
import { type ComponentProps, type ReactNode } from "react";

import { cn } from "~/lib/utils";
import { Input as InputPrimitive } from "~/components/ui/input";
import { Textarea as TextareaPrimitive } from "~/components/ui/textarea";

// ---------------------------------------------------------------------------
// Field wrappers — Base UI Field primitives
// ---------------------------------------------------------------------------

const Field = ({ className, ...props }: FieldPrimitive.Root.Props) => (
  <FieldPrimitive.Root
    data-slot="field"
    className={cn("group/field flex flex-col gap-1.5", className)}
    {...props}
  />
);

const FieldLabel = ({ className, ...props }: FieldPrimitive.Label.Props) => (
  <FieldPrimitive.Label
    data-slot="field-label"
    className={cn(
      "text-sm font-medium leading-none group-data-[disabled]/field:cursor-not-allowed group-data-[disabled]/field:opacity-70",
      className,
    )}
    {...props}
  />
);

const FieldDescription = ({ className, ...props }: FieldPrimitive.Description.Props) => (
  <FieldPrimitive.Description
    data-slot="field-description"
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
);

const FieldError = ({ className, ...props }: FieldPrimitive.Error.Props) => (
  <FieldPrimitive.Error
    data-slot="field-error"
    className={cn("text-xs text-destructive", className)}
    {...props}
  />
);

// ---------------------------------------------------------------------------
// Input — app-styled single-line input (underline, no box)
//
// Composed on top of the raw shadcn Input primitive (ui/input.tsx).
// Overrides the box style with the app's underline language:
//   transparent bg, bottom border only, ghost/40 → hint on focus, no ring.
// ---------------------------------------------------------------------------

const Input = ({ className, ...props }: ComponentProps<"input">) => (
  <InputPrimitive
    className={cn(
      // Strip the box style from the primitive
      "rounded-none border-0 border-b shadow-none h-auto py-2",
      "bg-transparent px-0",
      "border-ghost focus-visible:border-hint",
      "focus-visible:ring-0 focus-visible:ring-transparent",
      "placeholder:text-hint",
      className,
    )}
    {...props}
  />
);

// ---------------------------------------------------------------------------
// Textarea — app-styled multi-line input (underline, no box)
//
// Composed on top of the raw shadcn Textarea primitive (ui/textarea.tsx).
// ---------------------------------------------------------------------------

const Textarea = ({ className, ...props }: ComponentProps<"textarea">) => (
  <TextareaPrimitive
    className={cn(
      // Strip the box style
      "rounded-none border-0 border-b shadow-none",
      "min-h-0 bg-transparent px-0 py-1.5",
      "resize-none field-sizing-content",
      "border-ghost focus-visible:border-hint",
      "focus-visible:ring-0",
      "placeholder:text-hint",
      className,
    )}
    {...props}
  />
);

// ---------------------------------------------------------------------------
// TanStack Form integration
// ---------------------------------------------------------------------------

// TanStack Form types ValidationError as `unknown` — Zod surfaces errors as
// ZodIssue objects ({ message: string }) or plain strings depending on how
// the validator is wired. This handles both.
const extractZodError = (error: unknown): string | undefined => {
  if (error == null) return undefined;
  if (typeof error === "string") return error || undefined;
  if (
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message || undefined;
  }
  return undefined;
};

// Minimal structural type — avoids importing TanStack Form generics which
// require all the validator type params to be threaded through.
interface TanstackFieldApi {
  state: {
    meta: {
      isTouched: boolean;
      isValid: boolean;
      isDirty: boolean;
      errors: unknown[];
    };
  };
}

interface FormFieldProps {
  field: TanstackFieldApi;
  label: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

// Wraps Field + FieldLabel + FieldError, wired to a TanStack form field.
// Label ↔ control association and aria-invalid/aria-describedby are handled
// automatically by the Field context — no id/htmlFor/aria-* needed on the
// input.
const FormField = ({ field, label, description, className, children }: FormFieldProps) => {
  const { isTouched, isValid, isDirty, errors } = field.state.meta;
  const isInvalid = isTouched && !isValid;
  const errorMessage = extractZodError(errors[0]);

  return (
    <Field invalid={isInvalid} touched={isTouched} dirty={isDirty} className={className}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError match={isInvalid}>{errorMessage}</FieldError>
    </Field>
  );
};

export { Field, FieldLabel, FieldDescription, FieldError, Input, Textarea, FormField };
