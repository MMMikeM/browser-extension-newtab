# Client Library (`src/lib/`)

Client-only code. SPA mode means nothing here runs on the server — no `typeof window` or `isServer` guards needed.

## Non-obvious decisions

- **Dynamic import for `add-task.ts`** in `__root.tsx` — avoids pulling `stores.ts` → `auth-token.ts` → `localStorage` into the prerendered shell's module graph. This is load-bearing; making it a static import breaks prerender.
- **`waitForSet: authToken$`** on syncedCrud stores — Legend State won't sync until auth token is set.
- **`sse.ts` vs `push.ts`** — SSE is for browser tabs (always-connected). Push is for when no tabs are open (service worker receives push event). Extension context uses neither — it uses runtime messages from the background page.

## Error handling (Legend State workaround)

Legend State's `onError` `cancelRetry` is broken (the retry state object passed to `onError` is not the same reference as the retry loop's state). Error handling is done in `rpc`/`rpcList` wrappers in `stores.ts` instead:

- **Network errors** (`TypeError`, fetch failures) → rethrow → Legend State retries with exponential backoff
- **App errors** (validation, auth) → `rpcList` returns `[]` (prevents infinite retry), `rpc` rethrows
