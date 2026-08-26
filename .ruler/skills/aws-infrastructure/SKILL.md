---
name: aws-infrastructure
description: AWS deployment patterns for this monorepo. Infrastructure (VPC, ALB, EC2, ASG, ECR, SSM) is provisioned in a separate turbo-infrastructure repo via Terraform; this repo holds the deploy workflows and compose files. Staging is a single EC2 (Elastic IP) behind an ALB; production is EC2 + ALB + Auto Scaling Group, configured through SSM Parameter Store and rolled via launch-template versioning + instance refresh. Use when deploying to AWS or setting up GitHub environment variables.
updated: 2026-08-15
---

# AWS Infrastructure

There is NO ECS / Fargate. Both environments run Docker Compose on EC2 hosts. Production scales and rolls via an ASG.

## Split Across Repos

| Repository                     | Purpose                                                             |
| ------------------------------ | ------------------------------------------------------------------ |
| **turbo-template** (this repo) | App code + deploy workflows + `docker-compose.{staging,production}.yml` |
| **turbo-infrastructure**       | Terraform (VPC, ALB, EC2, ASG, launch templates, ECR, SSM, monitoring) |

### Deployment Strategies

| Environment | Branch       | Strategy                                | Rollout                        |
| ----------- | ------------ | --------------------------------------- | ------------------------------ |
| Staging     | `staging`    | Single EC2 + Elastic IP, Docker Compose | `docker compose pull && up -d` |
| Production  | `production` | EC2 + ALB + ASG, Docker Compose         | Launch-template version → ASG instance refresh (Rolling) |

### Architecture

```
STAGING:
  Internet → ALB (TLS, routing) → EC2 (Elastic IP)
                                    └── docker compose (web :3001, backend :3000)

PRODUCTION:
  Internet → ALB (:80/:443, host-header rules)
               ├── turbo.quanbyit.com     → web target group    (:3001)
               └── turbo-be.quanbyit.com  → backend target group (:3000)
                      ↓
               Auto Scaling Group  (launch template)
                 └── each EC2 on boot:
                        aws ssm get-parameter /${PROJECT_NAME}/production/docker-compose  (compose, base64)
                        aws ssm get-parameter /${PROJECT_NAME}/production/env             (env, SecureString)
                        docker compose up -d   (web :3001, backend :3000, redis)
```

## App Repo Structure

```
.
├── docker-compose.yml              # local dev (single-port Nginx proxy + redis)
├── docker-compose.staging.yml      # staging EC2
├── docker-compose.production.yml   # production EC2 (header: "PRODUCTION DEPLOYMENT - EC2 behind ALB (ASG)")
├── nginx/                          # single-port reverse proxy configs (dev + prod)
└── .github/workflows/
    ├── ci.yml                      # external quality gate on dev
    ├── deploy-staging.yml          # EC2 + Elastic IP
    ├── deploy-production.yml       # EC2 + ALB + ASG
    ├── release-changelog.yml       # release tag + changelog
    ├── auto-draft-pr.yml           # GitHub-issue branches
    └── auto-draft-pr-linear.yml    # Linear branches
```

Developers set the GitHub environment variables (README "Deployment") and merge to `staging` / `production`.

## The SSM Config Channel (production)

Production config is not baked into workflow heredocs — it is published to Parameter Store and read on boot:

- `/${PROJECT_NAME}/production/docker-compose` — **String**, base64 of `docker-compose.production.yml`.
- `/${PROJECT_NAME}/production/env` — **SecureString**, base64 env payload, piped to the CLI on stdin (never on disk, never in argv).

The workflow then creates a new launch-template version (`--source-version '$Latest'`, description `deploy-$IMAGE_TAG`), sets it default, and calls `aws autoscaling start-instance-refresh`. New instances come up with the new template, read SSM, and start the stack. The refresh is polled to `Successful`, then ALB target health is verified.

## Staging Deploy

1. `ci` passes → build + push images to ECR.
2. Load deploy key into `ssh-agent`, **pin the host key** from `STG_EC2_HOST_KEY` (a repo variable — public key material, so a change is visible in review; `require_var` refuses to deploy without it).
3. SSH `ec2-user@$STG_EC2_HOST` with `StrictHostKeyChecking=yes` + `BatchMode=yes`; write `.env` + compose; `docker compose pull && up -d`.
4. Health-check `:3000/api/v1/health` and `:3001/`.

The ALB terminates TLS and routes. There is NO Let's Encrypt / certbot on the host, NO inline nginx config generation, NO SSL auto-detection, NO auto-rollback.

## GitHub Environment Variables

See README "Deployment" for the full list. Deploy-target keys:

| Variable             | Environment | Meaning                                    |
| -------------------- | ----------- | ------------------------------------------ |
| `ASG_NAME`           | production  | Auto Scaling Group to instance-refresh     |
| `LAUNCH_TEMPLATE_ID` | production  | Launch template to version + set default   |
| `STG_EC2_HOST`       | staging     | Staging EC2 host (Elastic IP)              |
| `STG_EC2_HOST_KEY`   | staging     | Pinned SSH host key (`ssh-keyscan` output) |
| `ECR_REGISTRY`, `ECR_REPOSITORY_WEB`, `ECR_REPOSITORY_BACKEND` | both | Image registry + repos |
| `PROJECT_NAME`, `AWS_REGION` | both | Used to name SSM params + target groups     |

There is no `ECS_CLUSTER` / `ECS_SERVICE_*` / `ECS_EXECUTION_ROLE_ARN` / `ECS_TASK_ROLE_ARN`.

### Sentry SSM payload (optional)

The production env payload also carries (empty = off): `SENTRY_ENABLED`, `WEB_SENTRY_DSN`, `BACKEND_SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, plus `IMAGE_TAG` (reported as the Sentry release). `docker-compose.production.yml` maps `WEB_SENTRY_DSN`/`BACKEND_SENTRY_DSN` onto each container's `SENTRY_DSN`. `NEXT_PUBLIC_SENTRY_*`, `SENTRY_ORG`, `SENTRY_PROJECT` are build args (not SSM); `SENTRY_AUTH_TOKEN` is a BuildKit secret. See `observability-sentry`.

## Troubleshooting

1. **Container not starting** → SSH the EC2 host: `docker compose ps`, `docker compose logs -f <svc>`. Config comes from SSM, so also check the two parameters decode/parse.
2. **Health check failing** → `/api/v1/health` (backend), `/` (web) on the host ports `:3000` / `:3001`.
3. **503 from ALB** → check target-group health (`elbv2 describe-target-health` on `${PROJECT_NAME}-{web,backend}-tg-production`); confirm the security group allows ALB → instance on 3000/3001.
4. **Image pull errors** → ECR URI mismatch, or the instance role lacks `ecr:GetDownloadUrlForLayer`.
5. **Instance refresh stuck/`Failed`** → the workflow prints `StatusReason`; usually a failing health check on the new instances (bad image or bad SSM env).
6. **SSM access denied** → the instance role needs `ssm:GetParameter` (+ KMS decrypt for the SecureString).
7. **Env vars missing** → verify the GitHub environment variables/secrets, then that they landed in the SSM `.../env` payload.
