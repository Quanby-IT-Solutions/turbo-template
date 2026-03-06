---
name: ci-cd-pipelines
description: CI/CD pipeline patterns for this monorepo using GitHub Actions. Use when configuring workflows, deployment pipelines, branch strategies, or automated quality checks. Triggers on tasks involving GitHub Actions, deployment automation, staging/production releases, or build pipelines.
frameworks:
  - github-actions
  - docker
  - aws-ecs
languages:
  - yaml
  - bash
category: devops
updated: 2025-07-12
---

# CI/CD Pipelines

## Quick Reference

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `.github/workflows/ci.yml` | Push/PR to dev/staging/production | Lint, typecheck, format |
| Deploy | `.github/workflows/deploy.yml` | Push to staging/production + manual | Build, push ECR, deploy ECS |
| Infrastructure | `.github/workflows/infrastructure.yml` | Manual only | One-time AWS setup |

## Branch Strategy

```
dev         → CI checks only (lint, typecheck, format)
staging     → CI + auto-deploy to staging environment
production  → CI + auto-deploy to production environment
```

Manual deployments via `workflow_dispatch` are also supported with branch/environment validation.

## CI Workflow (`.github/workflows/ci.yml`)

Runs quality checks on every push and PR:

```yaml
name: CI
on:
  push:
    branches: [dev, staging, production]
    paths-ignore: ["**/*.md", "docs/**"]
  pull_request:
    branches: [dev, staging, production]
    paths-ignore: ["**/*.md", "docs/**"]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - uses: pnpm/action-setup@v4
        with:
          version: "10.27.0"
      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ~/.pnpm-store
          key: pnpm-${{ hashFiles('pnpm-lock.yaml') }}
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm format
```

**Key patterns:**
- `concurrency` cancels in-progress runs when new pushes arrive
- `fetch-depth: 2` for efficient Turbo change detection
- `paths-ignore` skips docs-only changes
- `--frozen-lockfile` ensures reproducible installs

## Deploy Workflow (`.github/workflows/deploy.yml`)

Full deployment pipeline triggered by staging/production pushes:

```yaml
name: Deploy
on:
  push:
    branches: [staging, production]
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
```

### Environment Resolution

```yaml
env:
  ENVIRONMENT: ${{ github.event.inputs.environment || (github.ref == 'refs/heads/production' && 'production' || 'staging') }}
```

For manual triggers, validates branch matches environment (staging branch → staging env only).

### Deployment Steps (in order)

1. **Validate** — Branch/environment match for manual deploys
2. **Resolve** — Select staging or production task definition templates
3. **Validate required vars** — Fail-fast if any GitHub env vars missing
4. **AWS credentials** — Configure via `aws-actions/configure-aws-credentials`
5. **Terraform** — `init → plan → apply` (infrastructure-as-code)
6. **ECR login** — Authenticate Docker to push images
7. **Build web image** — Docker Buildx with cache, NEXT_PUBLIC_* build args
8. **Push web image** — Tags: `{sha}` + `latest`
9. **Build backend image** — Docker Buildx with cache
10. **Push backend image** — Tags: `{sha}` + `latest`
11. **Register web task definition** — `envsubst` template → register revision
12. **Update web ECS service** — Force new deployment
13. **Wait for web stability** — `aws ecs wait services-stable`
14. **Register backend task definition** — Same pattern
15. **Update backend ECS service** — Force new deployment
16. **Output summary** — Images, task ARNs, services updated

### Docker Build with BuildX

```yaml
- name: Build and push web
  uses: docker/build-push-action@v5
  with:
    context: .
    file: apps/web/Dockerfile
    push: true
    tags: |
      ${{ env.ECR_URI_WEB }}:${{ github.sha }}
      ${{ env.ECR_URI_WEB }}:latest
    build-args: |
      NEXT_PUBLIC_APP_URL=${{ vars.NEXT_PUBLIC_APP_URL }}
      NEXT_PUBLIC_API_BASE_URL=${{ vars.NEXT_PUBLIC_API_BASE_URL }}
      NEXT_PUBLIC_API_VERSION=${{ vars.NEXT_PUBLIC_API_VERSION }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Key patterns:**
- GitHub Actions cache (`type=gha`) for Docker layer caching
- Immutable tags from `github.sha` + mutable `latest`
- Build args for Next.js public variables

### Task Definition Registration

```yaml
- name: Register task definition
  run: |
    export PROJECT_NAME="${{ vars.PROJECT_NAME }}"
    export AWS_ACCOUNT_ID="${{ vars.AWS_ACCOUNT_ID }}"
    export AWS_REGION="${{ vars.AWS_REGION }}"
    export IMAGE_TAG="${{ github.sha }}"
    # ... all env vars exported

    envsubst < aws/ecs/${TASK_DEF_TEMPLATE} > task-def-web.json
    aws ecs register-task-definition --cli-input-json file://task-def-web.json
```

Uses `envsubst` to replace `${VARIABLE}` placeholders in JSON templates.

### ECS Service Update

```yaml
- name: Update ECS service
  run: |
    aws ecs update-service \
      --cluster ${{ vars.ECS_CLUSTER }} \
      --service ${{ vars.ECS_SERVICE_WEB }} \
      --task-definition ${{ env.WEB_TASK_ARN }} \
      --force-new-deployment

    aws ecs wait services-stable \
      --cluster ${{ vars.ECS_CLUSTER }} \
      --services ${{ vars.ECS_SERVICE_WEB }}
```

## Infrastructure Workflow (`.github/workflows/infrastructure.yml`)

Manual-trigger-only workflow for initial AWS setup:

**Creates (in order):**
1. VPC + subnets + Internet Gateway + NAT Gateway
2. Security groups (ALB, ECS web, ECS backend)
3. IAM roles (task execution, task)
4. ECR repositories (web, backend)
5. CloudWatch log groups (7-day retention)
6. ALB + target groups + listener rules
7. ECS cluster
8. Task definitions (from templates)
9. ECS services (web, backend)

**Inputs:**
- `environment`: staging or production
- `create_vpc`: true/false (can reuse existing VPC)

## GitHub Environment Setup

### Required Variables (per environment)

| Variable | Example (staging) |
|----------|-------------------|
| `AWS_REGION` | `ap-southeast-1` |
| `PROJECT_NAME` | `turbo-template` |
| `AWS_ACCOUNT_ID` | `123456789012` |
| `ECR_REPOSITORY_WEB` | `turbo-template-web-staging` |
| `ECR_REPOSITORY_BACKEND` | `turbo-template-backend-staging` |
| `ECS_CLUSTER` | `turbo-template-cluster-staging` |
| `ECS_SERVICE_WEB` | `turbo-template-web-staging` |
| `ECS_SERVICE_BACKEND` | `turbo-template-backend-staging` |
| `NEXT_PUBLIC_APP_URL` | `https://staging.example.com` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://staging.example.com/api` |
| `NEXT_PUBLIC_API_VERSION` | `v1` |

### Required Secrets (per environment)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `BETTER_AUTH_SECRET` | Auth encryption key |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated trusted origins |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |

## Pipeline Best Practices

1. **Immutable image tags** — Always tag with `github.sha`, not just `latest`
2. **Fail-fast validation** — Check all required vars before starting costly build steps
3. **Layer caching** — Use `cache-from: type=gha` for Docker builds
4. **Concurrency control** — Cancel in-progress CI on new pushes
5. **Stability wait** — Always `aws ecs wait services-stable` after deployment
6. **Sequential service updates** — Deploy web first, then backend (or vice versa) — not parallel
7. **Template-based task defs** — Use `envsubst` on JSON templates, never inline JSON in YAML
