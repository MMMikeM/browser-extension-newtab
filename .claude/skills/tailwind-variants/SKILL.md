---
name: tailwind-variants
description: Style components with tailwind-variants (tv). Use when creating component variants, slots, compound styles, or replacing CVA/clsx/tailwind-merge patterns.
argument-hint: "[task description]"
---

# Tailwind Variants Skill

Your task: $ARGUMENTS

Before starting, read the reference doc:

- `${CLAUDE_SKILL_DIR}/tv-reference.md` — full API, slots, variants, composition, TypeScript

## Project context

This project uses `tailwind-variants` as the **single styling utility**, replacing:

- `class-variance-authority` (CVA) → use `tv()` with `variants` instead
- `clsx` → use `cx()` from `tailwind-variants`
- `tailwind-merge` → built into `tv()` and `cn()`

`cn` is re-exported from `~/lib/utils` for compatibility with shadcn components:

```typescript
// ~/lib/utils.ts
export { cn } from "tailwind-variants";
```

Import `tv`, `VariantProps`, `cx` directly from `tailwind-variants`. Import `cn` from `~/lib/utils`.

## Key rules

1. **Use `tv()` for any component with variants or multiple styled parts.** Don't use CVA or manual ternaries.

2. **Use slots for multi-element components.** A card with header/body/footer, a form field with label/input/error — these are slots, not separate `tv()` calls.

3. **Use `cn()` for one-off class merging** (conditional classes on a single element). It handles conflict resolution.

4. **Use `cx()` for simple concatenation** without conflict resolution (rare — usually `cn()` is what you want).

5. **Use `extend` to compose components.** A `buyButton` extending a base `button` — don't duplicate styles.

6. **Derive props types with `VariantProps<typeof component>`.** Never hand-type variant props.

7. **Use `compoundVariants` for style combinations.** "When size is lg AND color is primary, add shadow-lg" — not ternaries.

8. **Use `compoundSlots` to apply shared styles across multiple slots** based on variant conditions.

9. **Pass extra classes via `class` key in `tv()` calls**, not `className`:
   ```typescript
   buttonVariants({ variant: "primary", class: className });
   ```

## Base-UI className pattern (CRITICAL)

Base-UI primitives (`@base-ui/react`) define `className` as `string | ((state) => string)` (render prop). `tv()` only accepts strings. When wrapping base-ui primitives:

**Omit the render-prop className, re-add as plain string:**

```typescript
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { tv, type VariantProps } from "tailwind-variants"

const buttonVariants = tv({ base: "...", variants: { ... } })

type ButtonProps = Omit<ButtonPrimitive.Props, "className"> &
  VariantProps<typeof buttonVariants> & {
    className?: string
  }

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      className={buttonVariants({ variant, size, class: className })}
      {...props}
    />
  )
}
```

**Never cast `className as string`** — that hides type mismatches. Always `Omit` + re-declare.

This pattern applies to all base-ui primitives: Button, Checkbox, Input, Dialog, etc.
