import { Field as FieldPrimitive } from "@base-ui/react/field";
import { type ReactNode } from "react";

import { cn } from "~/lib/utils";

// ---------------------------------------------------------------------------
// Primitives
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

// Wraps Field.Root + Field.Label + Field.Error, wired to a TanStack field.
// Field.Label ↔ control association and aria-invalid/aria-describedby are
// handled automatically by the Field context — no id/htmlFor/aria-* needed
// on the input.
const FormField = ({ field, label, description, className, children }: FormFieldProps) => {
  const { isTouched, isValid, isDirty, errors } = field.state.meta;
  const isInvalid = isTouched && !isValid;
  const errorMessage = extractZodError(errors[0]);

  return (
    <Field invalid={isInvalid} touched={isTouched} dirty={isDirty} className={className}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {/* match={isInvalid} hands visibility control to us: true = show, false = hide */}
      <FieldError match={isInvalid}>{errorMessage}</FieldError>
    </Field>
  );
};

export { Field, FieldLabel, FieldDescription, FieldError, FormField };
