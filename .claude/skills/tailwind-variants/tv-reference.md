# Tailwind Variants Reference

## Core API

### `tv()` — define a styled component

```typescript
import { tv } from "tailwind-variants";

const button = tv({
  base: "font-medium rounded-full active:opacity-80",
  variants: {
    color: {
      primary: "bg-blue-500 text-white",
      secondary: "bg-purple-500 text-white",
    },
    size: {
      sm: "text-sm px-3 py-1",
      md: "text-base px-4 py-2",
      lg: "text-lg px-5 py-3",
    },
  },
  defaultVariants: {
    color: "primary",
    size: "md",
  },
  compoundVariants: [
    {
      color: "primary",
      size: "lg",
      class: "shadow-lg shadow-blue-500/50",
    },
  ],
});

// Usage — returns a class string
<button className={button({ color: "secondary", size: "sm" })}>Click</button>

// Override with extra classes
button({ color: "primary", class: "mt-4" })
```

### `cn()` — merge classes with conflict resolution

```typescript
import { cn } from "tailwind-variants";

cn("text-blue-500", "text-red-500");
// => "text-red-500" (conflict resolved)

cn("px-4 py-2", condition && "px-6");
// => "px-6 py-2" if condition is true

cn("base-classes", { "font-bold": isActive, "opacity-50": isDisabled });
```

Replaces `clsx` + `tailwind-merge`. This is the utility for one-off conditional classes on elements that don't need full `tv()`.

### `cx()` — concatenate without conflict resolution

```typescript
import { cx } from "tailwind-variants";

cx("text-blue-500", "text-red-500");
// => "text-blue-500 text-red-500" (both kept)
```

Equivalent to `clsx`. Use `cn()` instead unless you specifically want duplicates.

---

## Slots — multi-element components

```typescript
const card = tv({
  slots: {
    base: "rounded-xl bg-card p-0 shadow",
    header: "p-6 pb-0",
    title: "text-lg font-semibold",
    description: "text-sm text-muted-foreground",
    content: "p-6",
    footer: "p-6 pt-0",
  },
});

// Destructure slot functions
const { base, header, title, content, footer } = card();

// Apply to elements
<div className={base()}>
  <div className={header()}>
    <h3 className={title()}>Title</h3>
  </div>
  <div className={content()}>...</div>
</div>
```

### Slots with variants

Variants apply per-slot styles:

```typescript
const alert = tv({
  slots: {
    root: "rounded py-3 px-5",
    title: "font-bold mb-1",
    message: "text-sm",
  },
  variants: {
    severity: {
      error: {
        root: "bg-red-100",
        title: "text-red-900",
        message: "text-red-700",
      },
      success: {
        root: "bg-green-100",
        title: "text-green-900",
        message: "text-green-700",
      },
    },
  },
});

const { root, title, message } = alert({ severity: "error" });
```

### Compound slots — shared styles across slots

```typescript
const pagination = tv({
  slots: {
    item: "",
    prev: "",
    next: "",
  },
  compoundSlots: [
    {
      slots: ["item", "prev", "next"],
      class: "flex items-center justify-center rounded bg-muted",
    },
    {
      slots: ["item", "prev", "next"],
      size: "md",
      class: "size-9",
    },
  ],
});
```

---

## Compound variants — conditional combinations

```typescript
const button = tv({
  base: "rounded px-4 py-2",
  variants: {
    color: { primary: "bg-primary", danger: "bg-destructive" },
    size: { sm: "text-sm", lg: "text-lg" },
    flat: { true: "shadow-none", false: "shadow-md" },
  },
  compoundVariants: [
    // When multiple variant values match, apply extra classes
    { color: "primary", size: "lg", class: "font-bold uppercase" },
    // Match multiple values with arrays
    { color: ["primary", "danger"], flat: true, class: "border-2" },
  ],
});
```

---

## Extending / composing components

```typescript
const baseButton = tv({
  base: "font-semibold rounded-full px-4 py-2",
  variants: {
    color: {
      primary: "bg-blue-500 text-white",
      neutral: "bg-zinc-200 text-zinc-800",
    },
  },
});

const buyButton = tv({
  extend: baseButton,
  base: "uppercase tracking-wider shadow-lg",
  // Inherits color variants from baseButton
  // Can add new variants or override existing ones
  variants: {
    size: {
      sm: "text-sm",
      lg: "text-lg",
    },
  },
});

// buyButton has both color (inherited) and size (new) variants
buyButton({ color: "primary", size: "lg" });
```

`extend` merges: base, variants, slots, defaultVariants, compoundVariants, compoundSlots.

---

## TypeScript

### VariantProps — extract variant types

```typescript
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  variants: {
    color: { primary: "...", danger: "..." },
    size: { sm: "...", lg: "..." },
  },
});

type ButtonVariants = VariantProps<typeof button>;
// { color?: "primary" | "danger"; size?: "sm" | "lg" }

interface ButtonProps extends ButtonVariants {
  children: React.ReactNode;
}

function Button({ color, size, children }: ButtonProps) {
  return <button className={button({ color, size })}>{children}</button>;
}
```

### Required variants

`VariantProps` makes all variants optional (they have defaults). To require specific ones:

```typescript
interface ButtonProps
  extends Omit<ButtonVariants, "color">, Required<Pick<ButtonVariants, "color">> {
  children: React.ReactNode;
}
```

---

## Configuration

### Per-instance

```typescript
const button = tv({ base: "..." }, { twMerge: false });
```

### Global

```typescript
import { defaultConfig } from "tailwind-variants";
defaultConfig.twMerge = false;
```

### Custom instance

```typescript
import { createTV } from "tailwind-variants";
const tv = createTV({
  twMerge: true,
  twMergeConfig: {/* custom tailwind-merge config */},
});
```

### Lite build (no tailwind-merge)

```typescript
import { tv } from "tailwind-variants/lite";
// ~80% smaller, no conflict resolution
```

---

## Slot override with render props

For components that expose state via render props (React Aria, etc.):

```typescript
const tabs = tv({
  slots: {
    tab: "px-4 py-2",
  },
  variants: {
    isSelected: {
      true: { tab: "bg-primary text-primary-foreground" },
    },
  },
});

const { tab } = tabs();

<Tab className={({ isSelected }) => tab({ isSelected })} />
```

---

## Wrapping base-ui primitives (CRITICAL for this project)

Base-UI primitives define `className` as `string | ((state) => string)` (render prop). `tv()` only accepts strings. **Never cast `className as string`.**

Pattern: `Omit` the render-prop className, re-declare as plain string:

```typescript
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { tv, type VariantProps } from "tailwind-variants"

const buttonVariants = tv({
  base: "...",
  variants: { variant: { ... }, size: { ... } },
  defaultVariants: { variant: "default", size: "default" },
})

// Omit base-ui's className (string | function), re-add as plain string
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

This applies to ALL base-ui primitives: Button, Checkbox, Input, Dialog, Select, etc.

For base-ui components that need state-based styling (e.g. Tabs), use the render prop variant pattern instead:

```typescript
const { tab } = tabs()
<Tab className={({ isSelected }) => tab({ isSelected })} />
```

---

## Migration from CVA + clsx + tailwind-merge

| Before                                           | After                                                           |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `import { cva } from "class-variance-authority"` | `import { tv } from "tailwind-variants"`                        |
| `cva("base", { variants: {...} })`               | `tv({ base: "base", variants: {...} })`                         |
| `import { clsx } from "clsx"`                    | `import { cx } from "tailwind-variants"`                        |
| `twMerge(clsx(...))`                             | `cn(...)` from `tailwind-variants`                              |
| Custom `cn()` in `utils.ts`                      | `cn()` from `tailwind-variants` (re-exported via `~/lib/utils`) |
| `VariantProps` from CVA                          | `VariantProps` from `tailwind-variants`                         |
