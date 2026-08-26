---
name: ci-cd-pipelines
description: CI/CD pipeline patterns for this monorepo using GitHub Actions. CI runs on `dev` via an external reusable quality gate. Staging deploys to EC2 (Elastic IP) via Docker Compose behind an ALB. Production deploys to EC2 + ALB + ASG using SSM Parameter Store + launch-template versioning + instance refresh. Extra workflows handle releases/changelog and auto-drafting PRs from GitHub or Linear tickets.
updated: 2026-08-15
---

# CI/CD Pipelines

There is NO ECS anywhere. Both environments run Docker Compose on EC2; production rolls via an Auto Scaling Group instance refresh.

## Workflows

| Workflow             | File                        | Trigger                                | Purpose                                                              |
| -------------------- | --------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| CI                   | `ci.yml`                    | push + PR to `dev` (+ dispatch)        | Thin caller of external quality gate (typecheck/lint/format/test/e2e) |
| Deploy Staging       | `deploy-staging.yml`        | push to `staging`                      | Build → ECR → SSH EC2 → `docker compose up`                         |
| Deploy Production    | `deploy-production.yml`     | push to `production`                   | Build → ECR → SSM → launch-template version → ASG instance refresh  |
| Release + Changelog  | `release-changelog.yml`     | push to `production`                   | Date-based tag + changelog + GitHub Release                         |
| Auto Draft PR        | `auto-draft-pr.yml`         | push to `[0-9]+-**` branches           | Open draft PR for a GitHub-issue branch                             |
| Auto Draft PR (Linear) | `auto-draft-pr-linear.yml` | push to `*-[0-9]+-**` branches        | Open draft PR for a Linear branch                                   |

## Branch Strategy

```
dev         → CI (external quality gate: typecheck, lint, format, test:cov, e2e)
staging     → CI + auto-deploy to EC2 + Elastic IP (Docker Compose; ALB fronts TLS)
production  → CI + auto-deploy to EC2 + ALB + ASG (rolling instance refresh) + release tag
```

## CI (`ci.yml`)

Triggers on `dev` ONLY (push + PR) plus `workflow_dispatch`. It is a thin caller of an EXTERNAL reusable workflow — not local job steps:

```yaml
jobs:
  quality:
    uses: Quanby-IT-Solutions/.github/.github/workflows/quality-gate.yml@<full-sha> # pinned, never @main
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}   # only secret passed — never `secrets: inherit`
```

- Pinned to a full commit SHA (a branch ref would let an external repo swap the gate unreviewed). Moving the pin = re-review at the new SHA and update the ref + comment together.
- The gate runs, in order: `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm turbo test:cov` (unit tests), and Playwright **e2e** when web or its upstream packages change; a final `quality-gate` job fails the run if static checks or e2e fail.
- `permissions:` are stated, not inherited: `contents: read`, `pull-requests: write`, `checks: write` (the gate posts coverage comments + check results). No `packages`/`id-token`/`actions`.
- `deploy-staging.yml` and `deploy-production.yml` both gate on it via a local `ci` job (`uses: ./.github/workflows/ci.yml`, `needs: ci`).

## Staging (`deploy-staging.yml`) — EC2 + Elastic IP

Single EC2 instance running Docker Compose. The ALB (provisioned separately) handles routing + TLS. There is NO inline nginx generation, NO `__DOMAIN__` heredocs, NO `systemctl`, NO auto-rollback.

Flow:
1. `ci` passes.
2. Validate required vars, configure AWS creds, ECR login, buildx.
3. Build + push web and backend images to ECR (`$IMAGE_TAG` = `github.sha`, plus `:latest`).
4. Load the deploy key into `ssh-agent` (never written to disk) and pin the host key.
5. SSH to `ec2-user@$STG_EC2_HOST` (hardcoded user), write `/opt/staging/.env` + `docker-compose.yml` (piped `cat docker-compose.staging.yml`), `docker compose pull && up -d --remove-orphans`, `docker image prune -f`.
6. Health check: curl `http://$STG_EC2_HOST:3000/api/v1/health` and `:3001/` (both probed — the web probe is why the old ECR-var swap can't hide).

SSH hardening: `StrictHostKeyChecking=yes` + `BatchMode=yes` (fail-closed). `STG_EC2_HOST_KEY` is a **variable** (public key material, pinned to `~/.ssh/known_hosts`), the private key is the `STG_EC2_SSH_KEY` **secret**.

### Required (Staging)

**Variables:** `AWS_REGION`, `PROJECT_NAME`, `ECR_REGISTRY`, `ECR_REPOSITORY_WEB`, `ECR_REPOSITORY_BACKEND`, `STG_EC2_HOST`, `STG_EC2_HOST_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_VERSION`
**Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STG_EC2_SSH_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_TRUSTED_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

There is no `DOMAIN_WEB` / `DOMAIN_API` / `EC2_USER` — the user is hardcoded `ec2-user` and TLS/routing lives on the ALB.

## Production (`deploy-production.yml`) — EC2 + ALB + ASG

Title: **Deploy Production (EC2 + ALB + ASG)**. Rolling deploy via ASG instance refresh; config ships through SSM Parameter Store. `concurrency` uses `cancel-in-progress: false` (interrupting a refresh splits the ASG across two image versions).

Flow:
1. `ci` passes; validate required vars.
2. Build + push web and backend images to ECR (`$IMAGE_TAG` = `github.sha`, plus **`:production-latest`**).
3. Update SSM parameters:
   - `/${PROJECT_NAME}/production/docker-compose` (String) = base64 of `docker-compose.production.yml`.
   - `/${PROJECT_NAME}/production/env` (SecureString) = base64 env payload, **piped** to the CLI on stdin (never written to disk, never in argv).
4. `aws ec2 create-launch-template-version --source-version '$Latest'` (description `deploy-$IMAGE_TAG`), then `modify-launch-template --default-version`.
5. `aws autoscaling start-instance-refresh` (Rolling, `MinHealthyPercentage:100`, `MaxHealthyPercentage:200`, `InstanceWarmup:300`); poll `describe-instance-refreshes` until `Successful` (20-min ceiling).
6. Verify ALB target-group health for `${PROJECT_NAME}-web-tg-production` and `${PROJECT_NAME}-backend-tg-production` via `elbv2 describe-target-health`.

EC2 instances pull the compose + env from SSM on boot and run the stack — there is no ECS task definition, no `aws ecs wait`, no CloudWatch `/ecs/*` log group.

### Required (Production)

**Variables:** `AWS_REGION`, `PROJECT_NAME`, `ECR_REPOSITORY_WEB`, `ECR_REPOSITORY_BACKEND`, `ASG_NAME`, `LAUNCH_TEMPLATE_ID`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_VERSION`, `BETTER_AUTH_COOKIE_DOMAIN`
**Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_TRUSTED_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

No `ECS_*` variables exist. The two that matter are `ASG_NAME` and `LAUNCH_TEMPLATE_ID`.

## Sentry deploy wiring (production build)

Sentry is entirely optional; leave every variable unset and the deploy behaves as before. Split by nature:

- **`vars` (identifiers / public):** `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_ENABLED`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, plus browser `NEXT_PUBLIC_SENTRY_ENABLED`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, and the per-app `WEB_SENTRY_DSN` / `BACKEND_SENTRY_DSN`.
- **`secrets`:** only `SENTRY_AUTH_TOKEN` (write credential for the org).

Build-vs-runtime split:
- `NEXT_PUBLIC_SENTRY_*` + `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_ENVIRONMENT` are passed as `--build-arg` to the web image (baked in / used for source-map upload).
- `SENTRY_AUTH_TOKEN` is passed as `--secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN` (a build arg would land in `docker history`).
- Runtime values (`SENTRY_ENABLED`, `WEB_SENTRY_DSN`, `BACKEND_SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`) go into the SSM env payload. `docker-compose.production.yml` maps `WEB_SENTRY_DSN`→web `SENTRY_DSN` and `BACKEND_SENTRY_DSN`→backend `SENTRY_DSN` (per-runtime projects; set both equal to collapse into one). `SENTRY_TRACES_SAMPLE_RATE` reaches the backend container only; web tracing comes from the `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` build arg.

See `observability-sentry` and `docs/sentry.md`.

## Docker build pattern

Both deploys use buildx with a **ref-scoped, content-addressed** cache key (`hashFiles('apps/*/Dockerfile', 'pnpm-lock.yaml')` + `github.sha`, restore-keys scoped to `github.ref_name`) so a poisoned layer from another branch cannot reach a deploy build. Cache is rotated (`mv .buildx-cache-new .buildx-cache`).

## Release + Changelog (`release-changelog.yml`)

Runs on push to `production` (`contents: write`, `pull-requests: read`). Computes a date tag `vYYYY.MM.DD` (`.2`, `.3`… on collisions), builds a changelog from merged PR titles grouped by epic label (via `gh pr view`), prepends `CHANGELOG.md`, commits as `release-bot`, tags, and publishes a GitHub Release.

## Auto Draft PR workflows

Both mint a GitHub App token (`create-github-app-token`) from `vars.PR_BOT_APP_ID` + `secrets.PR_BOT_APP_PRIVATE_KEY`, check for an existing open PR, and open a **draft PR to `dev`**. Default `permissions: contents: read` (the App token carries the elevated grants).

- **`auto-draft-pr.yml`** — branches matching `[0-9]+-**` (GitHub issues, produced by `scripts/tickets-to-issues.mjs`). Derives the issue number, PR body `Closes #<n>`. App perms: contents + PRs + issues.
- **`auto-draft-pr-linear.yml`** — branches matching `*-[0-9]+-**` / `**/*-[0-9]+-**` (Linear, produced by `scripts/tickets-to-linear.mjs`). Derives the Linear ID (`bid-4-…` → `BID-4`), PR body `Part of BID-4`. App perms: contents + PRs only (issues live in Linear).

See the `ticket-to-pr-flow` skill.

## Best Practices

1. Immutable image tags (`github.sha`); prod also carries `:production-latest`, staging `:latest`.
2. Fail-fast `require_var` validation before costly builds.
3. Ref-scoped buildx cache (no cross-branch layer poisoning).
4. Concurrency: staging cancels in-progress, production never does.
5. Secrets are piped, never written to runner disk; SSH keys stay in `ssh-agent`.
6. Config for production travels through SSM, not inline task definitions.
