# New Tab Todo

## Rules

- **Never commit without explicit user permission.** Always ask before committing.
- **Always invoke the relevant skill before writing code that touches its domain.** Don't write Drizzle queries without invoking the drizzle skill. Don't write Legend State code without invoking the legend-state skill. Don't write TanStack Start server functions without invoking the tanstack-start skill. No exceptions — read the reference first, then write code.
- **Use static imports by default.** Dynamic `import()` is only acceptable when explicitly needed (e.g., breaking circular deps, lazy-loading heavy modules for prerender safety). Always add a comment explaining why.

## Sync rules

- **Background sync must ALWAYS work, in EVERY context, even when no tabs are open.** IDB must be pre-warmed with the latest server data before the user opens a tab. Stale-on-open is not acceptable.
- **Extension context**: Persistent MV2 background page holds the sync connection. This is the ONLY way to sync when no extension tabs are open.
- **Browser/PWA context**: Service worker + Web Push is the ONLY way to sync when no browser tabs are open. Service workers CANNOT use EventSource/SSE — push notifications are the only viable mechanism.
- **Never propose removing a background sync mechanism** unless you have a replacement that provides equivalent always-on background sync in that context.

## Spike traps (validated 2026-03-26)

A working spike lives at `../newtab-todo-spike/`. These are non-obvious gotchas:

### `@tanstack/start` is DEAD

Use `@tanstack/react-start` (1.167.x+). Import map:

- `@tanstack/react-start` — `createServerFn`, `createMiddleware`
- `@tanstack/react-start/server` — `getRequestHeader`
- `@tanstack/react-start/client` — `StartClient`
- `@tanstack/react-start/plugin/vite` — `tanstackStart`
- `@tanstack/react-router` — `HeadContent`, `Scripts` (NOT from react-start)

### Router MUST use hash history

`moz-extension://` URLs don't match routes. Hash history makes path `#/`.

### MV2 CSP: inline scripts are BLOCKED

`vite.extension.config.ts` handles the extension build (`pnpm build:ext`). Inline scripts must be extracted and the TSR hydration manifest patched.

### `Access-Control-Expose-Headers` required

Without it, all server functions return `undefined`.

## Stack

TanStack Start (SPA mode) + React 19 + Legend State + Drizzle v1 (Turso/libSQL). Dual target: browser extension (MV2) + PWA.

## Dev workflow

- `pnpm dev` / `pnpm build` / `pnpm build:ext` / `pnpm start`
- `pnpm lint` / `pnpm fmt` — oxlint / oxfmt
- `pnpm typecheck` — tsc --noEmit
- `pnpm check` — lint + fmt + typecheck + knip (CI gate)
- `npx drizzle-kit push` — push schema to Turso