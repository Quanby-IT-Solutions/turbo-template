# @repo/backend

NestJS API server with oRPC contracts, Better Auth, and Drizzle ORM.

## Tech Stack

- **Framework**: NestJS
- **API Contracts**: oRPC (type-safe, OpenAPI-generated)
- **Database**: Drizzle ORM + PostgreSQL
- **Auth**: Better Auth
- **Validation**: Zod (via `@repo/contracts`)
- **API Docs**: Scalar (auto-generated from oRPC contracts)

## Structure

```
apps/backend/src/
├── bootstrap.ts             # App creation and startup orchestrator
├── main.ts                  # Entry point
├── app.module.ts            # Root module
├── common/                  # Reusable NestJS modules
│   ├── database/            # Database module, providers
│   ├── decorators/          # Custom decorators
│   ├── filters/             # Global exception filters
│   └── orpc/                # oRPC integration module
├── config/                  # App configuration
│   ├── api-versions.config.ts  # Version registry and contract re-exports
│   ├── app.config.ts           # CORS, body parser, graceful shutdown
│   ├── auth.config.ts          # Better Auth middleware and routes
│   ├── env.config.ts           # Environment validation
│   └── swagger.config.ts       # OpenAPI doc generation (Scalar)
├── modules/                 # Feature modules by API version
│   └── v1/
│       ├── v1.module.ts
│       ├── health/
│       │   ├── health.module.ts
│       │   ├── health.controller.ts
│       │   └── health.service.ts
│       └── examples/
│           └── todos/
│               ├── todos.module.ts
│               ├── todos.controller.ts
│               ├── todos.service.ts
│               └── todos.controller.spec.ts
└── utils/                   # Pure utility functions
    └── openapi.ts
```

## Development

```bash
# From monorepo root
pnpm dev:backend

# Or directly
pnpm --filter @repo/backend dev
```

Runs on [http://localhost:3000](http://localhost:3000)

## Run Production Entry Point Locally

Use this when you want local behavior that matches Docker/ECS (`node dist/main.js`):

```bash
# From monorepo root
pnpm build
pnpm --filter @repo/backend start
```

Why this flow: it ensures dependent workspace packages are built before backend starts.

## Environment Variables

### Server

| Variable       | Required | Default       | Description                     |
| -------------- | -------- | ------------- | ------------------------------- |
| `NODE_ENV`     | No       | `development` | Runtime environment             |
| `PORT`         | No       | `3000`        | Server port                     |
| `CORS_ORIGINS` | Yes      | —             | Comma-separated CORS origins    |

### Database

| Variable       | Required | Default | Description                  |
| -------------- | -------- | ------- | ---------------------------- |
| `DATABASE_URL` | Yes      | —       | PostgreSQL connection string |

### Authentication

| Variable                      | Required | Default | Description                          |
| ----------------------------- | -------- | ------- | ------------------------------------ |
| `BETTER_AUTH_SECRET`          | Yes      | —       | Auth secret key                      |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Yes      | —       | Comma-separated trusted origins      |
| `BETTER_AUTH_COOKIE_DOMAIN`   | No       | —       | Cross-subdomain cookie domain        |

### OAuth (Google)

| Variable               | Required | Default | Description             |
| ---------------------- | -------- | ------- | ----------------------- |
| `GOOGLE_CLIENT_ID`     | No       | —       | Google OAuth client ID  |
| `GOOGLE_CLIENT_SECRET` | No       | —       | Google OAuth client secret |

### Rate Limiting

| Variable                | Required | Default | Description                                        |
| ----------------------- | -------- | ------- | -------------------------------------------------- |
| `THROTTLE_TTL`          | No       | `60000` | Window (ms) for the default limiter                |
| `THROTTLE_LIMIT`        | No       | `100`   | Max requests per window (default limiter)          |
| `THROTTLE_STRICT_TTL`   | No       | `60000` | Window (ms) for the strict limiter                 |
| `THROTTLE_STRICT_LIMIT` | No       | `10`    | Max requests per window (strict limiter)           |
| `TRUST_PROXY`           | No       | `1`     | Trusted proxy hops. `1` is one hop: nginx locally (it sets `X-Forwarded-For`); production's load balancer appends `X-Forwarded-For`. Staging in this repo is EC2 plus an Elastic IP; any load balancer there is outside this repo |

### Auth Rate Limiting (Better Auth)

| Variable                 | Required | Default | Description                          |
| ------------------------ | -------- | ------- | ------------------------------------ |
| `AUTH_RATE_LIMIT_WINDOW` | No       | `60`    | Rate-limit window in seconds         |
| `AUTH_RATE_LIMIT_MAX`    | No       | `10`    | Max auth requests per window         |

### Logging

| Variable    | Required | Default | Description                                          |
| ----------- | -------- | ------- | ---------------------------------------------------- |
| `LOG_LEVEL` | No       | `info`  | Pino level: fatal/error/warn/info/debug/trace        |

### API Docs

| Variable          | Required | Default            | Description                                            |
| ----------------- | -------- | ------------------ | ----------------------------------------------------- |
| `ENABLE_API_DOCS` | No       | on in development (unset NODE_ENV counts as development); off otherwise | Shared with `@repo/auth`. Explicit true/false or 1/0 wins |

### Email / SMTP

| Variable      | Required | Default                             | Description                                       |
| ------------- | -------- | ----------------------------------- | ------------------------------------------------- |
| `SMTP_HOST`   | No       | — (dev console transport)           | Leave unset to print emails to stdout             |
| `SMTP_PORT`   | No       | `587`                               | SMTP submission port                              |
| `SMTP_USER`   | No       | —                                   | SMTP username                                     |
| `SMTP_PASS`   | No       | —                                   | SMTP password                                     |
| `SMTP_SECURE` | No       | `false`                             | `true` for port 465 (TLS), `false` for STARTTLS   |
| `MAIL_FROM`   | No       | `"Dev Mailer" <no-reply@localhost>` | Sender address shown in emails                    |
| `APP_WEB_URL` | No       | `http://localhost:3001`             | Base URL for email links (verify/reset)           |

### Email Verification

| Variable                      | Required | Default | Description                                    |
| ----------------------------- | -------- | ------- | ---------------------------------------------- |
| `EMAIL_VERIFICATION_ENABLED`  | No       | `true`  | Send verification emails on signup             |
| `EMAIL_VERIFICATION_REQUIRED` | No       | `false` | Enforce email verification before login        |

See `.env.example` for reference.

## Features

### Rate Limiting

- Two named throttlers: `default` (all routes, `THROTTLE_TTL`/`THROTTLE_LIMIT`) and `strict` (mutating routes decorated with `@StrictThrottle()`, `THROTTLE_STRICT_TTL`/`THROTTLE_STRICT_LIMIT`).
- Throttler storage is **in-memory** (`ThrottlerStorageService`). Counters reset on restart. Multi-instance deployments (horizontal scaling) require a shared store such as Redis (`ThrottlerStorageRedis`) — a documented future step.
- `TRUST_PROXY` (default `1`) is the hop count Express uses to read the client address from `X-Forwarded-For`. Local / dev is nginx, which sets the header to `$remote_addr`. Production is the load balancer, which appends the address it saw. Staging in this repo is EC2 plus an Elastic IP; any load balancer there is managed outside this repo. `1` matches one hop. The deployed compose files publish backend port 3000 as `${BACKEND_BIND_ADDRESS:-0.0.0.0}`. On EC2 the Elastic IP is translated 1:1 to the private IPv4, so binding to the private address only limits the host-side publish to that one interface. On production, direct access must be blocked by a security group that allows port 3000 only from the load balancer's security group, and that group is managed outside this repo. Set that variable on production only. It must stay unset on staging while the staging workflow probes the host address.
- Auth routes (`/api/v*/auth/*`) are throttled by Better Auth's built-in `rateLimit` (`AUTH_RATE_LIMIT_WINDOW`/`AUTH_RATE_LIMIT_MAX`, default `10` per `60` seconds), not the NestJS throttler.

### Transactional Email

- When `SMTP_HOST` is **not set** (default for a fresh clone), a dev console transport is used: emails are serialised to JSON and printed to stdout — no real SMTP needed, the app boots and "sends" without any mail server.
- When `SMTP_HOST` is set, a real nodemailer SMTP transport is used with the configured credentials.
- `EMAIL_VERIFICATION_ENABLED=true` (default): verification emails are sent on signup. `EMAIL_VERIFICATION_REQUIRED=false` (default): users can log in without verifying — safe for development. Set both to `true` in production to enforce verification.
- Password-reset emails are always sent when requested (no separate flag).
- Email links point to `APP_WEB_URL/verify-email?token=…` and `APP_WEB_URL/reset-password?token=…`.

### Structured Logging & Request ID

- Uses `nestjs-pino` backed by `pino`. In development (`NODE_ENV=development`), output is pretty-printed via `pino-pretty`. In production, output is newline-delimited JSON.
- `LOG_LEVEL` controls verbosity (default `info`).
- Every request receives a correlation id (`X-Request-Id`). Inbound `X-Request-Id` headers are honoured for distributed tracing; otherwise a UUID is generated. The id is echoed on the response header.
- Sensitive fields are redacted from logs: `req.headers.authorization`, `req.headers.cookie`, `res.headers['set-cookie']`, `req.body.password`.

### API Docs (Scalar)

- Interactive Scalar UI at `/api/v1/docs`, raw OpenAPI spec at `/api/v1/spec.json`, Better Auth schema at `/api/v1/auth/open-api`, and the Better Auth reference at `/api/v1/auth/reference`.
- **Default behaviour:** docs and the auth reference follow one rule, shared with `@repo/auth`: **on** when `NODE_ENV` is `development` or unset, **off** in test and production. Whenever docs are on, the spec includes the `/v1/auth/*` paths.
- Override with `ENABLE_API_DOCS=true` (enable in any environment) or `ENABLE_API_DOCS=false` (disable in any environment).
- When disabled, `/api/v1/docs`, `/api/v1/spec.json`, `/api/v1/auth/open-api`, and `/api/v1/auth/reference` are not served.

## API Endpoints

- **Health**: `GET /api/v1/health` — Returns server status and database connectivity
- **Docs**: `GET /api/v1/docs` — Interactive API documentation (Scalar)
- **OpenAPI Spec**: `GET /api/v1/spec.json` — Raw OpenAPI JSON

## E2E tests

`pnpm test:e2e` boots the real API and signs in as the seeded admin
(`admin@turbo-template.local`). From the repo root, before the first run:

1. `apps/backend/.env` and `packages/db/.env` exist (copied from the examples) and their `DATABASE_URL` values are the same local database.
2. `BETTER_AUTH_SECRET` in `apps/backend/.env` is a generated secret, not the example placeholder.
3. `SEED_ADMIN_PASSWORD` is set in `packages/db/.env` only. The suite loads that file. Do not copy the password into `apps/backend/.env`. `E2E_ADMIN_PASSWORD` is an optional explicit override; there is no default password.
4. `pnpm db:seed` has been run. A later seed does not rotate a password already stored. When the stored password was random or differs from `SEED_ADMIN_PASSWORD`, run `pnpm db:seed -- --force-password`.

From the repo root: `pnpm -F @repo/backend test:e2e`.

## Scripts

| Command         | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `pnpm dev`      | Start in watch mode                                                         |
| `pnpm build`    | Build for production                                                        |
| `pnpm start`    | Start production build                                                      |
| `pnpm test`     | Run unit tests                                                              |
| `pnpm test:e2e` | Run e2e tests (needs `pnpm db:seed` and `SEED_ADMIN_PASSWORD`; see above)  |
| `pnpm test:cov` | Run tests with coverage                                                     |
