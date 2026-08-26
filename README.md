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

# Generate BETTER_AUTH_SECRET and paste it into apps/backend/.env — the backend
# refuses to boot while this is the template placeholder (see below).
openssl rand -base64 32

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

| Service       | URL                               |
| ------------- | --------------------------------- |
| Web           | http://localhost:3001             |
| Backend API   | http://localhost:3000/api/v1      |
| API reference | http://localhost:3000/api/v1/docs |

## Coverage thresholds are a floor

These coverage numbers are the minimum for the scaffold. In your real project, raise them as you add tested features following the template's patterns — never lower them. Example modules (todo/notes) are excluded from coverage because you'll replace them. See `docs/QA-SETUP-CHANGES.md` for the full table.

### Run on a single port (Docker + Nginx)

Serve **web and backend through one origin** (and, in production, one TLS
cert) via the bundled Nginx reverse proxy — `/api/*` → backend, `/*` → web.

```bash
# Copy the root env (single-origin build args for the web image)
cp .env.example .env

# Then set REDIS_PASSWORD in .env — it ships empty and every compose command
# refuses to run until it has a value:
#   openssl rand -base64 24

# Build + start nginx + web + backend
docker compose up -d --build

# New clone tip: start/restart only the Nginx proxy without dependencies.
# Still needs a complete root .env: --no-deps limits what STARTS, not what
# Compose parses, and it interpolates the whole file before choosing services.
docker compose up -d --no-deps nginx
```

| Services      | URL                          |
| ------------- | ---------------------------- |
| App (web)     | http://localhost             |
| Backend API   | http://localhost/api/v1      |
| API reference | http://localhost/api/v1/docs |

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

| Variable                      | Required | App         | Description                                               |
| ----------------------------- | -------- | ----------- | --------------------------------------------------------- |
| `DATABASE_URL`                | ✅       | Backend, DB | PostgreSQL connection string                              |
| `BETTER_AUTH_SECRET`          | ✅       | Backend     | Session signing secret. Must be >= 32 chars and NOT a placeholder — backend fails to boot otherwise. Generate: `openssl rand -base64 32` (see [Generating BETTER_AUTH_SECRET](#generating-better_auth_secret)) |
| `BETTER_AUTH_TRUSTED_ORIGINS` | ✅       | Backend     | Comma-separated trusted origins                           |
| `CORS_ORIGINS`                | ✅       | Backend     | Comma-separated CORS origins                              |
| `PORT`                        | ❌       | Backend     | Server port (default: 3000)                               |
| `GOOGLE_CLIENT_ID`            | ❌       | Backend     | Google OAuth client ID                                    |
| `GOOGLE_CLIENT_SECRET`        | ❌       | Backend     | Google OAuth client secret                                |
| `REDIS_URL`                   | ❌       | Backend     | Shared throttle counters + RBAC cache (see below)         |
| `REDIS_KEY_PREFIX`            | ❌       | Backend     | Key namespace (default: `turbo-template`)                 |
| `REDIS_PASSWORD`              | ✅ Docker | Docker      | Set in the **root** `.env`. Every `docker compose` command needs it — including `--no-deps` ones — because Compose interpolates the whole file before choosing services |
| `NEXT_PUBLIC_APP_URL`         | ✅       | Web         | Web app URL                                               |
| `NEXT_PUBLIC_API_BASE_URL`    | ✅       | Web         | Backend API base URL                                      |
| `NEXT_PUBLIC_API_VERSION`     | ✅       | Web         | API version (default: v1)                                 |
| `INTERNAL_API_BASE_URL`       | ❌       | Web         | SSR-only API URL (Docker net)                             |
| `COMPOSE_PROFILES`            | ❌       | Root/Docker | `docker-proxy` runs bundled Nginx; empty = external proxy |
| `SENTRY_ENABLED`              | ❌       | Backend, Web, Mobile | Crash reporting master switch (off unless `true` **and** a DSN is set). Mobile reads it as a `--dart-define`, not an env var |
| `SENTRY_DSN`                  | ❌       | Backend, Web, Mobile | Ingest DSN (backend + web server/edge; mobile takes it as a `--dart-define`) |
| `SENTRY_ENVIRONMENT`          | ❌       | Backend, Web, Mobile | Environment tag. Backend/web default to `NODE_ENV`; mobile is a `--dart-define` defaulting to `development` |
| `SENTRY_TRACES_SAMPLE_RATE`   | ❌       | Backend     | Trace sampling 0–1 (default: 0, errors only)              |
| `NEXT_PUBLIC_SENTRY_ENABLED`  | ❌       | Web         | Browser crash reporting switch                            |
| `NEXT_PUBLIC_SENTRY_DSN`      | ❌       | Web         | Browser ingest DSN                                        |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | ❌    | Web         | Browser environment tag (falls back to `SENTRY_ENVIRONMENT`) |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | ❌ | Web      | Trace sampling 0–1 for all web runtimes (default: 0)      |
| `SENTRY_ORG`                  | ❌       | Web (build) | Sentry org slug, source-map upload only                   |
| `SENTRY_PROJECT`              | ❌       | Web (build) | Sentry project slug, source-map upload only               |
| `SENTRY_AUTH_TOKEN`           | ❌       | Web (build) | Source-map upload credential. Never `NEXT_PUBLIC_*`       |

Copy from `.env.example` in each app: `apps/backend/.env`, `apps/web/.env`, `packages/db/.env`.

### Environment validation

All three validators (backend, `@repo/auth`, web) run at module load and fail
the process on a missing or malformed value. They used to be skipped whenever
`CI` was truthy — disabled in exactly the environment meant to catch
misconfiguration.

`SKIP_ENV_VALIDATION=true` is the one documented escape hatch, for build-only
jobs with no runtime configuration to validate. It is deliberately explicit:
nothing skips validation by accident.

```bash
SKIP_ENV_VALIDATION=true pnpm build   # e.g. a container image build
```

### Generating BETTER_AUTH_SECRET

On a fresh clone `apps/backend/.env.example` ships a **non-functional
placeholder**:

```
BETTER_AUTH_SECRET=<replace-me-run-openssl-rand-base64-32>
```

The backend **refuses to boot** with this value. Its shared validator
(`packages/auth/src/secret-schema.ts`) rejects a secret that is shorter than
**32 characters** or that starts with a known template prefix (`replace-me`,
`change-me`, `your-secret`, `default-secret`, `<`, …). This is deliberate
fail-closed behaviour: a published/guessable secret means every session — Admin
included — is forgeable. Startup aborts with:

```
BETTER_AUTH_SECRET is still the template placeholder — sessions signed with a published secret are forgeable. Generate one with: openssl rand -base64 32
```

Generate a real value and paste it into `apps/backend/.env`:

```bash
# openssl (Git Bash, macOS, Linux) — produces 44 base64 chars, clears the floor
openssl rand -base64 32

# No openssl? Node works everywhere pnpm does:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

```powershell
# PowerShell (Windows), cryptographically secure:
$b = [byte[]]::new(32); [Security.Cryptography.RandomNumberGenerator]::Fill($b); [Convert]::ToBase64String($b)
```

Notes:

- Only the **backend** needs it. The web app has no `BETTER_AUTH_SECRET` — it
  calls the backend, which owns session signing.
- Rotating it invalidates every existing session (everyone is signed out).
- In deployments this comes from the GitHub Environment secret, not `.env` — see
  [Deployment → Secrets](#secrets).

### Redis — when you need it

Optional for a single backend instance, **required for more than one**. Two
subsystems keep state that has to be shared:

- **Rate limiting.** Counters are per-process without Redis, so a limit of 100
  becomes 100 × instances.
- **RBAC permission cache.** A revoked role keeps working on every instance
  except the one that revoked it, until the 60s TTL lapses.

Set `REDIS_URL=redis://:<password>@<host>:6379`. The compose files include a
`redis` service with `requirepass` and **no published port** — it is reachable
only on the internal network. It requires `REDIS_PASSWORD` and refuses to start
without one.

If Redis becomes unavailable the app keeps serving, degrading two different
ways on purpose:

| Subsystem | Behaviour | Why |
| --- | --- | --- |
| RBAC cache | **Fail closed** — every read falls through to the database | Slower but always correct. A cache that answers from a store it can no longer invalidate is how revoked access survives. |
| Throttler | **Fail open** — requests are allowed, logged once | It guards how *often*, not *who*. Refusing all traffic because the counter is unreachable turns a dependency outage into a full outage. |

**Separate ports (native `pnpm dev`):** `NEXT_PUBLIC_APP_URL=http://localhost:3001`,
`NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api`.
**Single port (Docker proxy):** `NEXT_PUBLIC_APP_URL=http://localhost`,
`NEXT_PUBLIC_API_BASE_URL=http://localhost/api` (set in the root `.env`; baked
into the web image at build time).

## Error Monitoring (Sentry)

All three apps can report crashes to Sentry, and all three ship with it **off**.
Every surface needs *both* an enable flag *and* a DSN, but the checks differ:

- **Backend and web** require a *parseable* DSN, warn once when the flag is set
  without one instead of silently dropping events, and tag events with
  `SENTRY_ENVIRONMENT` falling back to `NODE_ENV`. Both expose a
  development-only diagnostics endpoint/page.
- **Mobile** enables on `SENTRY_ENABLED=true` plus a *non-empty* `SENTRY_DSN`.
  The current implementation emits **no startup warning** and has **no
  diagnostics screen** — verification means checking the Sentry dashboard. It
  also defaults `SENTRY_ENVIRONMENT` to `development` unless a `--dart-define`
  overrides it, since a Flutter build has no `NODE_ENV`.

A clone with no Sentry account builds and runs exactly as it did before Sentry
was added.

Production wiring exists in `.github/workflows/deploy-production.yml` (inert
until the GitHub Environment values below are set); staging is deliberately
untouched. Mobile is configured with `--dart-define` at build time, not `.env`.

See **[docs/sentry.md](docs/sentry.md)** for the full variable reference,
per-app verification steps, the PII scrubbing contract, and the accepted
trade-offs.

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

## From tickets to pull requests (GitHub Issues)

> Using Linear instead? See **[From tickets to pull requests (Linear)](#from-tickets-to-pull-requests-linear)** below.

This repository can turn the Markdown tickets in `docs/TICKETS.md` into GitHub
issues and project items. Work on each issue in an issue-linked branch; the
first push then opens a draft pull request to `dev` automatically.

```text
docs/TICKETS.md -> GitHub issues -> GitHub Project -> issue branches -> draft PRs to dev
```

### One-time setup

1. Install the [GitHub CLI](https://cli.github.com/) and authenticate it with
   write access to the repository and its GitHub Project:

   ```bash
   gh auth login
   gh auth refresh -s project
   gh auth status
   ```

   If the organization enforces SAML SSO, authorize the CLI credentials for
   that organization too.

2. Create a GitHub App for the draft-PR workflow with these repository
   permissions:

   | Permission    | Access     |
   | ------------- | ---------- |
   | Contents      | Read/write |
   | Issues        | Read/write |
   | Pull requests | Read/write |

3. Install the App on this repository, then configure these values under
   **Settings -> Secrets and variables -> Actions**:

   | Type     | Name                     | Value                        |
   | -------- | ------------------------ | ---------------------------- |
   | Variable | `PR_BOT_APP_ID`          | The GitHub App ID            |
   | Secret   | `PR_BOT_APP_PRIVATE_KEY` | The complete private-key PEM |

The repository must have Issues and Actions enabled, a `dev` branch, and an
existing GitHub Project. The project number is the number in its URL, while the
project owner is the organization or user login. Values stored only in a
GitHub Environment are not available to this workflow because it does not use
an environment.

### 1. Write the tickets

Use `docs/TICKETS.md` as a template. Separate ticket blocks with a line that is
exactly `---`. Every ticket needs a title with an uppercase key; `Epic` and
`Also touches` add labels when present.

```markdown
---

**Title:** [NOTE-1] Create and view a personal note
**Epic:** `notes`
**Also touches:**
`backend` `web`
**Problem / context:** Explain why this work is needed.
**Acceptance criteria:**

- Describe an observable result.
```

The required title format is `**Title:** [UPPERCASE-KEY] Name`. See the full
[sample ticket file](docs/TICKETS.md) for the recommended fields and build
order. Build order and dependency fields are documentation only; the script
does not enforce them.

### 2. Preview the issues

Run the script from the repository root. Keep the ticket file as the first
argument and always provide the GitHub Project number and owner.

```bash
node scripts/tickets-to-issues.mjs docs/TICKETS.md --project <PROJECT_NUMBER> --project-owner <PROJECT_OWNER> --repo <REPOSITORY_OWNER/REPOSITORY> --dry-run
```

For example:

```bash
node scripts/tickets-to-issues.mjs docs/TICKETS.md --project 71 --project-owner Quanby-IT-Solutions --repo Quanby-IT-Solutions/turbo-template --dry-run
```

The preview parses the tickets and lists the labels and issues it would create.
It still queries GitHub for existing issue titles, but it does not create or
change labels, issues, or project items. Stop and fix authentication or network
access if it warns that it could not fetch existing issues; otherwise the
preview cannot identify tickets that already exist.

### 3. Create the issues and project items

After checking the preview, rerun the same command without `--dry-run`:

```bash
node scripts/tickets-to-issues.mjs docs/TICKETS.md --project <PROJECT_NUMBER> --project-owner <PROJECT_OWNER> --repo <REPOSITORY_OWNER/REPOSITORY>
```

For every new ticket, the script:

- creates or updates the `ticket`, epic, and `Also touches` labels, setting
  their color to blue (`0075ca`);
- creates an issue whose title and body come from the ticket block;
- adds the issue to the selected GitHub Project; and
- prints the commands for starting work on that issue.

When its issue lookup succeeds, the script skips exact title matches among the
first 500 issues returned. It does not update those issues or repair a project
item that previously failed to add. Do not continue a non-dry run if the script
warns that it could not fetch existing issues, because duplicate detection is
then unavailable.

### 4. Work on one issue

Use the issue number printed by the script:

```bash
gh issue develop 123 --base dev --checkout

# Make and verify the changes, then commit them.
git add <files>
git commit -m "Implement issue 123"
git push -u origin HEAD
```

Keep custom branch names in the form `123-short-description`. The workflow only
runs for same-repository branches that start with the issue number followed by
a hyphen. A branch pushed from a fork does not trigger this repository's
`push` workflow.

### 5. Review the draft pull request

The first push triggers
[`.github/workflows/auto-draft-pr.yml`](.github/workflows/auto-draft-pr.yml).
The workflow:

1. reads the leading issue number from the branch;
2. skips creation when that branch already has an open pull request;
3. copies the issue title to a new draft pull request targeting `dev`; and
4. adds `Closes #123` to the pull request body.

CI runs against the draft pull request. Add reviewers, mark it ready, and merge
it through the normal review process. The workflow does not copy issue labels
to the pull request, so add the epic label before merging if you want
`release-changelog.yml` to group the change under that epic. GitHub closes the
linked issue when the pull request reaches the repository's default branch;
this template expects `dev` to be the default branch.

### Troubleshooting

- **`File not found: 71`:** Put `docs/TICKETS.md` before all flags.
- **`Missing required flags`:** Supply both `--project` and `--project-owner`,
  including during a dry run.
- **Could not fetch existing issues:** Stop before a non-dry run and fix GitHub
  authentication or network access. Duplicate detection is unavailable.
- **Label creation or issue creation fails:** Confirm the account can manage
  repository labels and issues. Fix or create the required labels, then rerun;
  successfully fetched exact-title matches will be skipped.
- **`Failed to add to project`:** Run `gh auth refresh -s project`, then add the
  already-created issue with
  `gh project item-add <PROJECT_NUMBER> --owner <PROJECT_OWNER> --url <ISSUE_URL>`.
  A rerun will skip that issue instead of repairing its project item.
- **The App-token step fails:** Verify the App installation and permissions,
  the App ID Actions variable, and the complete private-key PEM Actions secret.
- **No draft pull request appears:** Confirm the branch is in this repository,
  begins with `<ISSUE_NUMBER>-`, has a commit that differs from `dev`, and has
  no existing open pull request. Then inspect
  **GitHub -> Actions -> Auto Draft PR**.

## From tickets to pull requests (Linear)

> Prefer GitHub Issues? See **[From tickets to pull requests (GitHub Issues)](#from-tickets-to-pull-requests-github-issues)** above.

Same `docs/TICKETS.md` file, routed to **Linear** instead of GitHub Issues.
`scripts/tickets-to-linear.mjs` creates Linear issues; you branch with the name
Linear gives you, and the first push opens a draft pull request to `dev`
automatically.

```text
docs/TICKETS.md -> Linear issues -> Linear branch names -> draft PRs to dev
```

### One-time setup

1. Create a Linear **Personal API key**: Linear → Settings → Security & access →
   Personal API keys → New API key. Then export it:

   ```bash
   export LINEAR_API_KEY=lin_api_xxxxx
   ```

2. Note the target **team key** (the uppercase prefix Linear puts on issue IDs,
   e.g. `BID` in `BID-4`). You pass it with `--team`.

3. Reuse the same draft-PR GitHub App as the GitHub flow, configured under
   **Settings -> Secrets and variables -> Actions**:

   | Type     | Name                     | Value                        |
   | -------- | ------------------------ | ---------------------------- |
   | Variable | `PR_BOT_APP_ID`          | The GitHub App ID            |
   | Secret   | `PR_BOT_APP_PRIVATE_KEY` | The complete private-key PEM |

   The Linear workflow's App needs only these repository permissions — **Issues
   is not required**, since issues live in Linear:

   | Permission    | Access     |
   | ------------- | ---------- |
   | Contents      | Read/write |
   | Pull requests | Read/write |

   The repository must have a `dev` branch and Actions enabled.

### 1. Write the tickets

Use the exact same format as the GitHub flow — `**Title:** [KEY] Name` with
optional `**Epic:**` and `**Also touches:**`. See
[1. Write the tickets](#1-write-the-tickets) above and the sample
[docs/TICKETS.md](docs/TICKETS.md). The parser is identical.

### 2. Preview the issues

Run the script from the repository root with `--dry-run`:

```bash
LINEAR_API_KEY=lin_api_xxx node scripts/tickets-to-linear.mjs docs/TICKETS.md --team BID --dry-run
```

The preview lists the labels and issues it would create. It queries Linear for
existing issue titles (for duplicate detection) but creates or changes nothing.

### 3. Create the issues

After checking the preview, rerun without `--dry-run`:

```bash
LINEAR_API_KEY=lin_api_xxx node scripts/tickets-to-linear.mjs docs/TICKETS.md --team BID
```

Optionally set the initial workflow state with `--state <name>` (default
`Triage`; if that name is missing it falls back to the team's triage-type then
backlog-type state):

```bash
LINEAR_API_KEY=lin_api_xxx node scripts/tickets-to-linear.mjs docs/TICKETS.md --team BID --state Backlog
```

For every new ticket, the script:

- ensures the `ticket`, epic, and `Also touches` labels exist, color blue
  (`#0075ca`);
- creates a Linear issue whose title is `[KEY] Title` and whose description is the
  ticket block, in the target state with those labels;
- is **idempotent** — it skips any ticket whose `[KEY] Title` already exists in
  the team; and
- prints each new issue's URL plus the `git checkout -b <branchName>` and
  `git push` commands to start work.

### 4. Work on one issue

Use the branch name the script printed (Linear's own branch name, e.g.
`bid-4-add-vendor-parsing`):

```bash
git checkout -b bid-4-add-vendor-parsing

# Make and verify the changes, then commit them.
git add <files>
git commit -m "Implement BID-4"
git push -u origin HEAD
```

### 5. Review the draft pull request

The first push triggers
[`.github/workflows/auto-draft-pr-linear.yml`](.github/workflows/auto-draft-pr-linear.yml).
The workflow:

1. matches branches containing a Linear ID (`bid-4-...`, and prefixed forms like
   `feat/bid-4-...`);
2. derives the Linear ID (`BID-4`) and a title (`BID-4: Add vendor parsing`) from
   the branch name;
3. skips creation when that branch already has an open pull request; and
4. opens a draft pull request targeting `dev` with the body `Part of BID-4`.

Linear links the pull request automatically from the branch name. Merging moves
the issue to **In QA**, where QA verifies the acceptance criteria before Done.

### Troubleshooting

- **`Missing LINEAR_API_KEY`:** Export the key (`export LINEAR_API_KEY=lin_api_xxx`).
- **`Missing required --team flag`:** Supply `--team <TEAM_KEY>`, including during
  a dry run.
- **`Team … not found` / `State … not found`:** The script prints the available
  team keys / state names — check your value against that list.
- **`No tickets parsed`:** Fix the title format; each block needs
  `**Title:** [KEY] Name` and blocks are separated by a line that is exactly `---`.
- **No draft pull request appears:** Confirm the branch is in this repository,
  contains `<prefix>-<number>-`, has a commit that differs from `dev`, and has no
  existing open pull request. Then inspect
  **GitHub -> Actions -> Auto Draft PR (Linear)** and the App-token step.

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
| `ECR_REGISTRY`              | ECR registry host         | `123...dkr.ecr.ap-southeast-1.amazonaws.com` | `123...dkr.ecr.ap-southeast-1.amazonaws.com` |
| `STG_EC2_HOST`              | Staging EC2 IP / hostname | `54.123.45.67`                      |                                     |
| `STG_EC2_HOST_KEY`          | Pinned SSH host key (see below) | `54.123.45.67 ssh-ed25519 AAAAC3...` |                                |
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
| `SENTRY_ORG`                | Sentry org slug (source-map upload) |                           | `<org-slug>`                        |
| `SENTRY_PROJECT`            | Sentry project slug (source-map upload) |                       | `<project-slug>`                    |
| `SENTRY_ENABLED`            | Backend + web server/edge switch |                              | `true`                              |
| `WEB_SENTRY_DSN`            | Web server/edge DSN (mapped to `SENTRY_DSN` in the web container) |         | `https://<publicKey>@<org>.ingest.sentry.io/<webProjectId>` |
| `BACKEND_SENTRY_DSN`        | Backend DSN (mapped to `SENTRY_DSN` in the backend container) |             | `https://<publicKey>@<org>.ingest.sentry.io/<apiProjectId>` |
| `SENTRY_ENVIRONMENT`        | Environment tag for all runtimes |                              | `production`                        |
| `SENTRY_TRACES_SAMPLE_RATE` | Backend trace sampling 0–1 |                                    | `0`                                 |
| `NEXT_PUBLIC_SENTRY_ENABLED` | Browser switch           |                                     | `true`                              |
| `NEXT_PUBLIC_SENTRY_DSN`    | Browser DSN (public by design) |                                | `https://<publicKey>@<org>.ingest.sentry.io/<projectId>` |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Browser environment tag (optional; defaults to `SENTRY_ENVIRONMENT`) |    | `production`                        |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Web trace sampling 0–1 |                            | `0`                                 |

Every Sentry row is optional — leave them all unset and the deploy behaves
exactly as it did before Sentry existed. The two DSN rows are separate so web
and backend events land in their own Sentry projects; set both to the same value
to collapse them into one. Staging is intentionally blank: it has no Sentry
wiring. See [docs/sentry.md](docs/sentry.md).

#### Secrets

| Secret                        | Description              | Staging                               | Production                            |
| ----------------------------- | ------------------------ | ------------------------------------- | ------------------------------------- |
| `AWS_ACCESS_KEY_ID`           | IAM access key           | `<aws-access-key-id>`                             | `<aws-access-key-id>`                             |
| `AWS_SECRET_ACCESS_KEY`       | IAM secret key           | `wJal...`                             | `wJal...`                             |
| `STG_EC2_SSH_KEY`             | Staging EC2 SSH private key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |                                  |
| `DATABASE_URL`                | PostgreSQL connection    | `postgresql://user:pass@host:5432/db` | `postgresql://user:pass@host:5432/db` |
| `BETTER_AUTH_SECRET`          | Auth signing secret      | `openssl rand -base64 32`             | `openssl rand -base64 32`             |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Trusted origins          | `https://stg-turbo.quanbyit.com`      | `https://turbo.quanbyit.com`          |
| `CORS_ORIGINS`                | Allowed CORS origins     | `https://stg-turbo.quanbyit.com`      | `https://turbo.quanbyit.com`          |
| `GOOGLE_CLIENT_ID`            | Google OAuth client ID   | `123...apps.googleusercontent.com`    | `456...apps.googleusercontent.com`    |
| `GOOGLE_CLIENT_SECRET`        | Google OAuth secret      | `<google-oauth-client-secret>`                          | `<google-oauth-client-secret>`                          |
| `SENTRY_AUTH_TOKEN`           | Sentry source-map upload token (org write credential; passed as a BuildKit secret, never a build arg) |                                       | `<sentry-auth-token>`                 |

> Get values from `terraform output` in the [turbo-infrastructure](https://github.com/Quanby-IT-Solutions/turbo-infrastructure) repo.

#### Pinning the staging SSH host key

The staging deploy verifies the EC2 instance's identity before sending anything
to it. Without a pinned key the workflow would have to trust whatever answers on
port 22, which is exactly how a deploy's secrets get handed to the wrong host.

Generate the value once per instance (re-run it whenever the instance is
rebuilt, since a new instance gets a new key):

```bash
ssh-keyscan -t ed25519 <STG_EC2_HOST>
```

Copy the output line — it looks like `54.123.45.67 ssh-ed25519 AAAAC3Nza...` —
into the `STG_EC2_HOST_KEY` **variable** (not a secret: it is public key
material, and keeping it readable means a change shows up in review).

The deploy fails closed: a missing variable stops the run at the validation
step, and a key that does not match aborts the SSH connection with
`Host key verification failed` rather than proceeding.

### TLS certificates (Docker proxy)

The bundled Nginx ships **two** configs, both live — the production one is not
commented out:

| File | Use | Listens |
| --- | --- | --- |
| `nginx/nginx.dev.conf` | local development (**default**) | HTTP :80 |
| `nginx/nginx.conf` | production, terminates TLS | :80 redirect + :443 |

Both route `/api/*` to `backend:3000` and everything else to `web:3001` **by
Compose service name**, so they work inside the network without
`host.docker.internal`.

A fresh clone needs no certificates: compose defaults to the dev config. To run
the TLS config, issue a certificate and point compose at it:

```bash
# 1. Obtain a certificate (webroot is mounted at ./nginx/certbot)
certbot certonly --webroot -w ./nginx/certbot -d <your-domain>

# 2. Place fullchain.pem + privkey.pem in ./nginx/certs (or set NGINX_CERTS_DIR)
# 3. Start with the production config
NGINX_CONF=./nginx/nginx.conf docker compose --profile docker-proxy up -d
```

Baseline: TLS 1.2 and 1.3 only, forward-secret cipher suites, HTTP 301s to
HTTPS, and the ACME challenge path stays on HTTP so renewal keeps working.
Once this is live, enable `ENABLE_HSTS=true` (ED-1 keeps it off until TLS
actually terminates, because `max-age` cannot be withdrawn quickly).

### First-Time Staging SSL

After the first staging deployment, SSH into EC2 to set up HTTPS:

```bash
ssh -i your-key.pem ubuntu@EC2_HOST
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
ssh -i your-key.pem ubuntu@EC2_HOST
cd /opt/staging && docker compose -f docker-compose.staging.yml ps
docker compose -f docker-compose.staging.yml logs web
docker compose -f docker-compose.staging.yml logs backend
sudo nginx -t && sudo systemctl status nginx
```

</details>

<details>
<summary>Production</summary>

```bash
aws ecs describe-services --cluster CLUSTER --services SERVICE --query 'services[0].events[:5]'
aws logs tail /ecs/PROJECT_NAME-web-production --follow
aws logs tail /ecs/PROJECT_NAME-backend-production --follow
```

</details>

## Git Hooks

This repo uses [Husky](https://typicode.github.io/husky/) to run tests before pushing.

| Hook       | What it does                                         |
| ---------- | ---------------------------------------------------- |
| `pre-push` | Runs `turbo test --affected` to block failing pushes |

To bypass the hook (e.g., for WIP pushes):

```bash
git push --no-verify
```

## Links

- [Turborepo](https://turbo.build/docs) · [Next.js](https://nextjs.org/docs) · [NestJS](https://docs.nestjs.com/) · [Drizzle](https://orm.drizzle.team/) · [Better Auth](https://better-auth.com/docs)
