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
updated: 2026-08-15
---

# Better Auth Skill

## Quick Reference

**When to Use**: Implementing auth flows, session handling, protecting routes, OAuth setup, or working with `@repo/auth`, `services/better-auth/`, or backend auth middleware

**Package**: `@repo/auth` — shared Better Auth configuration consumed by both web and backend

**Version**: Better Auth 1.4.x with Drizzle adapter, Google OAuth, email/password

## Architecture Overview

```
packages/auth/src/
  ├── index.ts               # Package entrypoint (re-exports)
  ├── config.ts              # authEnv + betterAuth() init + lazy singleton
  ├── secret-schema.ts       # authSecretSchema (fail-closed BETTER_AUTH_SECRET)
  ├── cookie-domain-schema.ts# BETTER_AUTH_COOKIE_DOMAIN validation
  ├── origin-list.ts         # parseOriginList (trim + drop empties)
  └── mailer/
      ├── send-mail.ts       # nodemailer send wrapper
      ├── transport-factory.ts # createTransport (throws in prod w/o SMTP_HOST)
      ├── bool-schema.ts     # booleanFromEnv coercion
      └── templates/         # verification-email.ts, reset-password-email.ts
  # NOTE: there is NO types.ts. Session/User/Account types are re-exported
  # from better-auth/types in index.ts; AuthSession comes from config.ts.

apps/backend/src/config/
  └── auth.config.ts    # Express middleware: URL rewriting + versioned routes

apps/web/services/better-auth/
  ├── auth-client.ts    # createAuthClient() for browser
  ├── auth-server.ts    # getSession() for server components
  ├── context/
  │   └── auth-provider.tsx  # AuthProvider (pass-through wrapper)
  └── lib/
      └── utils.ts      # getAuthUrl() helper

apps/web/core/lib/
  └── server-utils.ts   # getServerApiUrl()/getServerAuthUrl() — prefer
                        #   INTERNAL_API_BASE_URL (Docker network) for server fetches
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
import { parseOriginList } from "./origin-list.js"

export const AUTH_BASE_PATH = "/auth"

export function createAuth(): ReturnType<typeof betterAuth> {
  const db = createDBClient()
  const verificationRequired = authEnv.EMAIL_VERIFICATION_REQUIRED // defaults TRUE
  // If verification is required, sending is forced on so accounts can actually verify.
  const verificationEnabled = authEnv.EMAIL_VERIFICATION_ENABLED || verificationRequired

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { users, sessions, accounts, verifications },
      usePlural: true, // Tables are plural: "users" not "user"
    }),
    basePath: AUTH_BASE_PATH,
    secret: authEnv.BETTER_AUTH_SECRET, // validated by authSecretSchema (fail-closed)
    rateLimit: {
      enabled: true,
      window: authEnv.AUTH_RATE_LIMIT_WINDOW,
      max: authEnv.AUTH_RATE_LIMIT_MAX,
      // /get-session is what the app calls to resolve the viewer — it must NOT
      // share the credential budget, or normal browsing renders users logged out.
      customRules: { "/get-session": { window: authEnv.AUTH_RATE_LIMIT_WINDOW, max: 500 } },
    },
    emailVerification: {
      sendOnSignUp: verificationEnabled,
      sendVerificationEmail: async ({ user, token }) => { /* mailer, honors flags */ },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: verificationRequired, // TRUE by default (PRD decision)
      sendResetPassword: async ({ user, token }) => { /* swallows errors: no enum oracle */ },
    },
    // Google registered ONLY when BOTH creds present — no `as string` casting undefined.
    socialProviders: {
      ...(authEnv.GOOGLE_CLIENT_ID && authEnv.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              prompt: "select_account" as const,
              clientId: authEnv.GOOGLE_CLIENT_ID,
              clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
    },
    // Trimmed + empties dropped, so a trailing comma can't produce an "any" origin.
    trustedOrigins: parseOriginList(authEnv.BETTER_AUTH_TRUSTED_ORIGINS),
    // Pinned session lifetime — not inherited from library defaults.
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days absolute
      updateAge: 60 * 60 * 24, // sliding renewal, once/day
      cookieCache: { enabled: false }, // OFF: a signed-cookie cache outlives revocation
    },
    // Trusted, address-verifying providers only — auto-linking an unverified email is takeover.
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"], allowDifferentEmails: false },
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax", // strict breaks OAuth return leg; none is CSRF surface
        secure: process.env.NODE_ENV === "production", // dropped over http://localhost otherwise
        path: "/",
      },
      // Cross-subdomain cookies only when explicitly configured (narrowest default = host-only).
      ...(authEnv.BETTER_AUTH_COOKIE_DOMAIN && {
        crossSubDomainCookies: { enabled: true, domain: authEnv.BETTER_AUTH_COOKIE_DOMAIN },
      }),
    },
    // openAPI /reference is a debug surface — gated on ENABLE_API_DOCS (matches backend).
    plugins: [...(authEnv.ENABLE_API_DOCS ? [openAPI({ path: "/reference" })] : [])],
  })
}
```

### Fail-Closed Secret (`authSecretSchema`)

`BETTER_AUTH_SECRET` is validated by a shared Zod schema
(`packages/auth/src/secret-schema.ts`), imported by BOTH `@repo/auth` and the
backend's `env.config.ts` so the two processes never disagree on what signs a
session. It rejects (fail-closed, at module load):

- anything shorter than `AUTH_SECRET_MIN_LENGTH` (32); `openssl rand -base64 32` clears it
- template placeholders via `isPlaceholderSecret()` — prefixes like `default-secret`,
  `change-me`, `your-secret`, `<`, matched case-insensitively

A missing/weak/placeholder secret stops boot rather than silently enabling
session forgery for every account.

### Mailer, Email Verification & Password Reset

- `createTransport()` (`mailer/transport-factory.ts`) throws in production when
  `SMTP_HOST` is unset rather than falling back to a link-printing transport.
- Verification: `EMAIL_VERIFICATION_ENABLED` and `EMAIL_VERIFICATION_REQUIRED`
  both default **true**. Requiring verification forces sending on.
- Password reset (`sendResetPassword`) swallows transport errors on purpose:
  Better Auth returns the same response whether or not the account exists, so a
  leaked send-failure would become an account-enumeration oracle. Errors are
  logged (Pino redaction applies), never returned.
- Verification/reset URLs are built from `APP_WEB_URL`.

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

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `BETTER_AUTH_SECRET` | yes | — | `authSecretSchema`: ≥32 chars, no placeholders (fail-closed) |
| `BETTER_AUTH_TRUSTED_ORIGINS` | yes | — | comma-separated; parsed by `parseOriginList` |
| `BETTER_AUTH_COOKIE_DOMAIN` | no | unset (host-only) | enables cross-subdomain cookies when set |
| `GOOGLE_CLIENT_ID` | no | — | Google registered only if BOTH id+secret set |
| `GOOGLE_CLIENT_SECRET` | no | — | |
| `SMTP_HOST` | prod: yes | — | `createTransport` throws in prod when unset |
| `SMTP_PORT` | no | — | |
| `SMTP_USER` / `SMTP_PASS` | no | — | |
| `SMTP_SECURE` | no | `false` | `booleanFromEnv` |
| `MAIL_FROM` | no | `"Dev Mailer" <no-reply@localhost>` | |
| `APP_WEB_URL` | no | `http://localhost:3001` | base for verification/reset links |
| `EMAIL_VERIFICATION_ENABLED` | no | `true` | |
| `EMAIL_VERIFICATION_REQUIRED` | no | `true` | forces sending on |
| `ENABLE_API_DOCS` | no | `false` | gates openAPI `/reference` |
| `AUTH_RATE_LIMIT_WINDOW` | no | `60` | seconds |
| `AUTH_RATE_LIMIT_MAX` | no | `10` | credential routes; `/get-session` overridden to 500 |

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

### Custom guards reading the session (IMPORTANT)

`@thallesp/nestjs-better-auth` attaches `request.session` / `request.user` inside
its own global `AuthGuard` (registered via `AuthModule.forRoot`). Any *other* global
guard (e.g. a custom `RbacGuard` registered as `APP_GUARD`) may run **before** that
guard — global guard execution order is **not** guaranteed. A custom guard that reads
`request.session?.user?.id` can therefore see `undefined` and wrongly throw 401, even
though the cookie is valid and `@Session()` works fine in the controller (it runs
later, after the library guard).

Make the custom guard resolve the session itself instead of depending on order:

```typescript
import { fromNodeHeaders } from "better-auth/node"
import { getAuth } from "@repo/auth"

let userId = request.session?.user?.id ?? request.user?.id
if (!userId) {
  const session = await getAuth().api.getSession({ headers: fromNodeHeaders(request.headers) })
  if (session) {
    request.session = session   // attach for downstream @Session() consumers
    request.user = session.user
    userId = session.user?.id
  }
}
if (!userId) throw new UnauthorizedException("Authentication required")
```

Symptom this fixes: protected route returns **401 "Authentication required"** for a
logged-in user, while `/me`-style routes (no custom guard) return 200 with the same cookie.

## Frontend Auth — Browser Client

### Auth Client Setup

```typescript
// apps/web/services/better-auth/auth-client.ts
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: getAuthUrl(),  // e.g., "http://localhost:3000/api/v1/auth"
})
```

### AuthProvider

Better Auth's React client reads session state via `authClient.useSession()`
directly — it needs no context provider. `AuthProvider` is a pass-through
wrapper kept as a seam for future session logic (there is no `useAuth()` hook):

```tsx
// apps/web/services/better-auth/context/auth-provider.tsx
"use client"
import { type PropsWithChildren } from "react"

export function AuthProvider({ children }: PropsWithChildren) {
  return children
}
```

Consume the session directly where you need it: `const { data: session } = useSession()`.

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
import { type AuthSession } from "@repo/auth"
import { getCookieHeader } from "@/core/lib/cookie-utils"
import { getServerAuthUrl } from "@/core/lib/server-utils"

export const getSession = cache(async (): Promise<AuthSession | null> => {
  try {
    const cookieHeader = await getCookieHeader()
    const response = await fetch(`${getServerAuthUrl()}/get-session`, {
      headers: { "Content-Type": "application/json", cookie: cookieHeader },
      cache: "no-store",
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
})
```

`getServerAuthUrl()` (from `core/lib/server-utils.ts`) prefers the internal
Docker-network base (`INTERNAL_API_BASE_URL`) for server-side fetches, falling
back to the public API URL in local development.

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
