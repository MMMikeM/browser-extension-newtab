# New Tab Todo

Personal task tracker Firefox extension replacing the new tab page. Single user, 2-3 machines, backend on Fly.io.

## Architecture

See `docs/architecture.md` for the full spec. Key points:

- **Extension**: MV2 Firefox extension, sideloaded (not AMO). Replaces new tab with a TanStack Start SPA.
- **Backend**: TanStack Start server functions on Fly.io, Turso (libSQL) database, static bearer token auth.
- **Stack**: TypeScript, React 19, TanStack Start (SPA mode), TanStack Router, TanStack Query, Vite 8.

## Spike Results (validated 2026-03-26)

A working spike lives at `../newtab-todo-spike/` — it confirmed the architecture works. Here are the critical findings that MUST be followed:

### Package versions — `@tanstack/start` is DEAD

- The package `@tanstack/start` is capped at 1.120.20 and no longer maintained.
- Use `@tanstack/react-start` (currently 1.167.x) which requires **Vite 7+** (no vinxi).
- Config goes in `vite.config.ts` via `tanstackStart()` from `@tanstack/react-start/plugin/vite`.
- Import map:
  - `@tanstack/react-start` — `createServerFn`, `Meta` is gone (use `HeadContent` from `@tanstack/react-router`)
  - `@tanstack/react-start/client` — `StartClient`
  - `@tanstack/react-start/server` — `createStartHandler`, `defaultStreamHandler`
  - `@tanstack/react-start/plugin/vite` — `tanstackStart` vite plugin

### SPA mode config

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000'

export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          outputPath: '/index.html',
        },
      },
    }),
    // Override server function base URL for client only.
    // MUST come after tanstackStart. MUST use environments.client.define
    // to avoid breaking server-side routing (server needs relative /_serverFn/).
    {
      name: 'extension-server-fn-base',
      config() {
        return {
          environments: {
            client: {
              define: {
                'process.env.TSS_SERVER_FN_BASE': JSON.stringify(`${SERVER_URL}/_serverFn/`),
                'import.meta.env.TSS_SERVER_FN_BASE': JSON.stringify(`${SERVER_URL}/_serverFn/`),
              },
            },
          },
        }
      },
      enforce: 'post',
    },
  ],
})
```

### Router MUST use hash history

In `moz-extension://` context, the URL is `moz-extension://<uuid>/index.html` which doesn't match any route. Hash history makes the path `#/` regardless of the base URL.

```typescript
// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { createHashHistory, createMemoryHistory } from '@tanstack/history'
import { routeTree } from './routeTree.gen'

const isServer = typeof window === 'undefined'

const router = createRouter({
  routeTree,
  history: isServer
    ? createMemoryHistory({ initialEntries: ['/'] })
    : createHashHistory(),
})

export function getRouter() {
  return router
}
```

### Root route uses HeadContent, not Meta

```typescript
// src/routes/__root.tsx
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
// NOT from '@tanstack/react-start' — Meta and Scripts moved to react-router
```

### Entry files are optional

The Start plugin has default entries for `client.tsx` and `server.tsx`. You only need `src/router.tsx` and `src/routes/`. The default source directory is `src/`.

### MV2 CSP: inline scripts are BLOCKED

Firefox MV2 extensions enforce `script-src 'self'` — no `'unsafe-inline'` allowed (Firefox rejects it). The Start SPA build produces inline `<script>` tags that must be externalized.

Additionally, the TSR hydration manifest contains `children:"import(\"...\")\"` entries that cause the `Asset` component to create inline scripts at runtime via `document.createElement('script'); script.textContent = ...` — also blocked by CSP.

**Fix**: A post-build script (`scripts/build-extension.ts`) must:
1. Extract all inline `<script>` tags to external `.js` files
2. Patch the TSR manifest to replace `children:"import(\"<path>\")"` with `src:"<path>"` in the attrs object — this makes the Asset component use the CSP-safe `createElement('script'); script.src = ...` code path instead.

The regex for the manifest patch:
```typescript
content.replace(
  /,async:(!0|true)\},children:"import\(\\"([^"]+)\\"\)"\}/g,
  (_m, asyncVal, importPath) => `,async:${asyncVal},src:"${importPath}"}}`
)
```

### CORS for extension → server

The production server MUST set these headers for `moz-extension://` origins:
```
Access-Control-Allow-Origin: <the moz-extension:// origin>
Access-Control-Allow-Headers: content-type, x-tsr-serverFn, accept
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Expose-Headers: x-tss-serialized, x-tss-raw
```

**Critical**: `Access-Control-Expose-Headers` is required. Without it, the browser hides the `x-tss-serialized` header from JavaScript, causing Start's client to skip seroval deserialization and return `undefined` from all server functions.

### Build pipeline

```
vite build                          → dist/client/ (SPA shell + assets)
                                    → dist/server/ (server handler)
scripts/build-extension.ts          → dist/extension/ (CSP-safe extension files + manifest)
```

The `dist/server/server.js` is a handler module (exports `{ fetch }`), not a standalone server. It needs a wrapper that starts an HTTP listener — see `scripts/serve-prod.ts` in the spike.

### Extension manifest

```json
{
  "manifest_version": 2,
  "name": "New Tab Todo",
  "version": "1.0.0",
  "browser_specific_settings": {
    "gecko": { "id": "newtab-todo@local" }
  },
  "chrome_url_overrides": {
    "newtab": "index.html"
  },
  "content_security_policy": "script-src 'self'; object-src 'self'",
  "permissions": [
    "storage",
    "https://your-app.fly.dev/*"
  ]
}
```

## Dev workflow

- `npm run dev` — vite dev server (full SSR + server functions, for browser tab testing)
- `npm run build` — full build + extension assembly
- `npm start` — production server (for testing extension → server fn calls)
- Load `dist/extension/` via `about:debugging` → This Firefox → Load Temporary Add-on

## Project structure

```
src/
  router.tsx              ← router with hash history
  routes/
    __root.tsx            ← HTML shell with HeadContent/Scripts
    index.tsx             ← main task UI
  functions/
    tasks.ts              ← server functions (getTasks, createTask, etc.)
  lib/
    db.ts                 ← Turso client (@libsql/client)
    auth.ts               ← bearer token middleware
extension/
  manifest.json           ← MV2 manifest (source, copied to dist)
scripts/
  build-extension.ts      ← post-build CSP patching
  serve-prod.ts           ← production server wrapper
docs/
  architecture.md         ← full architecture spec
```
