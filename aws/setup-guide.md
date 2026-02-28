# AWS Deployment Tutorial (Step by Step)

This tutorial walks you through deploying this monorepo to AWS using:

- Docker images in ECR
- ECS Fargate services (web + backend)
- Application Load Balancer path routing
- GitHub Actions CI/CD (`staging` and `production` branches)

It is aligned with the current repository files:

- `apps/web/Dockerfile`
- `apps/backend/Dockerfile`
- `aws/ecs/task-definition-*.json`
- `.github/workflows/deploy.yml`

---

## 1) Prerequisites

Before you start, ensure you have:

1. AWS account and IAM permissions for ECS, ECR, EC2/ALB, CloudWatch, IAM.
2. GitHub repository admin access (for repo Secrets/Variables).
3. A database connection string for `DATABASE_URL`.
4. Domain name (optional but recommended for production).

---

## 2) Decide naming conventions

This project uses `${PROJECT_NAME}` heavily in task definitions and workflows.

Choose a project name once (example: `turbo-template`) and keep it consistent for:

- ECR repositories
- ECS cluster/services
- task definition families
- log groups

---

## 3) Create networking (VPC, subnets, routing)

Create a production-style VPC:

1. VPC CIDR, e.g. `10.0.0.0/16`
2. At least 2 public subnets in different AZs (for ALB)
3. At least 2 private subnets in different AZs (recommended for ECS tasks)
4. Internet Gateway attached to VPC
5. NAT Gateway for private subnet egress (if tasks run private)
6. Route tables:
   - public subnets -> IGW
   - private subnets -> NAT

Tip: You can run ECS tasks in public subnets initially for simplicity, then move to private later.

---

## 4) Create security groups

Create three security groups:

1. `alb-sg`
   - Inbound: `80` from `0.0.0.0/0`
   - Inbound: `443` from `0.0.0.0/0`
   - Outbound: allow all

2. `web-sg`
   - Inbound: `3001` from `alb-sg`
   - Outbound: allow all

3. `backend-sg`
   - Inbound: `3000` from `alb-sg` (and optionally from `web-sg` if needed)
   - Outbound: allow all

---

## 5) Create ECR repositories

Create two private ECR repositories:

1. `${PROJECT_NAME}-web`
2. `${PROJECT_NAME}-backend`

You don’t need to manually push images if you use the included GitHub Actions workflows.

---

## 6) Create IAM role for ECS tasks

Create (or reuse) `ecsTaskExecutionRole` with at least:

- `AmazonECSTaskExecutionRolePolicy`

The task definition templates currently reference this role for both:

- `executionRoleArn`
- `taskRoleArn`

If your app later needs AWS APIs at runtime, grant those on `taskRoleArn`.

---

## 7) Create ECS cluster

Create one ECS cluster (Fargate), for example:

- `${PROJECT_NAME}-cluster`

Enable CloudWatch Container Insights if you want richer metrics.

---

## 8) Create ALB and target groups

Create an internet-facing ALB in public subnets and attach `alb-sg`.

Create target groups:

1. Web target group
   - Protocol/port: HTTP `3001`
   - Health check path: `/`

2. Backend target group
   - Protocol/port: HTTP `3000`
   - Health check path: `/api/v1/health`

Create listener rules:

- `/api/*` -> backend target group
- default -> web target group

Optional: add HTTPS listener (`443`) with ACM certificate.

---

## 9) Prepare GitHub repository configuration

In GitHub repository settings, configure:

### 9.1 Secrets

Required by workflows:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 9.2 Variables

Shared:

- `AWS_REGION`
- `PROJECT_NAME`
- `NEXT_PUBLIC_API_BASE_URL`

Production-specific:

- `ECR_REPOSITORY_WEB`
- `ECR_REPOSITORY_BACKEND`
- `ECS_CLUSTER`
- `ECS_SERVICE_WEB`
- `ECS_SERVICE_BACKEND`
- `NEXT_PUBLIC_APP_URL`

Staging-specific:

- `ECR_REPOSITORY_WEB_STAGING`
- `ECR_REPOSITORY_BACKEND_STAGING`
- `ECS_CLUSTER_STAGING`
- `ECS_SERVICE_WEB_STAGING`
- `ECS_SERVICE_BACKEND_STAGING`
- `NEXT_PUBLIC_APP_URL_STAGING`

Note: task definition templates are selected internally by the deployment workflow via:

- `aws/ecs/task-definition-web.json`
- `aws/ecs/task-definition-backend.json`
- `aws/ecs/task-definition-web-staging.json`
- `aws/ecs/task-definition-backend-staging.json`

Note: workflows now include a preflight step that fails early if required variables are empty.

---

## 10) Create ECS services once (bootstrap)

The workflows update existing ECS services, so create them initially in AWS Console:

1. Create web service linked to web target group.
2. Create backend service linked to backend target group.
3. Use Fargate launch type, desired count >= 1.
4. Set networking to your chosen subnets and security groups.

After bootstrap, GitHub Actions handles rolling updates.

---

## 11) Understand runtime startup behavior

Backend production startup in Docker/ECS is:

- build during image build
- run with `node apps/backend/dist/main.js`

Local production-like backend run from repo root:

1. `pnpm build`
2. `pnpm --filter @repo/backend start`

This mirrors production better than backend-only build commands.

---

## 12) Deploy to staging

Two options:

1. Push to branch `staging`
2. Manually trigger workflow: **Deploy** with:
   - `branch=staging`
   - `environment=staging`

For manual deploys, branch and environment must match (`staging` -> `staging`).

Workflow actions include:

- build and push web/backend Docker images to ECR
- apply `envsubst` to `aws/ecs/task-definition-web-staging.json` and `aws/ecs/task-definition-backend-staging.json`
- register new task definition revisions
- update ECS services and wait until stable

---

## 13) Deploy to production

Two options:

1. Push to branch `production`
2. Manually trigger workflow: **Deploy** with:
   - `branch=production`
   - `environment=production`

For manual deploys, branch and environment must match (`production` -> `production`).

The same build/register/update process runs using production variables/templates.

---

## 14) Verify deployment

After deploy:

1. Check ECS services are stable and desired tasks are healthy.
2. Check target groups show healthy targets.
3. Visit ALB DNS:
   - `/` should serve web app
   - `/api/v1/health` should return backend health
4. Inspect logs in CloudWatch:
   - `/ecs/${PROJECT_NAME}-web`
   - `/ecs/${PROJECT_NAME}-backend`

---

## 15) Troubleshooting checklist

If deployment fails, check in this order:

1. **GitHub preflight failure**
   - Missing/empty repo Variables or Secrets.

2. **ECS task won’t start**
   - Wrong image URI/repo name/region.
   - Missing IAM permissions on execution role.

3. **Health check fails**
   - Backend endpoint must be `/api/v1/health` on port `3000`.
   - Web endpoint must be `/` on port `3001`.

4. **ALB returns 5xx**
   - Target groups unhealthy or SG routing mismatch.

5. **Runtime config crash**
   - Validate required backend env vars:
     - `DATABASE_URL`
     - `CORS_ORIGINS`
     - `BETTER_AUTH_SECRET`
     - `BETTER_AUTH_TRUSTED_ORIGINS`

---

## 16) Recommended next improvements

Once baseline deployment works, consider:

1. Move sensitive runtime env values from task definition substitution to AWS Secrets Manager/SSM.
2. Run ECS tasks in private subnets only.
3. Add autoscaling policies for CPU/memory.
4. Add WAF + HTTPS-only redirect.
5. Add separate DB credentials/URLs for staging vs production.
