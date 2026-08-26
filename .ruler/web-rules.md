---
description: Next.js frontend conventions for apps/web
globs: ["apps/web/**/*.ts", "apps/web/**/*.tsx"]
alwaysApply: false
---

# Next.js Frontend Rules (`apps/web/`)

## Directory Organization

```
apps/web/
├── app/                  # ONLY Next.js reserved files (pages, layouts, routes)
│   ├── (site)/           # Route groups and page.tsx files only
│   ├── api/              # API routes only
│   └── layout.tsx        # Root layout
├── features/             # ALL business logic goes here
│   └── [feature-name]/
│       ├── api/          # TanStack Query hooks, fetch functions
│       ├── components/   # Feature-specific UI components
│       ├── lib/          # Feature-specific utilities
│       ├── server/       # Server actions, server-side logic
│       └── utils/        # Feature utilities
├── core/                 # Shared/reusable code
│   ├── components/       # Shared UI components
│   ├── context/          # React contexts
│   ├── hooks/            # Shared React hooks
│   ├── lib/              # Shared utilities
│   ├── styles/           # Global styles
│   └── middleware/       # Shared middleware
├── services/             # External service integrations
│   ├── better-auth/      # Auth client setup (baseURL from getAuthUrl())
│   ├── orpc/             # orpc-server.ts placeholder only (no client wired)
│   └── tanstack-query/   # QueryClient setup, persisted provider, cache identity
└── env.ts                # Environment validation
```

## Folder Purposes

| Folder      | Purpose                                          | Example Contents                        |
| ----------- | ------------------------------------------------ | --------------------------------------- |
| `app/`      | Next.js routing only (pages, layouts, routes)    | `page.tsx`, `layout.tsx`, `route.ts`    |
| `features/` | Business logic organized by feature              | `todos/`, `auth/`, `dashboard/`         |
| `core/`     | Shared code used across multiple features        | Components, hooks, utilities            |
| `services/` | External service integrations and configurations | Auth, API clients, third-party services |

### Key Distinction

- **`app/`** = Next.js routing only (no business logic)
- **`features/`** = All business logic and feature-specific code
- **`core/`** = Shared utilities and components
- **`services/`** = External integrations

## Business Logic Placement

- **ALL business logic** must go in `features/[feature-name]/` folders
- Keep features isolated and self-contained
- Never put business logic in the `app/` directory
- The `app/` directory should only contain Next.js routing files

## File Naming Conventions

- **Components**: kebab-case (`user-profile.tsx`, `document-signer.tsx`)
- **Files**: kebab-case (`user-profile.utils.ts`, `auth-validation.schema.ts`)
- **Folders**: kebab-case (`user-management/`, `document-signing/`)
- **Hooks**: `use-[name].ts` (`use-auth.ts`, `use-todos.ts`)
- **Query hooks**: `use-[resource]-query.ts`, `use-[resource]-mutation.ts`

## Data Fetching with TanStack Query

Data fetching is **raw `apiFetch()` + query-key factories** with TanStack Query. There is **no oRPC client wired into the web app** — do not import an `orpc` object; `createORPCClient` / `OpenAPILink` / `createTanstackQueryUtils` are not used anywhere in `apps/web`. The oRPC packages are installed only for the JSON serializer in `query-client.ts`. All oRPC routes are served by the NestJS backend and reached over REST. `services/orpc/orpc-server.ts` is a placeholder (`export {}`) that initializes nothing.

### `apiFetch` + query keys

`features/todos/api/todos.hooks.ts`

```typescript
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/core/lib/api-error"
import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/${env.NEXT_PUBLIC_API_VERSION}`

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`, {
		...init,
		credentials: "include",
		headers: { "Content-Type": "application/json", ...init?.headers },
	})
	if (!response.ok) throw new ApiError(response.status, /* backend message */ "Request failed")
	if (response.status === 204) return undefined as T
	return (await response.json()) as T
}

export const todosKeys = { all: ["todos"] as const }

export function useTodosQuery() {
	return useQuery({
		queryKey: todosKeys.all,
		queryFn: () => apiFetch<TodoUi[]>("/example/todos"),
	})
}
```

- Classify errors by `ApiError.status` (401/403 = auth, 429 = rate limit), never by message text.
- Invalidate with `queryClient.invalidateQueries({ queryKey: todosKeys.all })`.

### Offline-capable mutations

Mutations that must survive an offline reload are registered as **mutation defaults** under a stable key (`registerTodosMutationDefaults(queryClient)` sets `mutationFn`/`onMutate`/`onError`/`onSettled`/`retry` for `["todos","create"|"update"|"delete"]`), and the hooks are thin `useMutation({ mutationKey })` wrappers that stamp identity + idempotency onto the vars. Only variables are persisted, so defaults are re-registered before `resumePausedMutations()`. Optimistic rows use `id: "optimistic-<uuid>"`; auth errors (401/403) are never retried.

### QueryClient + persistence

`services/tanstack-query/query-client.ts` builds the client with `networkMode: "offlineFirst"`, `gcTime` 24h, an oRPC-serializer `queryKeyHashFn`, and exported `serializeQueryData`/`deserializeQueryData` helpers. `services/tanstack-query/provider.tsx` wraps the app in **`PersistQueryClientProvider`** backed by IndexedDB (`idb-keyval`), identity-scoped per user, replaying paused mutations on reconnect. `NON_PERSISTED_QUERY_ROOTS = ["session","rbac"]` are excluded from disk via `shouldPersistQuery` so a shared browser profile never restores another user's identity or email directory. See the `tanstack-query-orpc` skill for the full pattern.

## Component Structure

- Use Shadcn UI components as the base component library
- Feature-specific components go in `features/[feature-name]/components/`
- Shared components go in `core/components/`
- Follow React best practices with hooks and functional components

### Component Pattern

```tsx
// features/todos/components/todo-card.tsx
interface TodoCardProps {
	todo: Todo
	onComplete: (id: number) => void
}

export function TodoCard({ todo, onComplete }: TodoCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{todo.title}</CardTitle>
			</CardHeader>
			<CardContent>
				<Button onClick={() => onComplete(todo.id)}>Complete</Button>
			</CardContent>
		</Card>
	)
}
```

## Server Actions

For mutations that need server-side logic:

```typescript
// features/todos/server/actions.ts
"use server"

import { db } from "@repo/db"
import { todos } from "@repo/db/schema"

export async function createTodoAction(data: CreateTodo) {
	const [todo] = await db.insert(todos).values(data).returning()
	return todo
}
```

## Authentication

Using Better Auth client. The `baseURL` comes from `getAuthUrl()`, not an env var — there is **no `NEXT_PUBLIC_BETTER_AUTH_URL`**.

```typescript
// services/better-auth/lib/utils.ts
import { cache } from "react"
import { getApiUrl } from "@/core/lib/utils"

// Better Auth routes live under `/api/{version}/auth` on the backend.
export const getAuthUrl = cache(() => `${getApiUrl()}/auth`)
```

```typescript
// services/better-auth/auth-client.ts
import { createAuthClient } from "better-auth/react"

import { getAuthUrl } from "./lib/utils"

export const authClient = createAuthClient({
	baseURL: getAuthUrl(),
}) as ReturnType<typeof createAuthClient>

export const { signIn, signUp, signOut, useSession } = authClient
```

`getApiUrl()` (`core/lib/utils.ts`) composes `NEXT_PUBLIC_API_BASE_URL` + `NEXT_PUBLIC_API_VERSION`, so `getAuthUrl()` resolves to `${API_BASE}/${version}/auth`.

## Feature Module Pattern

Each feature should be self-contained:

```
features/todos/
├── api/
│   └── todos.hooks.ts    # All query and mutation hooks for this feature
├── components/
│   ├── todo-card.tsx
│   ├── todo-list.tsx
│   └── create-todo-form.tsx
├── lib/
│   └── todo-utils.ts
└── server/
    └── actions.ts
```

## Environment Variables

- Define in `env.ts` using a validation library (e.g., `@t3-oss/env-nextjs`)
- Always prefix client-side variables with `NEXT_PUBLIC_`
- Update `.env.example` when adding new variables
