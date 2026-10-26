# Routes

TanStack Router file-based routes.

## Module graph boundary (prerender safety)

The shell prerender evaluates the root route's module graph. Any static import chain that reaches `localStorage` or `IndexedDB` crashes the prerender. Current strategy:

- `AddTaskInput` — safe to static import (pure component, no store deps)
- `SyncSettings` — static import; its chain (stores → auth-token → localStorage) guards every module-level access, and it renders inside `ClientOnly`
- `SyncHint` — lazy imported (same chain)
- `addTask` — dynamic `import()` in callback (pulls in stores)
- `TanStackDevtools` — lazy imported (crashes SSR)

The list layout (`_list.tsx`, with `/` and `/task/$taskId` under it in `_list/`) is static, not `.lazy`: every new tab opens on it, and lazy loading it made the task list wait for a second round of chunk loading (about 10ms at 4× CPU in `startup-bench.ts`). Its import graph therefore runs in the prerender too.

Any new module with module-level `localStorage`/`window` access must guard with `typeof localStorage !== 'undefined'` — the SSR prerender runs in Node.js where these globals don't exist.

The `mounted` state + `useEffect` pattern gates lazy components to prevent hydration mismatches.

## Layout

Nested routes live in folders, with a layout as the file named after its folder, never `route.tsx`. The list page is the pathless `_list.tsx` layout, so an open task (`/task/$taskId`) sheets over the list without remounting it. The open list stays on the device rather than in the URL; `/list/$listId` switches to one and lands on `/`. Search is the same shape, lazy: `search.lazy.tsx` holds the field, query and results, and `/search/task/$taskId` sheets a task over them, so closing it keeps the query. Both sheets are `TaskSheet`.

Layout, heading, input, and settings live in the root `component` — they're shared chrome, not route-specific. Route components render into `<Outlet />`.

## Component conventions

- **One exported component per file.** Don't co-export multiple components from the same file. Helper components that are only used internally (e.g. DnD wrappers) may live in the same file but must not be exported.
- **Exported React components must be function declarations, not arrow expressions.** Use `export function Foo()` not `export const Foo = () =>`. This applies to all exported components only.
