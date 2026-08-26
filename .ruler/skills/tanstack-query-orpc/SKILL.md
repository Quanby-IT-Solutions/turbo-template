---
name: tanstack-query-orpc
description: TanStack Query data-fetching patterns for this monorepo — raw fetch + query-key factories, offline persistence, and paused-mutation replay. Use when creating query hooks, mutations, invalidating cache, or working under services/tanstack-query/. Triggers on data fetching, cache invalidation, offline/PWA persistence, optimistic updates, or query-key design.
frameworks:
  - tanstack-query
  - nextjs
languages:
  - typescript
  - tsx
category: data-fetching
updated: 2026-08-15
---

# TanStack Query Data-Fetching Skill

## Quick Reference

**When to Use**: Creating query/mutation hooks, invalidating cache, wiring optimistic updates, or touching the offline persistence layer.

**Cardinal rule**: Data fetching is **raw `apiFetch()` + query-key factories**. There is NO oRPC client wired into the web app. Do not `import { orpc }` — that module does not exist.

**Versions**: TanStack Query 5.90.16, React 19. Of the installed oRPC packages (1.13.4), only `@orpc/client` is imported anywhere in `apps/web` — its `StandardRPCJsonSerializer` (from `@orpc/client/standard`) powers the JSON serializer in `query-client.ts`. `@orpc/tanstack-query` is installed but unused (0 imports); there is no `createORPCClient` / `OpenAPILink` / `createTanstackQueryUtils` anywhere in `apps/web`.

## Architecture

```
apps/web/services/
  ├── orpc/
  │   └── orpc-server.ts               # `export {}` placeholder — initializes NOTHING
  └── tanstack-query/
      ├── query-client.ts              # QueryClient factory: offlineFirst, 24h gcTime,
      │                                #   serializer helpers, shouldPersistQuery,
      │                                #   NON_PERSISTED_QUERY_ROOTS
      ├── provider.tsx                 # PersistQueryClientProvider (IndexedDB via idb-keyval)
      ├── cache-persistence.ts         # identity-scoped keys, buster, maxAge, purge
      ├── cache-identity.tsx           # server: resolve session → CacheIdentityStamp
      └── paused-mutation-identity.ts  # stamp/replay-guard offline mutations by identity

apps/web/features/[feature]/api/[feature].hooks.ts   # apiFetch + <feature>Keys factories
```

## Data Fetching: raw `apiFetch`

`apiFetch` hits the versioned REST base and always sends credentials. There is no generated client — call the backend paths directly.

```typescript
// features/todos/api/todos.hooks.ts
import { env } from "@/env"
import { ApiError } from "@/core/lib/api-error"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/${env.NEXT_PUBLIC_API_VERSION}`

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!response.ok) {
    // parse { message } / { error: { message } }, read retry-after, throw ApiError(status, msg, retryAfter)
    throw new ApiError(response.status, /* … */ "Request failed")
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
```

- `ApiError` retains the HTTP `status` and optional `retryAfter` — classify errors by status, never by message text (`apiFetch` overwrites the message with the backend JSON body).
- 429 handling (live countdown toast, disabling the control) is driven by consuming components via `useRateLimitToast`, reading each mutation's own error.

## Query-Key Factories

Keys are plain arrays from a small factory object — no serializer-encoded key builders.

```typescript
export const todosKeys = {
  all: ["todos"] as const,
}

export function useTodosQuery() {
  return useQuery({
    queryKey: todosKeys.all,
    queryFn: () => apiFetch<TodoUi[]>("/example/todos"),
  })
}
```

Invalidate by key: `queryClient.invalidateQueries({ queryKey: todosKeys.all })`.

## Mutations: rehydratable defaults + optimistic cache

Mutations are split in two so they survive an offline reload:

1. **`registerTodosMutationDefaults(queryClient)`** registers `mutationFn` / `onMutate` / `onError` / `onSettled` / `retry` under stable mutation keys (`["todos","create"]`, `["todos","update"]`, `["todos","delete"]`). Only mutation **variables** are persisted — functions are not — so defaults must be re-registered before `resumePausedMutations()`. It is synchronous and idempotent; `provider.tsx` calls it on every render and again in `onSuccess`.
2. **Hook wrappers** (`useCreateTodoMutation`, etc.) call `useMutation({ mutationKey })` with no inline `mutationFn` and stamp identity + idempotency onto vars at enqueue time.

```typescript
queryClient.setMutationDefaults(["todos", "create"], {
  mutationFn: ({ title, completed, idempotencyKey }: CreateTodoVars) =>
    apiFetch<Todo>("/example/todos", {
      method: "POST",
      body: JSON.stringify({ title, completed }),
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  onMutate: async vars => {
    await queryClient.cancelQueries({ queryKey: todosKeys.all })
    const snapshot = queryClient.getQueryData<TodoUi[]>(todosKeys.all)
    queryClient.setQueryData<TodoUi[]>(todosKeys.all, prev => [...(prev ?? []), optimisticRow])
    return { hadSnapshot: snapshot !== undefined, snapshot }   // hadSnapshot distinguishes "no list" from "[]"
  },
  onError: (_e, _v, ctx) => rollbackTodos(queryClient, ctx),
  onSettled: () => queryClient.invalidateQueries({ queryKey: todosKeys.all }),
  retry: retryUnlessAuth,                                       // never retry 401/403
})
```

Hook wrapper stamps identity so a device handover cannot replay one user's writes as another (WC-3):

```typescript
export function useCreateTodoMutation() {
  const mutation = useMutation<Todo, Error, CreateTodoVars>({ mutationKey: ["todos", "create"] })
  return {
    ...mutation,
    mutate: (payload: { title: string; completed: boolean }, options?) =>
      mutation.mutate(stampIdentity({ ...payload, idempotencyKey: crypto.randomUUID() }), options),
  }
}
```

- **Optimistic ids**: creates use `id: "optimistic-<uuid>"`; update/delete wrappers early-return on non-`number` ids (an optimistic row has no server id yet).
- **Auth-aware retry**: `isAuthError` = `ApiError` with status 401/403; `retryUnlessAuth` refuses those and caps the rest at 3.
- **Replay surface**: `useTodoReplayErrors()` reads `useMutationState` filtered on the `["todos"]` key prefix so errors from resumed/paused mutations (which have no per-hook observer) still surface.

## QueryClient Configuration

```typescript
// services/tanstack-query/query-client.ts
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn(queryKey) {                 // oRPC serializer used ONLY for stable hashing
          const [json, meta] = serializer.serialize(queryKey)
          return JSON.stringify({ json, meta })
        },
        networkMode: "offlineFirst",               // paint cache first, then network
        staleTime: 30 * 1000,
        gcTime: 1000 * 60 * 60 * 24,               // 24h so the persister has data to restore
      },
      mutations: { networkMode: "online" },        // pause while offline, resume on reconnect
      dehydrate: { shouldDehydrateQuery, shouldDehydrateMutation, serializeData: serializeQueryData },
      hydrate: { deserializeData: deserializeQueryData },
    },
  })
```

- `serializeQueryData` / `deserializeQueryData` wrap `StandardRPCJsonSerializer` and are **exported** because `PersistQueryClientProvider` does NOT inherit the QueryClient's dehydrate/hydrate options — the persister reuses these directly.
- `shouldDehydrateMutation` = `mutation.state.isPaused` (persist offline-queued writes).
- Server vs client: `getServerQueryClient = cache(createQueryClient)` (per request), client is a module singleton.

## Offline / PWA Persistence (security-critical)

`provider.tsx` uses `PersistQueryClientProvider` backed by IndexedDB (`idb-keyval`), falling back to plain `QueryClientProvider` on the server / before the persister exists.

```tsx
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,                                  // identity-scoped idb adapter
    maxAge: PERSISTED_CACHE_MAX_AGE,            // 2h — well under the 24h in-memory gcTime
    buster: PERSISTED_CACHE_BUSTER,             // bump to discard all snapshots on shape change
    dehydrateOptions: {
      shouldDehydrateQuery: shouldPersistQuery, // NOT shouldDehydrateQuery — excludes sensitive roots
      shouldDehydrateMutation,
      serializeData: serializeQueryData,
    },
    hydrateOptions: { defaultOptions: { deserializeData: deserializeQueryData } },
  }}
  onSuccess={() => {
    registerTodosMutationDefaults(queryClient)          // restore fns before replay
    discardForeignPausedMutations(queryClient)          // WC-3: drop other identities' queued writes…
    void queryClient.resumePausedMutations()            // …THEN resume — order is the guarantee
  }}
>
```

**Security exclusion — `NON_PERSISTED_QUERY_ROOTS = ["session", "rbac"]`** (query-client.ts). These roots carry the signed-in identity and the full user/email directory; persisting them would hand the next person on a shared browser profile a readable copy from DevTools. `shouldPersistQuery` denies any key whose first-segment labels intersect that set, then falls through to the SSR predicate. It is an **exclusion list, not an allowlist** — add new sensitive roots here.

**Identity scoping** (`cache-persistence.ts`): every IndexedDB bucket key is suffixed with an FNV-1a hash of the user id (`readCacheIdentity()` / `writeCacheIdentity()`); anonymous bucket is `"anon"`. `purgePersistedCache()` deletes every owned bucket (including the legacy `REACT_QUERY_OFFLINE_CACHE` key) on sign-out, retried up to 3x (RF1). `cache-identity.tsx` resolves the session server-side and renders `<CacheIdentityStamp userId>` — mount it per authenticated subtree, never in the root layout (a cookie read there makes every route dynamic, including `/login` and `/~offline`).

**Paused-mutation identity** (`paused-mutation-identity.ts`): `stampIdentity()` writes the hashed identity onto mutation vars under `__identity`; `discardForeignPausedMutations()` removes paused mutations whose stamp differs from the current identity before resume. Unstamped (pre-upgrade) mutations are treated as belonging to the current identity.

## SSR Prefetch / Hydrate

`HydrateClient` wraps children in `HydrationBoundary` with `dehydrate(client)`. Prefetch in a server component with the same query key + fetcher, then render the client component inside `HydrateClient`.

## `orpc-server.ts` — placeholder only

```typescript
// services/orpc/orpc-server.ts
export {}
```

It is imported for its (nonexistent) side effect in `app/layout.tsx` but **initializes nothing**. All oRPC routes are served by the NestJS backend; the web app talks to them over REST via `apiFetch`. Kept so future server actions can register handlers without touching every import site.

## Key Rules

1. **Raw `apiFetch` + query-key factories** — never an `orpc.*` client; it does not exist here.
2. One hook file per feature: `features/[feature]/api/[feature].hooks.ts`, marked `"use client"`.
3. Mutations that must survive offline reload use `setMutationDefaults` under a stable key + a thin `useMutation({ mutationKey })` wrapper. Re-register defaults before `resumePausedMutations()`.
4. Classify errors by `ApiError.status`, not message text. Never retry 401/403.
5. Persistence uses `shouldPersistQuery` (excludes `NON_PERSISTED_QUERY_ROOTS`), not `shouldDehydrateQuery`. Add new sensitive roots to the exclusion list.
6. The persister does not inherit QueryClient dehydrate/hydrate options — reuse the exported serializer helpers.
