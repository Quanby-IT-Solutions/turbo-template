---
name: ci-cd-pipelines
description: CI/CD pipeline patterns for this monorepo using GitHub Actions. Staging deploys to EC2 via Docker Compose + Nginx. Production deploys to ECS Fargate. Infrastructure is managed separately via Terraform in the turbo-infrastructure repo.
---

# CI/CD Pipelines

## Quick Reference

| Workflow          | File                    | Trigger                           | Purpose                          |
| ----------------- | ----------------------- | --------------------------------- | -------------------------------- |
| CI                | `ci.yml`                | Push/PR to dev/staging/production | Lint, typecheck, format          |
| Deploy Staging    | `deploy-staging.yml`    | Push to staging                   | Build → ECR → EC2 Docker Compose |
| Deploy Production | `deploy-production.yml` | Push to production                | Build → ECR → ECS Fargate        |

## Branch Strategy

```
dev         → CI checks only (lint, typecheck, format)
staging     → CI + auto-deploy to EC2 (Docker Compose + Nginx)
production  → CI + auto-deploy to ECS Fargate (ALB routing)
```

## CI Workflow (`ci.yml`)

Runs quality checks on every push and PR:

```yaml
jobs:
  ci:
    steps:
      - pnpm install --frozen-lockfile
      - pnpm typecheck
      - pnpm lint
      - pnpm format
```

**Key patterns:**

- `concurrency` cancels in-progress runs on new pushes
- `paths-ignore` skips docs-only changes
- `--frozen-lockfile` ensures reproducible installs

## Staging Workflow (`deploy-staging.yml`)

Deploys to a single EC2 instance using Docker Compose + host Nginx.

### Flow

1. CI passes (lint, typecheck, format)
2. Validate required GitHub variables
3. Build Docker images → push to ECR (sha + latest tags)
4. SSH into EC2:
   - Copy `docker-compose.staging.yml`
   - Generate nginx configs inline (web HTTP/HTTPS + API HTTP/HTTPS)
   - Write `.env` file with all app env vars
   - `docker compose pull && up -d`
   - Detect SSL certs → apply correct nginx config
   - `nginx -t && systemctl reload nginx`
5. Health checks (backend `/api/v1/health`, web `/`)
6. Auto-rollback on failure (restore previous `.env` + restart)

### Nginx Config Generation

Nginx configs are generated **on the GitHub Actions runner** using quoted heredocs (preserves `$host`, `$remote_addr`, etc.), then copied to EC2 via SCP:

```yaml
- name: Copy deployment files to EC2
  run: |
    # Quoted heredoc preserves nginx variables like $host
    cat > /tmp/nginx-configs/web.conf << 'NGINX_WEB'
    server {
        listen 80;
        server_name __DOMAIN__;
        location / {
            proxy_pass http://127.0.0.1:3001;
            proxy_set_header Host $host;
            ...
        }
    }
    NGINX_WEB
    # SCP to EC2
    scp $SSH_OPTS /tmp/nginx-configs/*.conf $REMOTE:/opt/staging/nginx/
```

On EC2, the deploy script uses `sed` to replace `__DOMAIN__` and detects SSL certs to pick HTTP vs HTTPS configs.

### Required Variables (Staging)

**Variables:** `AWS_REGION`, `PROJECT_NAME`, `ECR_REPOSITORY_WEB`, `ECR_REPOSITORY_BACKEND`, `DOMAIN_WEB`, `DOMAIN_API`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`

**Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_TRUSTED_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Production Workflow (`deploy-production.yml`)

Deploys to ECS Fargate with ALB routing.

### Flow

1. CI passes
2. Validate required GitHub variables
3. Build Docker images → push to ECR (sha + latest tags)
4. Capture current task definitions (for rollback)
5. Register web task definition (inline JSON via heredoc)
6. Deploy web to ECS → wait for stability
7. Register backend task definition (inline JSON via heredoc)
8. Deploy backend to ECS → wait for stability
9. Auto-rollback on failure (revert to previous task definitions)

### Inline Task Definition Pattern

Task definitions are constructed **inline** using heredocs — no template files needed:

```yaml
- name: Register and deploy Web task definition
  run: |
    cat > /tmp/task-def-web.json << EOF
    {
      "family": "${PROJECT_NAME}-web-production",
      "networkMode": "awsvpc",
      "requiresCompatibilities": ["FARGATE"],
      "cpu": "512",
      "memory": "1024",
      "executionRoleArn": "${ECS_EXECUTION_ROLE_ARN}",
      "taskRoleArn": "${ECS_TASK_ROLE_ARN}",
      "containerDefinitions": [{
        "name": "web",
        "image": "${ECR_REGISTRY}/${ECR_REPOSITORY_WEB}:${IMAGE_TAG}",
        ...
      }]
    }
    EOF
    aws ecs register-task-definition --cli-input-json file:///tmp/task-def-web.json
```

### Required Variables (Production)

**Variables:** `AWS_REGION`, `PROJECT_NAME`, `ECR_REPOSITORY_WEB`, `ECR_REPOSITORY_BACKEND`, `ECS_CLUSTER`, `ECS_SERVICE_WEB`, `ECS_SERVICE_BACKEND`, `ECS_EXECUTION_ROLE_ARN`, `ECS_TASK_ROLE_ARN`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`, `BETTER_AUTH_COOKIE_DOMAIN`

**Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_TRUSTED_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Docker Build Pattern

Both workflows use the same build pattern:

```yaml
- name: Build and push image
  run: |
    docker buildx build \
      --file apps/web/Dockerfile \
      --build-arg NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
      --cache-from type=local,src=/tmp/.buildx-cache \
      --cache-to type=local,dest=/tmp/.buildx-cache-new,mode=max \
      --push \
      --tag $ECR_REGISTRY/$ECR_REPOSITORY_WEB:$IMAGE_TAG \
      --tag $ECR_REGISTRY/$ECR_REPOSITORY_WEB:latest \
      .
```

## Pipeline Best Practices

1. **Immutable image tags** — Always tag with `github.sha`, not just `latest`
2. **Fail-fast validation** — Check all required vars before costly build steps
3. **Layer caching** — Use local buildx cache with cache rotation
4. **Concurrency control** — Cancel in-progress deploys on new pushes
5. **Stability wait** — `aws ecs wait services-stable` after ECS deployment
6. **Auto-rollback** — Previous task definition (prod) or `.env.rollback` (staging)
7. **Inline templates** — Generate task definitions and nginx configs in-workflow, no template files in repo
