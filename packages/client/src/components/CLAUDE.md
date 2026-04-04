# Components

- **`ui/`** — shadcn primitives (button, input, checkbox, drawer, etc.)
- **Top-level** — app components (TaskList, TaskItem, TaskDetail, AddTaskInput, SyncSettings)
- **`TaskDetail`** uses `vaul` drawer (not shadcn drawer)

## Styling

- **`tailwind-variants`**: Use `tv()` + `cn()`. Do NOT use CVA, clsx, or tailwind-merge directly.
- **shadcn/ui**: Uses **Base UI** (base-ui.com, from MUI team), NOT Radix. Use `render`, NOT `asChild`.
