# New Tab Todo

## Rules

- **Never commit without explicit user permission.** Always ask before committing.
- **Always invoke the relevant skill before writing code that touches its domain.** Don't write Drizzle queries without invoking the drizzle skill. Don't write Legend State code without invoking the legend-state skill. No exceptions — read the reference first, then write code.
- **Use static imports by default.** Dynamic `import()` is only acceptable when explicitly needed (e.g., breaking circular deps, lazy-loading heavy modules). Always add a comment explaining why.

## Sync rules

- **Background sync must ALWAYS work, in EVERY context, even when no tabs are open.** IDB must be pre-warmed with the latest server data before the user opens a tab. Stale-on-open is not acceptable.
- **Extension context**: Persistent MV2 background page holds the sync connection. This is the ONLY way to sync when no extension tabs are open.
- **Browser/PWA context**: Service worker + Web Push is the ONLY way to sync when no browser tabs are open. Service workers CANNOT use EventSource/SSE — push notifications are the only viable mechanism.
- **Never propose removing a background sync mechanism** unless you have a replacement that provides equivalent always-on background sync in that context.

## Spike traps

### Router MUST use hash history

`moz-extension://` URLs don't match routes. Hash history makes path `#/`.

### MV2 CSP: inline scripts are BLOCKED

`packages/client/vite.extension.config.ts` handles the extension build (`pnpm build:ext`). Inline scripts must be extracted.

## Stack

Hono (server) + Vite (client) + React 19 + TanStack DB/Router/Query + Drizzle v1 (Turso/libSQL). Dual target: browser extension (MV2) + PWA.

## Monorepo structure

pnpm workspaces + Turborepo. Three packages:

- `packages/shared` — shared types/constants (`MutationEvent`, `ModelName`, `ISODateString`)
- `packages/server` — Hono API, Drizzle ORM, all server deps
- `packages/client` — Vite SPA, React, TanStack, extension build

Cross-package imports use `@newtab-todo/shared` and `@newtab-todo/server` (type-only for client).

## Dev workflow

- `pnpm dev` / `pnpm build` / `pnpm build:ext` / `pnpm start`
- `pnpm lint` / `pnpm fmt` — oxlint / oxfmt
- `pnpm typecheck` — tsc --noEmit (via turbo)
- `pnpm check` — typecheck + lint + fmt + knip (CI gate)
- `pnpm --filter @newtab-todo/server db:push` — push schema to Turso
