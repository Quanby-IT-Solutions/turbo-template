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

## 9) Prepare GitHub repository configuration

Go to your GitHub Repository Settings. You will need to define variables and secrets at the **Environment level** (specific to staging/production).

First, create two Environments under Settings > Environments: `staging` and `production`. Click into each environment and add the following:

### `staging`

**Secrets:**
```env
# AWS IAM User Access Key with permissions to ECS/ECR
# ↳ Get from: AWS Console -> IAM -> Users -> Select User -> Security Credentials -> Create Access Key
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE

# AWS IAM User Secret Key 
# ↳ Get from: AWS Console -> IAM -> Users -> Select User -> Security Credentials -> Create Access Key (only shown once)
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Connection string to your Staging Postgres database
DATABASE_URL=postgres://staging-user:pass@host:5432/db

# Comma-separated list of allowed frontend URLs (CORS)
CORS_ORIGINS=https://staging.yourdomain.com

# Random 32-character string for JWT/Session signing (Generate via `openssl rand -base64 32`)
BETTER_AUTH_SECRET=a_random_secure_string_for_staging

# Allowed domains for authentication cookies
BETTER_AUTH_TRUSTED_ORIGINS=https://staging.yourdomain.com

# OAuth Client ID
# ↳ Get from: Google Cloud Console -> APIs & Services -> Credentials
GOOGLE_CLIENT_ID=your-staging-client-id.apps.googleusercontent.com

# OAuth Client Secret
# ↳ Get from: Google Cloud Console -> APIs & Services -> Credentials
GOOGLE_CLIENT_SECRET=your-staging-client-secret
```

**Variables:**
```env
# Your AWS Region Code
# ↳ Get from: Look at the top right corner of your AWS console (e.g. us-east-1, ap-southeast-1)
AWS_REGION=us-east-1

# The base name you chose for this project. Used to identify resources.
PROJECT_NAME=turbo-template

# The base path where the ALB routes backend traffic
NEXT_PUBLIC_API_BASE_URL=/api

# The name of the Staging Web ECR Repository (Created in Step 5)
ECR_REPOSITORY_WEB=turbo-template-web-staging

# The name of the Staging Backend ECR Repository (Created in Step 5)
ECR_REPOSITORY_BACKEND=turbo-template-backend-staging

# The name of the Staging ECS Cluster (Created in Step 7)
ECS_CLUSTER=turbo-template-cluster-staging

# The name of the Staging Web ECS Service (Created in Step 10)
ECS_SERVICE_WEB=turbo-template-web-staging-service

# The name of the Staging Backend ECS Service (Created in Step 10)
ECS_SERVICE_BACKEND=turbo-template-backend-staging-service

# The public URL for the Staging frontend application
NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com
```

### `production`

**Secrets:**
```env
# AWS IAM User Access Key with permissions to ECS/ECR
# ↳ Get from: AWS Console -> IAM -> Users -> Select User -> Security Credentials -> Create Access Key
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE

# AWS IAM User Secret Key 
# ↳ Get from: AWS Console -> IAM -> Users -> Select User -> Security Credentials -> Create Access Key (only shown once)
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Connection string to your Production Postgres database
DATABASE_URL=postgres://prod-user:pass@host:5432/db

# Comma-separated list of allowed frontend URLs (CORS)
CORS_ORIGINS=https://yourdomain.com

# Random 32-character string for JWT/Session signing (Generate via `openssl rand -base64 32`)
BETTER_AUTH_SECRET=a_random_secure_string_for_production

# Allowed domains for authentication cookies
BETTER_AUTH_TRUSTED_ORIGINS=https://yourdomain.com

# OAuth Client ID
# ↳ Get from: Google Cloud Console -> APIs & Services -> Credentials
GOOGLE_CLIENT_ID=your-prod-client-id.apps.googleusercontent.com

# OAuth Client Secret
# ↳ Get from: Google Cloud Console -> APIs & Services -> Credentials
GOOGLE_CLIENT_SECRET=your-prod-client-secret
```

**Variables:**
```env
# Your AWS Region Code
# ↳ Get from: Look at the top right corner of your AWS console (e.g. us-east-1, ap-southeast-1)
AWS_REGION=us-east-1

# The base name you chose for this project. Used to identify resources.
PROJECT_NAME=turbo-template

# The base path where the ALB routes backend traffic
NEXT_PUBLIC_API_BASE_URL=/api

# The name of the Production Web ECR Repository (Created in Step 5)
ECR_REPOSITORY_WEB=turbo-template-web

# The name of the Production Backend ECR Repository (Created in Step 5)
ECR_REPOSITORY_BACKEND=turbo-template-backend

# The name of the Production ECS Cluster (Created in Step 7)
ECS_CLUSTER=turbo-template-cluster

# The name of the Production Web ECS Service (Created in Step 10)
ECS_SERVICE_WEB=turbo-template-web-service

# The name of the Production Backend ECS Service (Created in Step 10)
ECS_SERVICE_BACKEND=turbo-template-backend-service

# The public URL for the Production frontend application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

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
