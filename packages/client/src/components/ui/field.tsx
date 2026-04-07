import { Field as FieldPrimitive } from "@base-ui/react/field";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { type ComponentProps, type ReactNode } from "react";

import { cn } from "~/lib/utils";

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
// Input — underline single-line text input (the only input style in this app)
//
// Transparent background, bottom border only: ghost/40 at rest → hint on
// focus. No ring — the border upgrade is the sole focus signal.
// Wraps Base UI Input for accessible label association via Field context.
// ---------------------------------------------------------------------------

const Input = ({ className, ...props }: ComponentProps<"input">) => (
  <InputPrimitive
    data-slot="input"
    className={cn(
      "w-full min-w-0 px-0",
      "rounded-none border-0 border-b bg-transparent",
      "text-foreground outline-none",
      "border-ghost/40 focus-visible:border-hint",
      "focus-visible:ring-0 focus-visible:ring-transparent",
      "placeholder:text-hint",
      "transition-colors duration-150",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
);

// ---------------------------------------------------------------------------
// TextArea — underline multi-line input
//
// Same visual language as Input — no box, bottom border only.
// Base UI has no Textarea primitive; this wraps raw <textarea>.
// ---------------------------------------------------------------------------

const TextArea = ({ className, ...props }: ComponentProps<"textarea">) => (
  <textarea
    data-slot="text-area"
    className={cn(
      "w-full min-w-0 px-0 py-1.5",
      "rounded-none border-0 border-b bg-transparent",
      "text-sm text-foreground outline-none",
      "resize-none",
      "border-ghost/40 focus-visible:border-hint",
      "focus-visible:ring-0",
      "placeholder:text-hint",
      "transition-colors duration-150",
      "disabled:pointer-events-none disabled:opacity-50",
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

export { Field, FieldLabel, FieldDescription, FieldError, Input, TextArea, FormField };
