# TanStack Start Reference (for this project)

## Execution Model

### Core principle

All code in TanStack Start is **isomorphic by default** — it runs in both server and client bundles unless explicitly constrained. You must consciously choose execution boundaries.

### Environments

- **Server** (Node.js): file system, DB, env vars. Runs during SSR and API requests.
- **Client** (browser): DOM, localStorage, user interaction. Runs after hydration.

### Route loaders are NOT server-only

Loaders are isomorphic — they run server-side during SSR AND client-side during navigation. Never put secrets or DB calls directly in loaders. Use server functions instead.

### Execution control APIs

| API                    | Where it runs                     | Use for                     |
| ---------------------- | --------------------------------- | --------------------------- |
| `createServerFn()`     | Server only (RPC from client)     | DB ops, mutations, env vars |
| `createIsomorphicFn()` | Both, with different impls        | Platform-specific logic     |
| `ClientOnly` component | Client only (fallback during SSR) | Browser-dependent UI        |
| `useHydrated()` hook   | Returns true after hydration      | Timezone, localStorage deps |

### Import protection (enabled by default)

Import protection prevents server code from leaking into the client bundle and vice versa. It operates on **resolved file paths** and **import specifiers**.

**File naming conventions — these are enforced by the bundler:**

| File pattern                                         | Effect                                |
| ---------------------------------------------------- | ------------------------------------- |
| `*.server.*` (e.g. `db.server.ts`, `auth.server.ts`) | Blocked from client bundle            |
| `*.client.*` (e.g. `analytics.client.ts`)            | Blocked from server bundle            |
| Any other name (e.g. `tasks.ts`, `utils.ts`)         | Isomorphic — included in BOTH bundles |

**Directory conventions — use this project's vite config to enforce:**

This project denies entire directories in addition to file patterns. In `vite.config.ts`, the `tanstackStart` plugin is configured with:

```typescript
tanstackStart({
  importProtection: {
    client: {
      files: ["**/*.server.*", "**/server/**"],
    },
    server: {
      files: ["**/*.client.*", "**/client/**"],
    },
  },
});
```

This means:

- Files anywhere under a `server/` directory are blocked from the client bundle
- Files anywhere under a `client/` directory are blocked from the server bundle
- Combined with file patterns: `db.server.ts` OR `server/db.ts` — both are server-only

**Side-effect marker imports — for explicit protection on any file:**

```typescript
import "@tanstack/react-start/server-only"; // marks this file as server-only
import "@tanstack/react-start/client-only"; // marks this file as client-only
```

**Behavior:**

- **Dev**: violations are mocked with a recursive Proxy + warning logged
- **Build**: violations fail the build with an error

**Practical guidance for this project:**

```
src/
  functions/
    tasks.ts          ← Server functions (safe to import anywhere — bundler
                        replaces with RPC stubs in client bundle)
  lib/
    db.ts             ← ⚠️ ISOMORPHIC by name! Rename to db.server.ts
                        or put in a server/ directory
    auth.ts           ← ⚠️ Same — uses node:crypto, should be db.server.ts
    schema.ts         ← Drizzle schema (type-only, safe as isomorphic)
```

**Rule of thumb**: If a file imports `node:*` builtins, database clients, or reads `process.env` secrets — it MUST be either:

1. Named `*.server.*`, OR
2. Placed in a `server/` directory, OR
3. Have `import '@tanstack/react-start/server-only'` at the top

---

## Server Functions

### createServerFn API

```typescript
import { createServerFn } from "@tanstack/react-start";

// Basic GET
export const getData = createServerFn({ method: "GET" }).handler(async () => {
  return { message: "hello" };
});

// POST with validation
export const createItem = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const d = input as { title: string };
    if (!d.title) throw new Error("title required");
    return d;
  })
  .handler(async ({ data }) => {
    // data is typed from validator return
    return { id: "123", title: data.title };
  });
```

### Method types

- **GET** (default): Read operations. Data sent as query params.
- **POST**: Write operations. Data sent as request body.

### Chaining

```typescript
createServerFn({ method: "POST" })
  .middleware([authMiddleware]) // optional middleware chain
  .validator(schema) // optional input validation
  .handler(async ({ data, context }) => {
    // data = validated input
    // context = accumulated middleware context
  });
```

### Calling server functions

```typescript
// Direct call (from components, loaders, other server fns)
const result = await getData();

// With input
const result = await createItem({ data: { title: "New item" } });

// With useServerFn hook (for use in components)
import { useServerFn } from "@tanstack/react-start";
const fn = useServerFn(createItem);
await fn({ data: { title: "New item" } });
```

### From route loaders

```typescript
export const Route = createFileRoute("/posts")({
  loader: () => getPosts(),
});
```

### Error handling

```typescript
// Throw errors — they serialize across the network boundary
export const riskyFn = createServerFn().handler(async () => {
  throw new Error("Something broke");
});

// Redirects
import { redirect } from "@tanstack/react-router";
throw redirect({ to: "/login" });
```

### File organization

```
src/functions/
  tasks.ts           ← createServerFn wrappers (safe to import anywhere —
                        bundler replaces with RPC stubs in client bundle)
src/lib/
  db.server.ts       ← server-only: DB client (import-protected by *.server.* pattern)
  auth.server.ts     ← server-only: token validation (uses node:crypto)
  schema.ts          ← isomorphic: Drizzle schema (type definitions, safe in both bundles)
```

Server function files (`createServerFn` wrappers) are safe to import from client code. The bundler strips the handler implementation and replaces it with an RPC stub. The `.server.*` convention is for **non-server-function** server code (DB clients, helpers, secrets).

---

## SPA Mode

### Configuration

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          outputPath: "/index.html", // customize shell output path
        },
      },
    }),
  ],
});
```

### How it works

1. Build prerenders only the root route as a static shell
2. Shell shows the router's pending fallback where routes would render
3. After hydration, router navigates to the matched route
4. Server functions still work — they're HTTP calls to the server

### What SPA mode changes

- No SSR at runtime — the shell is static HTML
- Server functions are the only server-side code that executes at runtime
- Deployment: static files (CDN) + server (Fly.io for server functions)

### Shell detection

```typescript
const isShell = useRouter().isShell();
```

---

## Extension-Specific Patterns

### Server function base URL override

The extension needs to reach the Fly.io server for server functions. Override `TSS_SERVER_FN_BASE` for client only (server needs relative `/_serverFn/`):

```typescript
// vite.config.ts — MUST come after tanstackStart plugin
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
}
```

### Hash history (required)

```typescript
import { createRouter } from "@tanstack/react-router";
import { createHashHistory, createMemoryHistory } from "@tanstack/history";

const router = createRouter({
  routeTree,
  history:
    typeof window === "undefined"
      ? createMemoryHistory({ initialEntries: ["/"] })
      : createHashHistory(),
});
```

### CSP compliance

Firefox MV2 blocks inline scripts. The `scripts/build-extension.ts` post-build script:

1. Extracts `<script>` tags with inline content to external `.js` files
2. Patches TSR hydration manifest: replaces `children:"import(\"...\")"` with `src:"..."` to use CSP-safe external script loading

### CORS headers (production server)

The server MUST set these for `moz-extension://` origins:

```
Access-Control-Allow-Origin: <moz-extension:// origin>
Access-Control-Allow-Headers: content-type, x-tsr-serverFn, accept
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Expose-Headers: x-tss-serialized, x-tss-raw
```

**Critical**: Without `Access-Control-Expose-Headers`, the browser hides `x-tss-serialized` from JS, causing Start's client to skip seroval deserialization → all server functions return `undefined`.

---

## Root Route Pattern

```typescript
// src/routes/__root.tsx
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
// HeadContent and Scripts come from react-router, NOT react-start
// Meta does NOT exist — use HeadContent

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Page Title' },
    ],
  }),
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
```

---

## Build Pipeline

```
vite build
  → dist/client/          (SPA shell + JS/CSS assets)
  → dist/server/          (server handler, exports { fetch })

scripts/build-extension.ts
  → .output/extension/    (CSP-safe copy + manifest.json)
```

The server handler (`dist/server/server.js`) is NOT a standalone server. It exports `{ fetch }`. The `scripts/serve-prod.ts` wraps it in a Node HTTP server.

---

## Prerender Module Graph Boundary

### The problem

In SPA mode, the build prerenders the root route's module graph to produce the static shell. This prerender runs in a Node-like environment where browser globals (`localStorage`, `IndexedDB`, `window`) do not exist. If any **static import chain** from the root route reaches code that accesses these globals at module scope (e.g., Legend State stores that read `localStorage` during initialization), the prerender crashes.

### The rule

Every static import from a route file must be **transitively pure** -- no module in the chain may touch browser-only globals at the top level. If a module (or anything it imports) accesses `localStorage`, `IndexedDB`, or similar browser APIs at import time, it **must not** be statically imported.

### Three strategies

| Strategy | When to use | Example |
| --- | --- | --- |
| **Static import** | Component is pure -- no store deps, no browser globals in its import chain | `import { AddTaskInput } from '~/components/AddTaskInput'` |
| **`lazy()` + Suspense** | Component pulls in stores or browser-only code, but is rendered as a React element | `const SyncSettings = lazy(() => import('~/components/SyncSettings').then(...))` |
| **Dynamic `import()` in callback** | Store/browser code needed imperatively (not rendered), e.g., inside an event handler | `const { addTask } = await import('~/lib/add-task')` |

### Guarding lazy components

Lazy components must be gated behind a `mounted` state to prevent hydration mismatches. The shell renders without them; after hydration, `useEffect` flips `mounted` to true and the lazy component loads:

```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);

// In JSX:
{mounted && (
  <Suspense fallback={<Spinner />}>
    <LazyComponent />
  </Suspense>
)}
```

### Current root route example

```typescript
// src/routes/__root.tsx

// SAFE static imports -- these modules are transitively pure
import { AddTaskInput } from "~/components/AddTaskInput";
import appCss from "../app.css?url";

// LAZY -- SyncSettings pulls in stores -> auth-token -> localStorage
const SyncSettings = lazy(() =>
  import("~/components/SyncSettings").then((m) => ({ default: m.SyncSettings })),
);

// LAZY -- TanStackDevtools crashes in SSR/prerender
const TanStackDevtools = lazy(() =>
  import("@tanstack/react-devtools").then((m) => ({ default: m.TanStackDevtools })),
);

// DYNAMIC import() in callback -- addTask pulls in stores
const handleAddTask = useCallback(async (title: string) => {
  const [{ addTask }, { activeCategoryId$ }] = await Promise.all([
    import("~/lib/add-task"),
    import("~/lib/active-category"),
  ]);
  addTask(title, activeCategoryId$.peek());
}, []);
```

### Debugging a prerender crash

If the build fails during prerender with a `ReferenceError` for `localStorage`, `indexedDB`, or `window`:

1. Find the offending import chain -- the stack trace shows which module accessed the global
2. Trace backwards to the route file that statically imports it
3. Convert the import to `lazy()` (if it is a component) or dynamic `import()` (if it is imperative code)
4. Verify with `pnpm build` -- the prerender must complete without errors

---

## Common Mistakes to Avoid

1. **Importing from `@tanstack/start`** — this package is dead. Use `@tanstack/react-start`.
2. **Using `Meta` component** — doesn't exist. Use `HeadContent` from `@tanstack/react-router`.
3. **Putting DB calls in loaders** — loaders are isomorphic. Use server functions.
4. **Using `process.env` in client code** — will be undefined. Use server functions or Vite's `define`.
5. **Creating custom client.tsx/server.tsx** — not needed unless customizing. The plugin has defaults.
6. **Forgetting CORS Expose-Headers** — server functions will silently return undefined.
7. **Using browser history** — must use hash history for `moz-extension://` context.
