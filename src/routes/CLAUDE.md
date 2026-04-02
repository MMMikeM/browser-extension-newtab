# Routes

TanStack Router file-based routes.

## Module graph boundary (prerender safety)

The shell prerender evaluates the root route's module graph. Any static import chain that reaches `localStorage` or `IndexedDB` crashes the prerender. Current strategy:

- `AddTaskInput` — safe to static import (pure component, no store deps)
- `SyncSettings` — lazy imported (pulls in stores → auth-token → localStorage)
- `addTask` — dynamic `import()` in callback (pulls in stores)
- `TanStackDevtools` — lazy imported (crashes SSR)

The `mounted` state + `useEffect` pattern gates lazy components to prevent hydration mismatches.

## Layout

Layout, heading, input, and settings live in the root `component` — they're shared chrome, not route-specific. Route components render into `<Outlet />`.
