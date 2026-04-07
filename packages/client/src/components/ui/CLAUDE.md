# UI Primitives

Shadcn/Base UI component primitives. Two-tier architecture:

## Tier 1 — Raw shadcn primitives (regenerate freely with CLI)

These are unmodified shadcn output. Do not add app opinions here.

| File | Component | Notes |
|------|-----------|-------|
| `input.tsx` | `Input` | Box-style, Base UI InputPrimitive |
| `textarea.tsx` | `Textarea` | Box-style, raw `<textarea>` |
| `button.tsx` | `Button` | — |
| `checkbox.tsx` | `Checkbox` | — |
| `select.tsx` | `Select`, `SelectTrigger`, … | — |
| `drawer.tsx` | `Drawer`, `DrawerContent`, … | — |

Regenerate any of these with: `npx shadcn@latest add <name> --overwrite`

## Tier 2 — App-level compositions (app opinions live here)

`field.tsx` is the single import for all text-input work in this app:

```ts
import { Field, FieldLabel, FieldDescription, FieldError, Input, Textarea, FormField }
  from "~/components/ui/field"
```

- **`Input`** / **`Textarea`** — app-styled underline variants, composed on top of the raw shadcn primitives. Use these everywhere.
- **`Field`** / **`FieldLabel`** / **`FieldError`** / **`FieldDescription`** — Base UI field wrappers for accessible label association.
- **`FormField`** — TanStack Form integration: wraps Field + FieldLabel + FieldError, wired to a `field` from `useForm`.

## Rules

### Never import raw `Input` or `Textarea` from their primitive files

```ts
// ❌ Wrong — box style, no app language
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"

// ✅ Correct — underline style, app-styled
import { Input, Textarea } from "~/components/ui/field"
```

A lint rule enforces this. The only file that may import from `ui/input` or `ui/textarea` directly is `ui/field.tsx` itself.

### When to use Field vs bare Input

| Pattern | When |
|---------|------|
| `FormField` + `Input` | TanStack Form field — has label, validation, error display |
| `Field` + `FieldLabel` + `Input`/`Textarea` | Static labeled field — no TanStack, but needs accessible label |
| Bare `Input` with `aria-label` | Inline editing only — label is implicit from surrounding UI (e.g. task title). Suppress lint warning with a comment. |

### Abstractions stay out of the `ui/` folder

`ui/` contains only primitives and the field composition. App-level abstractions (e.g. a `TaskTitleInput` or `SearchField`) go in the parent `components/` folder, not here.
