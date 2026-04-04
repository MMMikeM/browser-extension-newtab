# Routes

TanStack Router file-based routes.

## Module graph boundary (prerender safety)

The shell prerender evaluates the root route's module graph. Any static import chain that reaches `localStorage` or `IndexedDB` crashes the prerender. Current strategy:

- `AddTaskInput` — safe to static import (pure component, no store deps)
- `SyncSettings` — lazy imported (pulls in stores → auth-token → localStorage)
- `SyncHint` — lazy imported (same chain)
- `addTask` — dynamic `import()` in callback (pulls in stores)
- `TanStackDevtools` — lazy imported (crashes SSR)

Any new module with module-level `localStorage`/`window` access must guard with `typeof localStorage !== 'undefined'` — the SSR prerender runs in Node.js where these globals don't exist.

The `mounted` state + `useEffect` pattern gates lazy components to prevent hydration mismatches.

## Layout

Layout, heading, input, and settings live in the root `component` — they're shared chrome, not route-specific. Route components render into `<Outlet />`.

## Component conventions

- **One exported component per file.** Don't co-export multiple components from the same file. Helper components that are only used internally (e.g. DnD wrappers) may live in the same file but must not be exported.
- **Exported React components must be function declarations, not arrow expressions.** Use `export function Foo()` not `export const Foo = () =>`. This applies to all exported components only.
