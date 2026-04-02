---
name: shadcn
description: Manages shadcn/ui components — adding, styling, composing UI. Use when working with shadcn components, Tailwind styling, or component registries.
user-invocable: false
---

# shadcn/ui

Components are added as source code via the CLI.

> **This project uses base-ui (`@base-ui/react`).** Components use base-ui APIs — refer to `@base-ui/react` docs and basecn patterns, not generic shadcn examples.

> **CLI runner**: Always use `pnpm dlx shadcn@latest` — this project uses pnpm.

## Project Context

- **Base**: `base` (React Aria primitives) — use `render`, NOT `asChild`
- **Package manager**: pnpm
- **Alias**: `~/` (not `@/`) — check imports after adding components
- **Tailwind**: v4 (`@theme inline` blocks, not `tailwind.config.js`)
- **Framework**: Vite SPA (TanStack Start)
- **Icon library**: Check `components.json` after init

Run `pnpm dlx shadcn@latest info --json` to get current project context.

## Critical Rules

### Styling → [styling.md](./rules/styling.md)

- **`className` for layout, not styling.** Never override component colors/typography.
- **`gap-*` not `space-x/y-*`.** Use `flex` + `gap-*` or `flex flex-col gap-*`.
- **`size-*` when width = height.** `size-10` not `w-10 h-10`.
- **Semantic colors only.** `bg-primary`, `text-muted-foreground` — never `bg-blue-500`.
- **No manual `dark:` overrides.** Semantic tokens handle light/dark.
- **Use `cn()` for conditional classes.**

### Forms → [forms.md](./rules/forms.md)

- **`FieldGroup` + `Field`** for form layout, not raw divs.
- **`data-invalid` on `Field`, `aria-invalid` on the control** for validation.
- **`ToggleGroup`** for 2–7 option sets, not looped Buttons.

### Composition → [composition.md](./rules/composition.md)

- **Items inside Groups.** `SelectItem` → `SelectGroup`.
- **`render` for custom triggers** (base), NOT `asChild` (that's radix).
- **Dialog/Sheet/Drawer need a Title** — use `sr-only` class if hidden.
- **Full Card composition.** `CardHeader`/`CardTitle`/`CardContent`/`CardFooter`.
- **Use `Skeleton`** for loading, `Badge` for status, `Alert` for callouts, `Separator` not `<hr>`.

### Icons → [icons.md](./rules/icons.md)

- **`data-icon` on icons in buttons.** `data-icon="inline-start"` or `"inline-end"`.
- **No sizing classes on icons inside components.** Components handle sizing via CSS.

### Base Primitives (NOT radix)

- **`render` for custom triggers**, NOT `asChild`. See [composition.md](./rules/composition.md).
- **`nativeButton={false}`** when `render` is a non-button element
- **Select** needs `items` prop on root, placeholder via `{ value: null }` item
- **ToggleGroup** uses `multiple` boolean, `defaultValue` is always an array
- **Slider** takes a scalar `defaultValue`, not an array
- **Accordion** uses `defaultValue={["item-1"]}` (array), no `type` or `collapsible`

## Workflow

1. **Search first** — `pnpm dlx shadcn@latest search -q "..."` before writing custom UI
2. **Get docs** — `pnpm dlx shadcn@latest docs <component>` for API and examples
3. **Add** — `pnpm dlx shadcn@latest add button card dialog`
4. **Fix imports** — after adding, replace `@/` with `~/` in all added files
5. **Verify** — read added files, check for missing sub-components, wrong composition, rule violations

## Quick Reference

```bash
pnpm dlx shadcn@latest info --json          # project context
pnpm dlx shadcn@latest search -q "sidebar"  # find components
pnpm dlx shadcn@latest docs button dialog   # get docs URLs
pnpm dlx shadcn@latest add button card      # install components
pnpm dlx shadcn@latest add button --diff    # preview upstream changes
```

## Detailed References

- [rules/forms.md](./rules/forms.md) — FieldGroup, Field, InputGroup, validation
- [rules/composition.md](./rules/composition.md) — Groups, overlays, Card, loading states
- [rules/icons.md](./rules/icons.md) — data-icon, icon sizing
- [rules/styling.md](./rules/styling.md) — semantic colors, spacing, cn()
- [cli.md](./cli.md) — full CLI reference
- [customization.md](./customization.md) — theming, CSS variables
