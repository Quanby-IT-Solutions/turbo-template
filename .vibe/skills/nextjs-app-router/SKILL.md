---
name: nextjs-app-router
description: Next.js 16 App Router conventions for this monorepo. Use when creating pages, layouts, route handlers, server components, client components, or working in apps/web/. Triggers on tasks involving routing, SSR, RSC, server actions, metadata, fonts, or Next.js configuration.
frameworks:
  - nextjs
languages:
  - typescript
  - tsx
category: frontend
updated: 2026-03-06
---

# Next.js 16 App Router Skill

## Quick Reference

**When to Use**: Creating or modifying pages, layouts, route handlers, server/client components, or any file in `apps/web/`

**Key Principle**: `app/` is **routing-only** — all business logic lives in `features/`, `core/`, and `services/`

**Version**: Next.js 16.1 with App Router, React 19, TypeScript 5.9, `typedRoutes: true`

## Directory Structure

```
apps/web/
├── app/                  # ONLY Next.js reserved files
│   ├── (site)/           # Route groups — page.tsx files only
│   ├── api/              # API routes only
│   └── layout.tsx        # Root layout
├── features/             # ALL business logic here
│   └── [feature-name]/
│       ├── api/          # TanStack Query hooks (e.g., todos.hooks.ts)
│       ├── components/   # Feature-specific UI components
│       ├── lib/          # Feature-specific utilities
│       └── server/       # Server actions
├── core/                 # Shared/reusable code
│   ├── components/       # Shared UI (including ui/ for shadcn)
│   ├── context/          # React contexts (ThemeProvider)
│   ├── hooks/            # Shared React hooks
│   ├── lib/              # Shared utilities (cookie-utils, etc.)
│   └── styles/           # Global styles (globals.css)
├── services/             # External service integrations
│   ├── better-auth/      # Auth client, server session, AuthProvider
│   ├── orpc/             # oRPC client, server client, contract types
│   └── tanstack-query/   # QueryClient setup, QueryProvider
└── env.ts                # Environment validation (@t3-oss/env-nextjs)
```

## Essential Patterns

### Root Layout — Provider Nesting Order

The root layout wraps children in this exact order:

```tsx
// app/layout.tsx
import "@/core/styles/globals.css"
import "@/services/orpc/orpc-server" // Side-effect: initializes server oRPC client

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariable} suppressHydrationWarning>
      <body>
        <AuthProvider>          {/* 1. Auth context (outermost) */}
          <QueryProvider>       {/* 2. TanStack Query */}
            <ThemeProvider      {/* 3. Theme (next-themes) */}
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster richColors closeButton />
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Page Files — Routing Only, No Logic

```tsx
// app/(site)/submit-ticket/page.tsx
import { SubmitTicketForm } from "@/features/tickets/components/submit-ticket-form"

export default function SubmitTicketPage() {
  return <SubmitTicketForm />
}
```

- Pages import from `features/` or `core/` — never contain business logic
- Route groups like `(site)` share layouts without affecting URL paths
- Use `export const metadata: Metadata` for static metadata

### Server Components vs Client Components

```tsx
// Server Component (default) — no directive needed
// Can: fetch data, access DB, read cookies, use async/await
// Cannot: useState, useEffect, event handlers, browser APIs

// Client Component — needs "use client" directive
"use client"
// Can: useState, useEffect, event handlers, browser APIs
// Cannot: directly access DB, use async functions for data

// Pattern: Server component fetches, client component renders
// app/(site)/todos/page.tsx (server)
import { TodosList } from "@/features/todos/components/todos-list"
export default function TodosPage() {
  return <TodosList />  // TodosList is "use client" with hooks
}
```

### Server Actions

```typescript
// features/todos/server/actions.ts
"use server"

import { db } from "@repo/db"
import { todos } from "@repo/db/schema"

export async function createTodoAction(data: { title: string }) {
  const [todo] = await db.insert(todos).values(data).returning()
  return todo
}
```

### Next.js Config — Monorepo Settings

```typescript
// next.config.ts
const config: NextConfig = {
  typedRoutes: true,          // Type-safe <Link> href
  output: "standalone",       // Docker-friendly output
  transpilePackages: [        // Required for workspace packages
    "@repo/auth",
    "@repo/contracts",
    "@repo/db",
    "@t3-oss/env-core",
    "@t3-oss/env-nextjs",
  ],
}
```

### Environment Variables

```typescript
// env.ts — validated at module load
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_API_BASE_URL: z.url(),
    NEXT_PUBLIC_API_VERSION: z.string(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_API_VERSION: process.env.NEXT_PUBLIC_API_VERSION,
  },
  skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
})
```

### Font Loading

```tsx
// Figtree as primary sans, Geist for monospace
import { Figtree, Geist, Geist_Mono } from "next/font/google"

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" })
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
```

### File Naming Conventions

| Type            | Convention   | Example                           |
|-----------------|-------------|-----------------------------------|
| Components      | kebab-case  | `todo-card.tsx`, `user-avatar.tsx` |
| Hooks           | kebab-case  | `use-auth.ts`, `use-todos.ts`     |
| Query hooks     | kebab-case  | `todos.hooks.ts`                  |
| Folders         | kebab-case  | `user-management/`                |
| Pages           | `page.tsx`  | `app/(site)/todos/page.tsx`       |
| Layouts         | `layout.tsx`| `app/(site)/layout.tsx`           |
| Route handlers  | `route.ts`  | `app/api/tickets/route.ts`        |

## Key Rules

1. **No barrel files** in `apps/` — import directly from specific files
2. **Co-locate types** with code that uses them — no separate `*.types.ts` files
3. **No business logic in `app/`** — pages are thin wrappers around feature components
4. **Use `@/` path alias** for all imports within `apps/web/`
5. **Always use `pnpm`** — never npm or yarn
6. **`"use client"` only when needed** — default to server components
