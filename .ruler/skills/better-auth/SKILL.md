---
name: better-auth
description: Better Auth authentication patterns for this monorepo. Use when implementing login, signup, session management, OAuth, auth guards, or working with @repo/auth. Triggers on tasks involving authentication, authorization, sessions, cookies, auth middleware, or user identity.
frameworks:
  - better-auth
  - nestjs
  - nextjs
languages:
  - typescript
category: auth
updated: 2026-03-06
---

# Better Auth Skill

## Quick Reference

**When to Use**: Implementing auth flows, session handling, protecting routes, OAuth setup, or working with `@repo/auth`, `services/better-auth/`, or backend auth middleware

**Package**: `@repo/auth` — shared Better Auth configuration consumed by both web and backend

**Version**: Better Auth 1.4.x with Drizzle adapter, Google OAuth, email/password

## Architecture Overview

```
packages/auth/src/
  ├── index.ts          # Package entrypoint (re-exports)
  ├── config.ts         # betterAuth() initialization, lazy singleton
  └── types.ts          # Type re-exports (Session, User, Account)

apps/backend/src/config/
  └── auth.config.ts    # Express middleware: URL rewriting + versioned routes

apps/web/services/better-auth/
  ├── auth-client.ts    # createAuthClient() for browser
  ├── auth-server.ts    # getSession() for server components
  ├── context/
  │   └── auth-provider.tsx  # AuthProvider + useAuth() hook
  └── lib/
      └── utils.ts      # getAuthUrl() helper
```

## Shared Auth Config (`@repo/auth`)

### Initialization with Drizzle Adapter

```typescript
// packages/auth/src/config.ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { openAPI } from "better-auth/plugins"
import { createDBClient } from "@repo/db/client"
import { users, sessions, accounts, verifications } from "@repo/db/schema"

export const AUTH_BASE_PATH = "/auth"

export function createAuth() {
  const db = createDBClient()
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { users, sessions, accounts, verifications },
      usePlural: true,  // Tables are plural: "users" not "user"
    }),
    basePath: AUTH_BASE_PATH,
    secret: authEnv.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      google: {
        prompt: "select_account",
        clientId: authEnv.GOOGLE_CLIENT_ID as string,
        clientSecret: authEnv.GOOGLE_CLIENT_SECRET as string,
      },
    },
    trustedOrigins: authEnv.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? [],
    plugins: [openAPI({ path: "/reference" })],
  })
}
```

### Lazy Singleton Pattern

```typescript
let _auth: ReturnType<typeof betterAuth> | null = null

export function getAuth() {
  if (!_auth) _auth = createAuth()
  return _auth!
}

export function clearAuthCache() { _auth = null }
```

### Environment Variables (Auth)

```
BETTER_AUTH_SECRET=          # Required: Auth secret key
BETTER_AUTH_TRUSTED_ORIGINS= # Required: Comma-separated origins (e.g., http://localhost:3001)
GOOGLE_CLIENT_ID=            # Optional: Google OAuth client ID
GOOGLE_CLIENT_SECRET=        # Optional: Google OAuth client secret
```

## Backend Auth Middleware

### URL-Rewriting for Versioned Routes

```typescript
// apps/backend/src/config/auth.config.ts
import { toNodeHandler } from "better-auth/node"
import { AUTH_BASE_PATH, getAuth } from "@repo/auth"

function createAuthMiddleware(versionedAuthPaths: string[]) {
  const handler = toNodeHandler(getAuth())
  return (req, res, next) => {
    const url = req.url ?? ""
    const matchedPath = versionedAuthPaths.find(path => url.startsWith(path))
    if (matchedPath) {
      // Rewrite: /api/v1/auth/sign-in → /auth/sign-in
      req.url = url.replace(matchedPath, AUTH_BASE_PATH)
      return handler(req, res)
    }
    next()
  }
}

export function setupBetterAuth(app: INestApplication) {
  const httpServer = app.getHttpAdapter().getInstance()
  const authPaths = getVersionKeys().map(v => `/api/${v}/auth`)
  httpServer.use(createAuthMiddleware(authPaths))
}
```

### NestJS Auth Module

```typescript
// apps/backend/src/app.module.ts
import { AuthModule } from "@thallesp/nestjs-better-auth"
import { getAuth } from "@repo/auth"

@Module({
  imports: [
    AuthModule.forRoot({ auth: getAuth(), disableControllers: true }),
  ],
})
export class AppModule {}
```

### Session Decorator in Controllers

```typescript
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

@Controller()
export class TodosController {
  @Implement(v1.example.todo.create)
  async createTodo(@Session() session: UserSession) {
    return implement(v1.example.todo.create).handler(async ({ input }) => {
      return this.todosService.create({
        payload: input,
        authorId: session.user.id,  // Typed user from session
      })
    })
  }
}
```

## Frontend Auth — Browser Client

### Auth Client Setup

```typescript
// apps/web/services/better-auth/auth-client.ts
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: getAuthUrl(),  // e.g., "http://localhost:3000/api/v1/auth"
})
```

### AuthProvider Context

```tsx
// apps/web/services/better-auth/context/auth-provider.tsx
"use client"
import { createContext, useContext } from "react"
import { authClient } from "@/services/better-auth/auth-client"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: isLoading } = authClient.useSession()
  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
```

### Auth Actions (Sign In, Sign Up, Sign Out)

```typescript
import { authClient } from "@/services/better-auth/auth-client"

// Email/password sign in
await authClient.signIn.email({ email, password })

// Google OAuth
await authClient.signIn.social({ provider: "google" })

// Sign up
await authClient.signUp.email({ email, password, name })

// Sign out
await authClient.signOut()
```

## Frontend Auth — Server Components

### Server-Side Session Fetching

```typescript
// apps/web/services/better-auth/auth-server.ts
import { cache } from "react"
import { getCookieHeader } from "@/core/lib/cookie-utils"

export const getSession = cache(async () => {
  const cookieHeader = await getCookieHeader()
  const response = await fetch(`${getAuthUrl()}/get-session`, {
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    cache: "no-store",
  })
  if (!response.ok) return null
  return response.json()
})
```

### Cookie Forwarding

```typescript
// apps/web/core/lib/cookie-utils.ts
import { cookies } from "next/headers"

export async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies()
  return cookieStore.toString()
}
```

## Key Integration Points

| Layer | Package/File | Auth Mechanism |
|-------|-------------|----------------|
| Shared config | `@repo/auth` | `betterAuth()` with Drizzle adapter |
| Backend middleware | `auth.config.ts` | Express middleware with URL rewriting |
| Backend controllers | `@Session()` decorator | `@thallesp/nestjs-better-auth` |
| Frontend client | `auth-client.ts` | `createAuthClient()` from `better-auth/react` |
| Frontend SSR | `auth-server.ts` | Cookie forwarding with `React.cache()` |
| Frontend context | `auth-provider.tsx` | `authClient.useSession()` hook |
