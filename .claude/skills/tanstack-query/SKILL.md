---
name: tanstack-query
description: Work with TanStack Query — data fetching, mutations, optimistic updates, cache management. Use when adding/modifying queries, mutations, or optimistic update patterns in this project.
argument-hint: "[task description]"
---

# TanStack Query Skill

Your task: $ARGUMENTS

Before starting, read the reference doc:

- `${CLAUDE_SKILL_DIR}/query-reference.md` — patterns, optimistic updates, cache management

## Project context

- **Package**: `@tanstack/react-query` v5
- **Query client**: Created in `src/routes/__root.tsx` with staleTime 30s, refetchOnWindowFocus, networkMode offlineFirst
- **Hooks**: `src/lib/hooks.ts` — custom hooks wrapping server functions
- **Server functions**: `src/functions/tasks.ts` — TanStack Start server functions with auth middleware

## Key rules

1. **Use `queryOptions()` to define queries** — define once, reuse for `useQuery`, `getQueryData`, `setQueryData`, `invalidateQueries`, `cancelQueries`. Types flow through automatically — never pass generics to `getQueryData`/`setQueryData`.

2. **Prefer UI-based optimistic updates** over cache manipulation. Use `useMutation`'s `variables` + `isPending` in the render. Less code, no rollback logic, easier to reason about.

3. **Use cache-based optimistic updates only when**: multiple components need to see the update, or the UI approach doesn't fit (e.g. complex list reordering).

4. **Use `onSuccess` + `setQueryData` for mutation responses** — when the server returns the updated data, use it directly instead of refetching. Don't waste a network call for data you already have.

5. **Don't hand-roll types** — derive `Task` type from query return: `type Task = Awaited<ReturnType<typeof getTasks>>[number]`. Derive mutation input types from Drizzle's `createInsertSchema`/`createUpdateSchema`.

6. **Pass server functions directly as `mutationFn`** — don't wrap in `(input) => fn({ data: input })`. The Fetcher signature works directly. Note: `onMutate` receives `{ data, headers }` (the full fetcher options), not just the data — destructure with `({ data })`.

7. **Auth goes in middleware, not in hooks** — the `authMiddleware` handles headers transparently. Hooks should have zero auth awareness.

8. **Always invalidate on settle** — `onSettled: () => queryClient.invalidateQueries(opts)` ensures the cache is correct regardless of mutation success/failure.

9. **Immutable cache updates** — always spread/create new objects in `setQueryData`. Never mutate the cached object in place.
