---
name: tanstack-query-orpc
description: TanStack Query integration with oRPC for this monorepo. Use when creating query hooks, mutations, prefetching data, managing cache, or working with services/tanstack-query/ or services/orpc/. Triggers on tasks involving data fetching, cache invalidation, SSR prefetching, hydration, or stale time configuration.
frameworks:
  - tanstack-query
  - orpc
  - nextjs
languages:
  - typescript
  - tsx
category: data-fetching
updated: 2026-03-06
---

# TanStack Query + oRPC Integration Skill

## Quick Reference

**When to Use**: Creating query/mutation hooks, prefetching on server, managing cache, or configuring data fetching

**Key Integration**: `@orpc/tanstack-query` bridges oRPC client with TanStack Query via `createTanstackQueryUtils()`

**Versions**: TanStack Query 5.90+, oRPC 1.13+, React 19

## Architecture

```
apps/web/services/
  ├── orpc/
  │   ├── client.ts              # OpenAPILink + createTanstackQueryUtils → orpc
  │   ├── orpc-server.ts         # Server-side client with cookie forwarding
  │   └── contract-types.ts      # V1Inputs / V1Outputs type helpers
  └── tanstack-query/
      ├── query-client.ts        # QueryClient factory with oRPC serializer
      └── provider.tsx           # QueryProvider + HydrateClient components

apps/web/features/[feature]/
  └── api/
      └── [feature].hooks.ts     # Feature-specific hooks using orpc.*
```

## QueryClient Setup

### oRPC-Compatible Serializer

```typescript
// apps/web/services/tanstack-query/query-client.ts
import { StandardRPCJsonSerializer } from "@orpc/client/standard"
import { defaultShouldDehydrateQuery, isServer, QueryClient } from "@tanstack/react-query"

const serializer = new StandardRPCJsonSerializer({ customJsonSerializers: [] })

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // oRPC-specific: serialize complex types in query keys
        queryKeyHashFn(queryKey) {
          const [json, meta] = serializer.serialize(queryKey)
          return JSON.stringify({ json, meta })
        },
        staleTime: 30 * 1000,  // 30 seconds default
      },
      dehydrate: {
        // Include pending queries in SSR dehydration
        shouldDehydrateQuery: query =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
        serializeData(data) {
          const [json, meta] = serializer.serialize(data)
          return { json, meta }
        },
      },
      hydrate: {
        deserializeData(data: { json: unknown; meta: unknown }) {
          return serializer.deserialize(data.json, data.meta)
        },
      },
    },
  })
```

### Server vs Client Singleton

```typescript
const getServerQueryClient = cache(createQueryClient)  // Per-request on server
let clientQueryClientSingleton: QueryClient | undefined

export const getQueryClient = () => {
  if (isServer) return getServerQueryClient()
  clientQueryClientSingleton ??= createQueryClient()
  return clientQueryClientSingleton
}
```

### Provider Components

```tsx
// apps/web/services/tanstack-query/provider.tsx
"use client"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}

// For SSR prefetching
export function HydrateClient({ children, client }: { children: React.ReactNode; client: QueryClient }) {
  return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>
}
```

## oRPC Client with TanStack Query Utilities

```typescript
// apps/web/services/orpc/client.ts
import { createORPCClient } from "@orpc/client"
import { OpenAPILink } from "@orpc/openapi-client/fetch"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import { v1Contract } from "@repo/contracts"

const link = new OpenAPILink(v1Contract, {
  url: env.NEXT_PUBLIC_API_BASE_URL,
  fetch: (url, init) => fetch(url, { ...init, credentials: "include" }),
})

const baseOrpc = createORPCClient(link)

// This is the main export — all hooks use this
export const orpc = createTanstackQueryUtils(baseOrpc, { path: ["orpc"] })
```

**`path: ["orpc"]`** prevents key collisions with non-oRPC queries (e.g., auth session queries).

## Feature Hook Patterns

### Query Hook

```typescript
"use client"
import { useQuery } from "@tanstack/react-query"
import { orpc } from "@/services/orpc/client"

export function useTodosQuery() {
  return useQuery(
    orpc.example.todo.list.queryOptions({
      staleTime: 60 * 1000,  // Override default stale time
    })
  )
}
```

### Mutation Hook with Cache Invalidation

```typescript
export function useCreateTodoMutation() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.example.todo.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.example.todo.key(),  // Invalidates all todo queries
        })
      },
    })
  )
}
```

### Mutation Hook with Input

```typescript
// In a component:
const createTodo = useCreateTodoMutation()
createTodo.mutate({ title: "New todo", completed: false })
```

## oRPC TanStack Query API

| Method | Purpose | Use With |
|--------|---------|----------|
| `.queryOptions(opts?)` | Returns query options | `useQuery()` |
| `.mutationOptions(opts?)` | Returns mutation options | `useMutation()` |
| `.key()` | Returns cache key for namespace | `invalidateQueries()` |

**Namespace keys**: `orpc.example.todo.key()` invalidates ALL todo queries (list, get, etc.)

## Type Helpers for Serialized Responses

```typescript
// apps/web/services/orpc/contract-types.ts
import type { InferContractRouterInputs, InferContractRouterOutputs } from "@orpc/contract"
import { type v1Contract } from "@repo/contracts"

export type V1Inputs = InferContractRouterInputs<typeof v1Contract>
export type V1Outputs = InferContractRouterOutputs<typeof v1Contract>

// Transform Date → string for serialized API responses
export type SerializeDates<T, K extends keyof T> = Omit<T, K> & { [P in K]: string }
export type ArrayItem<T> = T extends readonly (infer E)[] ? E : never
export type SerializedArrayItem<T, K extends keyof ArrayItem<T>> = SerializeDates<ArrayItem<T>, K>
```

## SSR Prefetching Pattern

```tsx
// Server component
import { getQueryClient } from "@/services/tanstack-query/query-client"
import { HydrateClient } from "@/services/tanstack-query/provider"
import { orpc } from "@/services/orpc/client"

export default async function TodosPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery(orpc.example.todo.list.queryOptions())

  return (
    <HydrateClient client={queryClient}>
      <TodosList />  {/* Client component with useTodosQuery() */}
    </HydrateClient>
  )
}
```

## Key Rules

1. Always use `orpc.*` for API calls — never raw `fetch` for contract endpoints
2. One hook file per feature: `features/[feature]/api/[feature].hooks.ts`
3. Mark hook files with `"use client"` (TanStack Query hooks are client-only)
4. Use `.key()` for namespace-level cache invalidation
5. The `StandardRPCJsonSerializer` is required for oRPC compatibility in query keys
6. Server vs client singleton prevents stale data sharing across requests
