# Client Library (`src/lib/`)

Client-only code. SPA — no `typeof window` or `isServer` guards needed.

## SSR prerender safety

Any module that accesses `localStorage`, `window`, or browser-only APIs (`OPFS`, `IndexedDB`) at **module init time** (top-level code) must guard with `typeof localStorage !== 'undefined'` / `typeof window !== 'undefined'`. The SSR prerender runs in Node.js where these globals don't exist. Function bodies are fine — only top-level statements matter.

## Structure

- **`db/`** — TanStack DB layer: `collections.ts`, `hooks.ts` (useLiveQuery + mutations), `offline.ts` (offline executor), `add-task.ts`
- **`sync/`** — Live sync mechanisms: `sse.ts` (browser tab SSE), `push.ts` (Web Push), `register-sw.ts`
- **`auth/`** — Identity: `token.ts` (auth token store), `current-user.ts`
- **`state/`** — App UI state: `active-category.ts`, `undo.ts`
- **`hooks/`** — Standalone React hooks: `use-install-prompt.ts`, `use-swipe-reveal.ts`
- **`constants.ts`** — re-exports from `@newtab-todo/shared`

## Non-obvious decisions

- **`sse.ts` vs `push.ts`** — SSE is for browser tabs (always-connected). Push is for when no tabs are open (service worker receives push event). Extension context uses neither — it uses runtime messages from the background page.
