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
cp apps/mobile/.env.example apps/mobile/.env

# Push database schema
pnpm db:push

# Build packages (required for first run)
pnpm build

# Generate AI agent rules (recommended - includes sub-agent-first workflow policy)
pnpm dlx @intellectronica/ruler apply

# Start development (web :3001, backend :3000 — separate ports)
pnpm dev
```

After `pnpm dev`:

| Service        | URL                                  |
| -------------- | ------------------------------------ |
| Web            | http://localhost:3001                |
| Backend API    | http://localhost:3000/api/v1         |
| API reference  | http://localhost:3000/api/v1/docs    |

## Coverage thresholds are a floor

These coverage numbers are the minimum for the scaffold. In your real project, raise them as you add tested features following the template's patterns — never lower them. Example modules (todo/notes) are excluded from coverage because you'll replace them. See `docs/QA-SETUP-CHANGES.md` for the full table.

### Run on a single port (Docker + Nginx)

Serve **web and backend through one origin** (and, in production, one TLS
cert) via the bundled Nginx reverse proxy — `/api/*` → backend, `/*` → web.

```bash
# Copy the root env (single-origin build args for the web image)
cp .env.example .env

# Build + start nginx + web + backend
docker compose up -d --build

# New clone tip: start/restart only the Nginx proxy without dependencies
docker compose up -d --no-deps nginx
```

| Services        | URL                            |
| -------------- | ------------------------------ |
| App (web)      | http://localhost               |
| Backend API    | http://localhost/api/v1        |
| API reference  | http://localhost/api/v1/docs   |

Notes:

- The bundled Nginx publishes port `80`. web/backend also bind to loopback
  (`127.0.0.1:3001` / `127.0.0.1:3000`) so an external proxy can reach them;
  they're not exposed to the LAN.
- Same origin → no browser CORS. Proxy config lives in `nginx/nginx.conf`
  (volume-mounted — edit then `docker compose restart nginx`).
- Set the backend's `DATABASE_URL` to `host.docker.internal:5432` to reach a
  Postgres running on your host (the container's `localhost` is itself).
- `CORS_ORIGINS` / `BETTER_AUTH_TRUSTED_ORIGINS` must include the proxy origin
  (`http://localhost`).
- Change the host port by editing the `nginx` service `ports` (e.g. `8080:80`),
  and update `NEXT_PUBLIC_*` in `.env` to match.

#### Use your own Nginx instead

The bundled Nginx is gated behind the `docker-proxy` compose profile, enabled by
default via `COMPOSE_PROFILES=docker-proxy` in the root `.env`. To swap in an
external/host Nginx, set `COMPOSE_PROFILES=` (empty) and bring the stack up:

```bash
docker compose up -d --build   # web + backend only; port 80 is free
```

Point your Nginx at `127.0.0.1:3001` (web) and `127.0.0.1:3000` (backend) —
reuse the routing in `nginx/nginx.conf`. If the external proxy keeps the same
single origin (`/api/*` → backend, `/*` → web), no CORS or `NEXT_PUBLIC_*`
changes are needed; if it splits web/api across different domains, update
`NEXT_PUBLIC_API_BASE_URL` (rebuild web) and the backend `CORS_ORIGINS` /
`BETTER_AUTH_TRUSTED_ORIGINS`.

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

| Variable                      | Required | App         | Description                           |
| ----------------------------- | -------- | ----------- | ------------------------------------- |
| `DATABASE_URL`                | ✅       | Backend, DB | PostgreSQL connection string          |
| `BETTER_AUTH_SECRET`          | ✅       | Backend     | Auth secret (openssl rand -base64 32) |
| `BETTER_AUTH_TRUSTED_ORIGINS` | ✅       | Backend     | Comma-separated trusted origins       |
| `CORS_ORIGINS`                | ✅       | Backend     | Comma-separated CORS origins          |
| `PORT`                        | ❌       | Backend     | Server port (default: 3000)           |
| `GOOGLE_CLIENT_ID`            | ❌       | Backend     | Google OAuth client ID                |
| `GOOGLE_CLIENT_SECRET`        | ❌       | Backend     | Google OAuth client secret            |
| `NEXT_PUBLIC_APP_URL`         | ✅       | Web         | Web app URL                           |
| `NEXT_PUBLIC_API_BASE_URL`    | ✅       | Web         | Backend API base URL                  |
| `NEXT_PUBLIC_API_VERSION`     | ✅       | Web         | API version (default: v1)             |
| `INTERNAL_API_BASE_URL`       | ❌       | Web         | SSR-only API URL (Docker net)         |
| `COMPOSE_PROFILES`            | ❌       | Root/Docker | `docker-proxy` runs bundled Nginx; empty = external proxy |

Copy from `.env.example` in each app: `apps/backend/.env`, `apps/web/.env`, `packages/db/.env`.

**Separate ports (native `pnpm dev`):** `NEXT_PUBLIC_APP_URL=http://localhost:3001`,
`NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api`.
**Single port (Docker proxy):** `NEXT_PUBLIC_APP_URL=http://localhost`,
`NEXT_PUBLIC_API_BASE_URL=http://localhost/api` (set in the root `.env`; baked
into the web image at build time).

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

### How It Works

| Branch       | Environment | Strategy                            |
| ------------ | ----------- | ----------------------------------- |
| `staging`    | Staging     | Single EC2 + Docker Compose + Nginx |
| `production` | Production  | ECS Fargate + ALB (auto-scaling)    |

Merge to the branch → CI runs → Docker images build → deploy automatically.

Infrastructure is managed separately via [turbo-infrastructure](https://github.com/Quanby-IT-Solutions/turbo-infrastructure) (Terraform).

### Deploy

```bash
# Deploy to staging
git checkout staging && git merge dev && git push

# Deploy to production
git checkout production && git merge staging && git push
```

Monitor progress in **GitHub → Actions**.

### GitHub Environment Setup

Before your first deploy, go to **Settings → Environments** and create `staging` and `production`.

#### Variables

| Variable                    | Description               | Staging                             | Production                          |
| --------------------------- | ------------------------- | ----------------------------------- | ----------------------------------- |
| `AWS_REGION`                | AWS region                | `ap-southeast-1`                    | `ap-southeast-1`                    |
| `PROJECT_NAME`              | Project identifier        | `turbo-template`                    | `turbo-template`                    |
| `ECR_REPOSITORY_WEB`        | ECR repo name for web     | `turbo-template-web-staging`        | `turbo-template-web-production`     |
| `ECR_REPOSITORY_BACKEND`    | ECR repo name for backend | `turbo-template-backend-staging`    | `turbo-template-backend-production` |
| `DOMAIN_WEB`                | Web domain                | `stg-turbo.quanbyit.com`            | `turbo.quanbyit.com`                |
| `DOMAIN_API`                | API domain                | `stg-turbo-be.quanbyit.com`         | `turbo-be.quanbyit.com`             |
| `ECS_CLUSTER`               | ECS cluster name          |                                     | `turbo-template-production`         |
| `ECS_SERVICE_WEB`           | ECS web service name      |                                     | `turbo-template-web-production`     |
| `ECS_SERVICE_BACKEND`       | ECS backend service name  |                                     | `turbo-template-backend-production` |
| `ECS_EXECUTION_ROLE_ARN`    | ECS execution role ARN    |                                     | `arn:aws:iam::123...:role/...`      |
| `ECS_TASK_ROLE_ARN`         | ECS task role ARN         |                                     | `arn:aws:iam::123...:role/...`      |
| `NEXT_PUBLIC_APP_URL`       | Public web URL            | `https://stg-turbo.quanbyit.com`    | `https://turbo.quanbyit.com`        |
| `NEXT_PUBLIC_API_BASE_URL`  | Public API URL            | `https://stg-turbo-be.quanbyit.com` | `https://turbo-be.quanbyit.com`     |
| `BETTER_AUTH_COOKIE_DOMAIN` | Cookie domain for auth    |                                     | `.quanbyit.com`                     |

#### Secrets

| Secret                        | Description              | Staging                               | Production                            |
| ----------------------------- | ------------------------ | ------------------------------------- | ------------------------------------- |
| `AWS_ACCESS_KEY_ID`           | IAM access key           | `AKIA...`                             | `AKIA...`                             |
| `AWS_SECRET_ACCESS_KEY`       | IAM secret key           | `wJal...`                             | `wJal...`                             |
| `EC2_HOST`                    | EC2 public IP / hostname | `54.123.45.67`                        |                                       |
| `EC2_USER`                    | SSH user                 | `ubuntu`                              |                                       |
| `EC2_SSH_KEY`                 | EC2 SSH private key      | `-----BEGIN RSA PRIVATE KEY-----...`  |                                       |
| `DATABASE_URL`                | PostgreSQL connection    | `postgresql://user:pass@host:5432/db` | `postgresql://user:pass@host:5432/db` |
| `BETTER_AUTH_SECRET`          | Auth signing secret      | `openssl rand -base64 32`             | `openssl rand -base64 32`             |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Trusted origins          | `https://stg-turbo.quanbyit.com`      | `https://turbo.quanbyit.com`          |
| `CORS_ORIGINS`                | Allowed CORS origins     | `https://stg-turbo.quanbyit.com`      | `https://turbo.quanbyit.com`          |
| `GOOGLE_CLIENT_ID`            | Google OAuth client ID   | `123...apps.googleusercontent.com`    | `456...apps.googleusercontent.com`    |
| `GOOGLE_CLIENT_SECRET`        | Google OAuth secret      | `GOCSPX-...`                          | `GOCSPX-...`                          |

> Get values from `terraform output` in the [turbo-infrastructure](https://github.com/Quanby-IT-Solutions/turbo-infrastructure) repo.

### First-Time Staging SSL

After the first staging deployment, SSH into EC2 to set up HTTPS:

```bash
ssh -i your-key.pem ubuntu@<EC2_HOST>
sudo certbot --nginx -d stg-turbo.quanbyit.com -d stg-turbo-be.quanbyit.com
sudo certbot renew --dry-run
```

Production uses AWS ACM certificates via the ALB — no manual SSL needed.

### Docker (Local) — single-port reverse proxy

The local Docker stack runs behind an Nginx reverse proxy, so both apps share
**one origin / one port** (and in production, **one TLS cert**):

- `/api/*` → backend (NestJS)
- `/*` → web (Next.js)

```bash
cp .env.example .env            # single-origin build args for the web image
docker-compose up -d --build    # start nginx + web + backend
```

Open **http://localhost** for the whole app. web (`3001`) and backend
(`3000`) are bound to loopback (`127.0.0.1`) for an external proxy but not
exposed to the LAN — the bundled Nginx is the entrypoint on port `80`.

Because the browser uses one origin, there is no CORS on the client path. Config
lives in `nginx/nginx.conf`. SSR still talks to the backend over the internal
Docker network via `INTERNAL_API_BASE_URL=http://backend:3000/api`.

**Swap the proxy:** the bundled Nginx runs under the `docker-proxy` compose
profile (`COMPOSE_PROFILES=docker-proxy` in `.env`, on by default). Set
`COMPOSE_PROFILES=` empty to skip it and use your own Nginx against
`127.0.0.1:3001` / `127.0.0.1:3000`.

**Production extension:** uncomment the 443/TLS server block in
`nginx/nginx.conf`, set `server_name` to your one domain, and drop in a single
certbot/ACM cert. Same path routing — no second domain or cert needed.

### Troubleshooting

<details>
<summary>Staging</summary>

```bash
ssh -i your-key.pem ubuntu@<EC2_HOST>
cd /opt/staging && docker compose -f docker-compose.staging.yml ps
docker compose -f docker-compose.staging.yml logs web
docker compose -f docker-compose.staging.yml logs backend
sudo nginx -t && sudo systemctl status nginx
```

</details>

<details>
<summary>Production</summary>

```bash
aws ecs describe-services --cluster <CLUSTER> --services <SERVICE> --query 'services[0].events[:5]'
aws logs tail /ecs/<PROJECT_NAME>-web-production --follow
aws logs tail /ecs/<PROJECT_NAME>-backend-production --follow
```

</details>

## Git Hooks

This repo uses [Husky](https://typicode.github.io/husky/) to run tests before pushing.

| Hook       | What it does                                           |
| ---------- | ------------------------------------------------------ |
| `pre-push` | Runs `turbo test --affected` to block failing pushes   |

To bypass the hook (e.g., for WIP pushes):

```bash
git push --no-verify
```

## Links

- [Turborepo](https://turbo.build/docs) · [Next.js](https://nextjs.org/docs) · [NestJS](https://docs.nestjs.com/) · [Drizzle](https://orm.drizzle.team/) · [Better Auth](https://better-auth.com/docs)
 
 