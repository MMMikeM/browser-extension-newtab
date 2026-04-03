# Client Library (`src/lib/`)

Client-only code. SPA — no `typeof window` or `isServer` guards needed.

## Structure

- **`collections.ts`** — TanStack DB collections with offline persistence
- **`hooks.ts`** — React hooks for collections + optimistic mutation helpers
- **`offline.ts`** — Offline transaction sync functions
- **`sse.ts`** / **`push.ts`** / **`active-category.ts`** / **`auth-token.ts`** — standalone client modules
- **`constants.ts`** — re-exports from `@newtab-todo/shared`

## Non-obvious decisions

- **`sse.ts` vs `push.ts`** — SSE is for browser tabs (always-connected). Push is for when no tabs are open (service worker receives push event). Extension context uses neither — it uses runtime messages from the background page.
