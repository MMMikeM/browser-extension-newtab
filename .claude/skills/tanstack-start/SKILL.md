---
name: tanstack-start
description: Work with TanStack Start features — server functions, routing, SPA mode, middleware, and the execution model. Use when adding/modifying server functions, routes, loaders, or configuring Start behavior. This project uses @tanstack/react-start in SPA mode for a Firefox extension.
argument-hint: "[task description]"
---

# TanStack Start Skill

This project uses **`@tanstack/react-start`** (NOT `@tanstack/start` which is dead) in **SPA mode** targeting a Firefox MV2 extension.

Your task: $ARGUMENTS

Before starting, read the reference doc:
- `${CLAUDE_SKILL_DIR}/start-reference.md` — execution model, server functions, SPA mode, import protection, extension-specific patterns

## Project context

- **Package**: `@tanstack/react-start` (1.167.x+), requires Vite 7+
- **Mode**: SPA — static prerendered shell + server functions on Fly.io
- **Router**: `@tanstack/react-router` with hash history (required for `moz-extension://` context)
- **Build output**: `dist/client/` (SPA shell), `dist/server/` (server handler)
- **Extension output**: `dist/extension/` (CSP-patched copy of client build)

## Import map (CRITICAL — get these right)

```typescript
// Server functions, createMiddleware
import { createServerFn } from '@tanstack/react-start'

// Client entry
import { StartClient } from '@tanstack/react-start/client'

// Server entry
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

// Vite plugin
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

// Router (HeadContent and Scripts live HERE, not in react-start)
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
```

## Import protection & file naming (CRITICAL)

All code is isomorphic by default — it ends up in BOTH bundles. Use these conventions to control what goes where:

| Pattern | Effect |
|---|---|
| `*.server.*` (e.g. `db.server.ts`) | Blocked from client bundle |
| `*.client.*` (e.g. `analytics.client.ts`) | Blocked from server bundle |
| Files under `server/` directory | Blocked from client bundle |
| Files under `client/` directory | Blocked from server bundle |
| Everything else | Isomorphic — both bundles |

**Directory protection requires vite config** — add `importProtection` to the `tanstackStart` plugin:
```typescript
tanstackStart({
  importProtection: {
    client: { files: ['**/*.server.*', '**/server/**'] },
    server: { files: ['**/*.client.*', '**/client/**'] },
  },
})
```

**Rule of thumb**: If a file imports `node:*` builtins, database clients, or reads `process.env` secrets, it MUST be named `*.server.*` or placed in a `server/` directory.

**Exception**: Server function files (`createServerFn` wrappers) are safe to import anywhere — the bundler replaces handler implementations with RPC stubs in the client bundle.

### Project file conventions

```
src/
  functions/
    tasks.ts              ← server fns (safe anywhere — bundler makes RPC stubs)
  lib/
    db.server.ts          ← server-only: Turso client (import-protected)
    auth.server.ts        ← server-only: token validation (uses node:crypto)
    schema.ts             ← isomorphic: Drizzle table defs (types only, no secrets)
  routes/
    __root.tsx            ← HTML shell with HeadContent/Scripts
    index.tsx             ← main task UI
```

## Key rules

1. **Server functions are the API layer** — use `createServerFn()` for all server logic. They become RPC calls from the client.

2. **Route loaders run on BOTH server and client** — they execute server-side during SSR and client-side during navigation. They are NOT server-only. Never put DB calls or secrets directly in loaders.

3. **Use `.validator()` not `.inputValidator()`** — chain `.validator()` for input validation on server functions.

4. **SPA mode still has a server** — server functions work normally. The "SPA" part is just the prerendered static shell. The server runs on Fly.io handling `/_serverFn/` requests.

5. **Hash history is mandatory** — `moz-extension://` URLs don't match any route. Hash history makes the path `#/` regardless of base URL.

6. **No inline scripts** — Firefox MV2 CSP blocks `script-src 'unsafe-inline'`. The build-extension.ts script handles this, but don't introduce patterns that create inline scripts at runtime.

7. **Entry files are optional** — the Start plugin provides default `client.tsx` and `server.tsx` entries. Only create them if you need to customize.

8. **HeadContent, not Meta** — `Meta` doesn't exist. Use `HeadContent` from `@tanstack/react-router`.
