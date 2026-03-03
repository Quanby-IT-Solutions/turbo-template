# AWS Deployment Tutorial (Step by Step)

This tutorial walks you through deploying this monorepo to AWS using:

- Docker images in ECR
- ECS Fargate services (web + backend)
- Application Load Balancer path routing
- GitHub Actions CI/CD (`dev`, `staging`, and `production` branches)

It is aligned with the current repository files:

- `apps/web/Dockerfile`
- `apps/backend/Dockerfile`
- `aws/ecs/task-definition-*.json`
- `.github/workflows/deploy.yml`
- `.github/workflows/ci.yml`

---

## Branch and deployment mapping

- `dev` branch: CI runs, no deployment.
- `staging` branch: CI runs, auto deploys to `staging`.
- `production` branch: CI runs, auto deploys to `production`.

## CI workflow trigger behavior

`CI` runs on:

- `push` to `dev`, `staging`, and `production`
- `pull_request` targeting `dev`, `staging`, and `production`
- `workflow_dispatch` manual trigger

---

## 1) Prerequisites

Before you start, ensure you have:

1. AWS account and AWS CLI installed locally (`aws configure`). **Note:** The IAM user configuring your local AWS CLI must have the `AdministratorAccess` policy (or sufficient equivalent permissions to create VPCs, ECS Clusters, ECR Repositories, ALBs, and IAM Roles).
2. Terraform installed locally (`terraform -v`).
3. GitHub repository admin access (for repo Secrets/Variables).
4. A database connection string for `DATABASE_URL`.

---

## 2) Automatically Create AWS Infrastructure (Terraform)

Instead of manually clicking through the AWS console to create a VPC, Security Groups, ECR Repositories, an ECS Cluster, and a Load Balancer, you can create them all in 3 minutes using the provided Terraform scripts.

1. Initialize Terraform (downloads AWS provider):
   ```bash
   terraform -chdir=aws/terraform init
   ```
2. Run the plan to see what will be created:
   ```bash
   terraform -chdir=aws/terraform plan -var="project_name=turbo-template" -var="environment=staging"
   ```
3. Apply the configuration to build your infrastructure!
   ```bash
   terraform -chdir=aws/terraform apply -var="project_name=turbo-template" -var="environment=staging"
   ```

_Terraform will output your Load Balancer URL (`alb_dns_name`) when it finishes. Save this URL!_

**Note:** To create your production infrastructure, run the exact same apply command but change `environment=staging` to `environment=production`.

---

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
# ↳ Get from: Look at the top right corner of your AWS console (e.g. ap-southeast-1)
AWS_REGION=ap-southeast-1

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
# ↳ Get from: Look at the top right corner of your AWS console (e.g. ap-southeast-1, ap-southeast-1)
AWS_REGION=ap-southeast-1

# The base name you chose for this project. Used to identify resources.
PROJECT_NAME=turbo-template

# The base path where the ALB routes backend traffic
NEXT_PUBLIC_API_BASE_URL=/api

# The name of the Production Web ECR Repository (Created in Step 5)
ECR_REPOSITORY_WEB=turbo-template-web-production

# The name of the Production Backend ECR Repository (Created in Step 5)
ECR_REPOSITORY_BACKEND=turbo-template-backend-production

# The name of the Production ECS Cluster (Created in Step 7)
ECS_CLUSTER=turbo-template-cluster-production

# The name of the Production Web ECS Service (Created in Step 10)
ECS_SERVICE_WEB=turbo-template-web-production-service

# The name of the Production Backend ECS Service (Created in Step 10)
ECS_SERVICE_BACKEND=turbo-template-backend-production-service

# The public URL for the Production frontend application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Note: task definition templates are selected internally by the deployment workflow via:

- `aws/ecs/task-definition-web.json`
- `aws/ecs/task-definition-backend.json`
- `aws/ecs/task-definition-web-staging.json`
- `aws/ecs/task-definition-backend-staging.json`

Note: production resource names above align with Terraform naming `${project_name}-<resource>-${environment}`.

Note: workflows now include a preflight step that fails early if required variables are empty.

---

## 10) Deploy to staging

Two options:

1. Push to branch `staging`
2. Manually trigger workflow: **Deploy** with:
   - `branch=staging`
   - `environment=staging`

For manual deploys, branch and environment must match (`staging` -> `staging`).

Workflow actions include:

- run Terraform `init` / `plan` / `apply` in `aws/terraform` with `project_name` and `environment` variables
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
