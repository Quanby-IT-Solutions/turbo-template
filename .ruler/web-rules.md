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
│   ├── better-auth/      # Auth client setup
│   ├── orpc/             # oRPC client, server-side client, contract type helpers
│   └── tanstack-query/   # TanStack Query client setup
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

## Data Fetching with oRPC + TanStack Query

All data fetching goes through the oRPC client, which provides end-to-end type safety from the contract definition through to the React hook.

### oRPC Client Setup

`services/orpc/client.ts`

```typescript
import { createORPCClient } from "@orpc/client"
import { OpenAPILink } from "@orpc/openapi-client/fetch"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"

import { v1Contract } from "@repo/contracts"

import { env } from "@/env"

export function createOrpcLink(options?: { getCookieHeader?: () => string | undefined }) {
	return new OpenAPILink(v1Contract, {
		url: env.NEXT_PUBLIC_API_BASE_URL,
		fetch: (url, init) => {
			const cookieHeader = options?.getCookieHeader?.()

			if (!cookieHeader) {
				return fetch(url, init)
			}

			const headers = new Headers(init?.headers)
			headers.set("cookie", cookieHeader)

			return fetch(url, {
				...init,
				headers,
			})
		},
	})
}

const link = createOrpcLink()

const globalThisRef = globalThis as typeof globalThis & {
	$orpc?: ReturnType<typeof createORPCClient<typeof v1Contract>>
}

const baseOrpc = globalThisRef.$orpc ?? createORPCClient(link)

export const orpc = createTanstackQueryUtils(baseOrpc, { path: ["orpc"] })
```

The `orpc` export is what all feature hooks import.

### Server-Side oRPC

`services/orpc/orpc-server.ts`

```typescript
import "server-only"

import { createORPCClient } from "@orpc/client"

import { getCookieHeader } from "@/core/lib/cookie-utils"
import { createOrpcLink } from "@/services/orpc/client"

const link = createOrpcLink({ getCookieHeader })

const globalClient = globalThis as typeof globalThis & {
	$orpc?: ReturnType<typeof createORPCClient<(typeof link)["~orpc"]["inputSchema"]>>
}

globalClient.$orpc = createORPCClient(link)
```

Import `orpc` from `@/services/orpc/client` in Server Components to use the server-side client.

### TanStack Query Client Setup

`services/tanstack-query/query-client.ts`

```typescript
import { StandardRPCJsonSerializer } from "@orpc/client/standard"
import { QueryClient } from "@tanstack/react-query"

const serializer = new StandardRPCJsonSerializer({ customJsonSerializers: [] })

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: queryKey => {
					const { json, meta } = serializer.serialize(queryKey)
					return JSON.stringify({ json, meta })
				},
				staleTime: 30 * 1000,
			},
			dehydrate: {
				serializeData: data => {
					const { json, meta } = serializer.serialize(data)
					return { json, meta }
				},
			},
			hydrate: {
				deserializeData: data => {
					return serializer.deserialize(data.json, data.meta)
				},
			},
		},
	})
}
```

### Feature Query Hooks

`features/todos/api/todos.hooks.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useTodosQuery() {
	return useQuery(orpc.example.todo.list.queryOptions({ staleTime: 60 * 1000 }))
}

export function useCreateTodoMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.example.todo.create.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.example.todo.key(),
				}),
		})
	)
}

export function useUpdateTodoMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.example.todo.update.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.example.todo.key(),
				}),
		})
	)
}

export function useDeleteTodoMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.example.todo.delete.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.example.todo.key(),
				}),
		})
	)
}
```

Key patterns:

- `.queryOptions()` — for `useQuery`, accepts TanStack Query options
- `.mutationOptions()` — for `useMutation`, accepts TanStack Query options
- `.key()` — for cache invalidation with `queryClient.invalidateQueries`

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

Using Better Auth client:

```typescript
// services/better-auth/auth-client.ts
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
})

export const { signIn, signUp, signOut, useSession } = authClient
```

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
