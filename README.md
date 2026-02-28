# Quanby Turbo Template

A TypeScript-first monorepo template using **Turborepo** and **pnpm** for full-stack development.

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Frontend  | Next.js 16, Tailwind CSS, shadcn/ui |
| Backend   | NestJS                              |
| Mobile    | Flutter                             |
| Database  | Drizzle ORM + PostgreSQL            |
| Auth      | Better Auth                         |
| Contracts | Zod schemas + DTOs                  |

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment files (copy from .env.example)
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env

# Push database schema
pnpm db:push

# Build packages (required for first run)
pnpm build

# Generate AI agent rules (optional)
pnpm dlx @intellectronica/ruler apply

# Start development
pnpm dev
```

## Project Structure

```
├── apps/
│   ├── web/           # Next.js frontend (port 3001)
│   ├── backend/       # NestJS API (port 3000)
│   └── mobile/        # Flutter app
├── packages/
│   ├── auth/          # Shared auth config
│   ├── contracts/     # API contracts & DTOs
│   └── db/            # Database schema
└── tooling/           # Shared configs (ESLint, Prettier, TypeScript)
```

## Environment Variables

### Backend (`apps/backend/.env`)

| Variable                      | Required | Description                           |
| ----------------------------- | -------- | ------------------------------------- |
| `DATABASE_URL`                | ✅       | PostgreSQL connection string          |
| `BETTER_AUTH_SECRET`          | ✅       | Auth secret (openssl rand -base64 32) |
| `BETTER_AUTH_TRUSTED_ORIGINS` | ✅       | Comma-separated trusted origins       |
| `CORS_ORIGINS`                | ✅       | Comma-separated CORS origins          |
| `PORT`                        | ❌       | Server port (default: 3000)           |
| `GOOGLE_CLIENT_ID`            | ❌       | Google OAuth client ID                |
| `GOOGLE_CLIENT_SECRET`        | ❌       | Google OAuth client secret            |

### Web (`apps/web/.env`)

| Variable                   | Required | Description              |
| -------------------------- | -------- | ------------------------ |
| `NEXT_PUBLIC_APP_URL`      | ✅       | Web app URL              |
| `NEXT_PUBLIC_API_BASE_URL` | ✅       | Backend API base URL     |
| `NEXT_PUBLIC_API_VERSION`  | ✅       | API version (default: 1) |

### Database (`packages/db/.env`)

| Variable       | Required | Description                  |
| -------------- | -------- | ---------------------------- |
| `DATABASE_URL` | ✅       | PostgreSQL connection string |

## Scripts

| Command           | Description                |
| ----------------- | -------------------------- |
| `pnpm dev`        | Start all apps in dev mode |
| `pnpm build`      | Build all apps             |
| `pnpm lint`       | Run ESLint                 |
| `pnpm typecheck`  | Run TypeScript checks      |
| `pnpm format:fix` | Format code with Prettier  |
| `pnpm db:push`    | Push schema to database    |
| `pnpm db:studio`  | Open Drizzle Studio        |

## Backend: Production-like Local Run

To mirror Docker/ECS behavior for backend startup, build workspace dependencies first, then run backend start:

```bash
pnpm build
pnpm --filter @repo/backend start
```

This avoids cases where a backend-only build misses required workspace package build outputs.

## Shared Packages

```typescript
// Auth configuration
import { auth } from "@repo/auth"
// API contracts & DTOs
import { CreateTodoDto, TodoSchema } from "@repo/contracts"
// Database client & schema
import { db } from "@repo/db"
import { todos, users } from "@repo/db/schema"
```

## Deployment

This template includes Docker and AWS ECS configurations:

- **Docker**: `docker-compose.yml` for local containerized development
- **CI/CD**: GitHub Actions workflows for staging and production
- **AWS**: ECS task definitions in `aws/ecs/`

See `aws/setup-guide.md` for deployment instructions.

## Links

- [Turborepo](https://turbo.build/docs) · [Next.js](https://nextjs.org/docs) · [NestJS](https://docs.nestjs.com/) · [Drizzle](https://orm.drizzle.team/) · [Better Auth](https://better-auth.com/docs)
