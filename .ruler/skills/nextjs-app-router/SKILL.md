---
name: nextjs-app-router
description: Next.js 16 App Router conventions for this monorepo. Use when creating pages, layouts, route handlers, server components, client components, or working in apps/web/. Triggers on tasks involving routing, SSR, RSC, server actions, metadata, fonts, or Next.js configuration.
frameworks:
  - nextjs
languages:
  - typescript
  - tsx
category: frontend
updated: 2026-08-15
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
│   ├── (auth)/           # Route group — login, register, forgot/reset-password, verify-email, session
│   ├── (home)/           # Route group — landing page + examples/todos
│   ├── (site)/           # Route group — account, dashboard, todos, user-management, submit-ticket
│   ├── serwist/[path]/   # PWA service-worker asset route (route.ts)
│   ├── ~offline/         # PWA offline fallback (page.tsx)
│   ├── manifest.ts       # Web app manifest (MetadataRoute.Manifest)
│   ├── sw.ts             # Serwist service-worker source (compiled to the SW asset)
│   ├── global-error.tsx  # Root error boundary (reports to Sentry)
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
│   ├── lib/              # Shared utilities (cookie-utils, sentry-config, etc.)
│   └── styles/           # Global styles (globals.css)
├── services/             # External service integrations
│   ├── better-auth/      # Auth client, server session, AuthProvider
│   ├── orpc/             # orpc-server.ts placeholder only (no client wired)
│   └── tanstack-query/   # QueryClient setup, QueryProvider, persistence
├── instrumentation.ts            # Server/edge Sentry register() + onRequestError
├── instrumentation-client.ts     # Browser Sentry init + onRouterTransitionStart
├── sentry.server.config.ts       # Node runtime Sentry init
├── sentry.edge.config.ts         # Edge runtime Sentry init
└── env.ts                # Environment validation (@t3-oss/env-nextjs)
```

### Reserved Framework Entrypoints (app root)

These files are loaded by Next.js by name — not imported by app code:

| File | Purpose |
|------|---------|
| `instrumentation-client.ts` | `Sentry.init` for the browser; exports `onRouterTransitionStart = Sentry.captureRouterTransitionStart` |
| `instrumentation.ts` | `register()` dynamically imports `sentry.server.config` / `sentry.edge.config` by `NEXT_RUNTIME`; exports `onRequestError = Sentry.captureRequestError` |
| `sentry.server.config.ts` / `sentry.edge.config.ts` | Per-runtime Sentry init |
| `core/lib/sentry-config.ts` | Resolves DSN/env, scrubs events/breadcrumbs; the init files stay inert unless `SENTRY_ENABLED`/`NEXT_PUBLIC_SENTRY_ENABLED` is on AND a DSN parses |
| `app/manifest.ts` | `MetadataRoute.Manifest` PWA manifest |
| `app/~offline/page.tsx` | Serwist offline fallback (renders `OfflineView`) |
| `app/serwist/[path]/route.ts` | Serwist service-worker asset route |

## Essential Patterns

### Root Layout — Provider Nesting Order

The root layout wraps children in this exact order:

```tsx
// app/layout.tsx
import "@/core/styles/globals.css"
import "@/services/orpc/orpc-server" // Placeholder module (`export {}`) — NO side effects

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SerwistRegistrationProvider>   {/* 1. PWA service worker (outermost) */}
          <AuthProvider>                {/* 2. Auth context */}
            <QueryProvider>             {/* 3. TanStack Query + persistence */}
              <ThemeProvider            {/* 4. Theme (next-themes) */}
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <BreakpointIndicator />
                {children}
                <NetworkStatusIndicator />
                <Toaster richColors closeButton />
              </ThemeProvider>
            </QueryProvider>
          </AuthProvider>
        </SerwistRegistrationProvider>
      </body>
    </html>
  )
}
```

- `SerwistRegistrationProvider` is the outermost provider; `AuthProvider` sits inside it, not at the top.
- `BreakpointIndicator` and `NetworkStatusIndicator` are dev/PWA affordances rendered in the body alongside `{children}`.
- `import "@/services/orpc/orpc-server"` is a **placeholder** — the module is `export {}` and initializes nothing (all oRPC routes are served by the NestJS backend; the web app calls them over REST via `apiFetch`).

### Page Files — Routing Only, No Logic

```tsx
// app/(site)/submit-ticket/page.tsx
import { SubmitTicketForm } from "@/features/tickets/components/submit-ticket-form"

export default function SubmitTicketPage() {
  return <SubmitTicketForm />
}
```

- Pages import from `features/` or `core/` — never contain business logic
- Route groups share layouts without affecting URL paths. Three exist: `(auth)/` (login, register, forgot-password, reset-password, verify-email, session), `(home)/` (landing page + examples/todos), and `(site)/` (account, dashboard, todos, user-management, submit-ticket)
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
import { withSentryConfig } from "@sentry/nextjs"
import { withSerwist } from "@serwist/turbopack"
import path from "node:path"
import "./env" // validate env at config load

const config: NextConfig = {
  typedRoutes: true,          // Type-safe <Link> href
  output: "standalone",       // Docker-friendly output
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../../"), // monorepo root
  reactCompiler: true,        // React Compiler (babel-plugin-react-compiler) — auto-memoization
  serverExternalPackages: ["@sentry/nextjs"], // keep the SDK out of the bundled server graph
  transpilePackages: [        // Required for workspace packages
    "@repo/auth",
    "@repo/backend",
    "@repo/contracts",
    "@repo/db",
    "@t3-oss/env-core",
    "@t3-oss/env-nextjs",
  ],
  async headers() {
    // Per-response CSP for every HTML response (ED-1). Next.js owns the page CSP
    // because it alone knows what the app loads. connect-src uses the API ORIGIN
    // (not the base URL — a CSP source with a path is a prefix and would block
    // /api/v1/...). frame-ancestors 'none', object-src 'none', plus
    // X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
    // HSTS only when ENABLE_HSTS === "true".
    return [{ source: "/:path*", headers: [/* … */] }]
  },
}

// Sentry wraps the Serwist-wrapped config (Serwist owns the SW entry; Sentry
// only decorates the result). tunnelRoute "/monitoring" keeps connect-src 'self'.
export default (phase: string) => withSentryConfig(withSerwist(config), {
  tunnelRoute: "/monitoring",
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,        // all undefined for contributor/CI builds
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  silent: true,
})
```

- `typescript.ignoreBuildErrors` was **deleted** (CI-4/F-22) — do not restore it; fix types instead.
- `withSentryConfig(withSerwist(config))` order matters: Serwist builds the SW config first, Sentry decorates the result.

### Environment Variables

```typescript
// env.ts — validated at module load
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod/v4"

export const env = createEnv({
  // Shared — available on client and server
  shared: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  // Server-only — never exposed to the browser
  server: {
    INTERNAL_API_BASE_URL: z.url().optional(),
    // Build/release commit SHA, resolved from whichever CI provides it.
    VERCEL_GIT_COMMIT_SHA: z.string().optional(),
    GITHUB_SHA: z.string().optional(),
    GIT_COMMIT_SHA: z.string().optional(),
    // Sentry (server/edge/build). All optional — template ships with reporting OFF.
    SENTRY_ENABLED: optionalBooleanFromEnv,
    SENTRY_DSN: z.string().optional(),          // plain string, NOT z.url() — a DSN typo must not fail the build
    SENTRY_ENVIRONMENT: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),   // write credential — never NEXT_PUBLIC_*
  },
  // Client — must be NEXT_PUBLIC_*
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3001"),
    NEXT_PUBLIC_API_BASE_URL: z.url().default("http://localhost:3000/api"),
    NEXT_PUBLIC_API_VERSION: z.string().default("v1"),
    NEXT_PUBLIC_SENTRY_ENABLED: optionalBooleanFromEnv,
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().optional(),
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  },
  runtimeEnv: { /* every key destructured from process.env */ },
  // CI-4/F-16: validation is NEVER skipped just because CI is set (that anti-pattern
  // was deleted). SKIP_ENV_VALIDATION is the one documented escape hatch; lint stays exempt.
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "true" || process.env.npm_lifecycle_event === "lint",
})
```

- Imports from `"zod/v4"`, not `"zod"`.
- `optionalBooleanFromEnv` normalizes empty/whitespace to `undefined` then accepts only `true|false|1|0` — Docker materializes an unset `ARG` as an empty string, which must not fail an unconfigured build.
- The 10 Sentry vars: `SENTRY_ENABLED`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (server), plus `NEXT_PUBLIC_SENTRY_ENABLED`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` (client). Reporting is a two-part gate: the `*_ENABLED` flag does nothing without a parseable DSN.

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
