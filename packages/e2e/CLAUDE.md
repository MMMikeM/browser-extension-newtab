# E2E Tests (`packages/e2e`)

Playwright test suite. Two projects: `desktop` (Chrome) and `mobile` (iPhone 14 via Chromium).

## Entry points

- `*.spec.ts` — Playwright test files, picked up automatically
- `screenshot.ts` — standalone script (`pnpm screenshot`), captures viewport screenshots + axe contrast audit
- `filmstrip.ts` — standalone script, CDP screencast during page load

## Helpers (`helpers/`)

| File            | What it exports                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| `users.ts`      | `USER_1`, `USER_2` — dedicated e2e accounts (Alice / Bob)                                                     |
| `auth.ts`       | `getOrCreateUser(user)` — signup on first run, login thereafter; `signIn(page, auth)` — seeds localStorage    |
| `api.ts`        | `apiRequest()` — raw fetch with Bearer token; `deleteAllTasksInCategory(token, categoryId)`                   |
| `app.ts`        | `waitForAppReady`, `createTask`, `createCategory`, `clearLocalStorage`, `clearIDB`                            |
| `sync.ts`       | `createSyncTracker(page)` — tracks non-GET `/api/*` mutations, exposes `waitForSync()` + `assertNoFailures()` |
| `screenshot.ts` | `takeScreenshot`, `forBothViewports`, `reportViolations` — used by the screenshot script                      |

## Fixtures (`fixtures.ts`)

Import `test` and `expect` from here instead of `@playwright/test` to get the custom fixtures:

- `appPage` — navigated to `/` and ready (unauthenticated)
- `user1Auth` / `user2Auth` — resolved `AuthResult` objects
- `user1Page` — signed in as USER_1 (default context)
- `user2Page` — signed in as USER_2 in an **isolated browser context** — use alongside `user1Page` for cross-user tests
- `syncTracker` — auto-calls `assertNoFailures()` in teardown

## Test users

`USER_1` / `USER_2` are created via `POST /api/auth/signup` on first run and reused (login) on subsequent runs. They are persistent accounts in the dev/staging DB — do not rely on them having a clean task list between runs; use `deleteAllTasksInCategory` in `beforeEach` if isolation matters.

## Non-obvious decisions

- **`user2Page` uses a separate `browser.newContext()`** so localStorage is not shared with `user1Page`. This is required for cross-user isolation; plain `page` instances share the same context and therefore the same origin storage.
- **`waitForSync` polls, not `networkidle`** — the app holds a persistent SSE connection which keeps `networkidle` from ever resolving.
- **`createCategory` has two variants** — desktop uses `placeholder="Name..."`, mobile sheet uses `placeholder="Category name..."`. Pass `"sidebar"` or `"sheet"` accordingly.
