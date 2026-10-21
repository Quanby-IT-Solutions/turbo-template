# @repo/auth

Shared Better Auth configuration for backend and web applications.

## Structure

```
packages/auth/
├── src/
│   ├── index.ts          # Package exports
│   └── config.ts         # Better Auth configuration
└── package.json
```

## Usage

### Backend (NestJS)

The auth instance is configured and used via the `AuthModule`:

```typescript
import { auth } from "@repo/auth"

// Access auth API
const session = await auth.api.getSession({ headers })
```

### Web (Next.js)

Use the auth client from `services/better-auth/`:

```typescript
import { authClient } from "@/services/better-auth/auth-client"

// Sign in
await authClient.signIn.email({ email, password })

// Get session
const session = await authClient.getSession()
```

## Configuration

The auth instance is configured in `src/config.ts` with:

- Email + password authentication
- Google OAuth (optional)
- Session management
- Database adapter (Drizzle)

`ENABLE_API_DOCS` is optional and has no default in this package. The openAPI
`/reference` plugin is registered by `isApiDocsEnabled()` (`src/api-docs.ts`,
exported as `@repo/auth/api-docs`), the same rule the backend uses for Scalar
and `spec.json`: an explicit flag wins, otherwise docs are on only when
`NODE_ENV` is `development` (unset counts as development).

## Environment Variables

Required in the **backend** `.env`:

| Variable                      | Description                     |
| ----------------------------- | ------------------------------- |
| `BETTER_AUTH_SECRET`          | Auth secret key                 |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated trusted origins |
| `GOOGLE_CLIENT_ID`            | Google OAuth client ID          |
| `GOOGLE_CLIENT_SECRET`        | Google OAuth client secret      |
