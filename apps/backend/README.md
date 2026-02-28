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

| Variable                      | Required | Description                     |
| ----------------------------- | -------- | ------------------------------- |
| `DATABASE_URL`                | Yes      | PostgreSQL connection string    |
| `BETTER_AUTH_SECRET`          | Yes      | Auth secret key                 |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Yes      | Comma-separated trusted origins |
| `CORS_ORIGINS`                | Yes      | Comma-separated CORS origins    |
| `PORT`                        | No       | Server port (default: 3000)     |
| `GOOGLE_CLIENT_ID`            | No       | Google OAuth client ID          |
| `GOOGLE_CLIENT_SECRET`        | No       | Google OAuth client secret      |

See `.env.example` for reference.

## API Endpoints

- **Health**: `GET /api/v1/health` — Returns server status and database connectivity
- **Docs**: `GET /api/v1/docs` — Interactive API documentation (Scalar)
- **OpenAPI Spec**: `GET /api/v1/spec.json` — Raw OpenAPI JSON

## Scripts

| Command         | Description             |
| --------------- | ----------------------- |
| `pnpm dev`      | Start in watch mode     |
| `pnpm build`    | Build for production    |
| `pnpm start`    | Start production build  |
| `pnpm test`     | Run unit tests          |
| `pnpm test:e2e` | Run E2E tests           |
| `pnpm test:cov` | Run tests with coverage |
