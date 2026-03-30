# AWS Deployment Guide

This monorepo uses **two different deployment strategies** depending on the environment:

| Environment    | Strategy                             | Infrastructure        | Workflow                |
| -------------- | ------------------------------------ | --------------------- | ----------------------- |
| **Staging**    | Single EC2 + Host Nginx (subdomains) | 1 EC2 instance        | `deploy-staging.yml`    |
| **Production** | ECS Fargate + ALB                    | Fargate cluster + ALB | `deploy-production.yml` |

## Architecture Overview

```
                    ┌─────────────────────────────────────────────────────┐
  STAGING           │  Single EC2 Instance                                │
  (branch: staging) │                                                     │
                    │  ┌─────────────────────────────────────────────┐    │
                    │  │ Nginx (host-installed)                      │    │
                    │  │   staging.example.com     → 127.0.0.1:3001  │    │
                    │  │   api.staging.example.com → 127.0.0.1:3000  │    │
                    │  │   + Certbot SSL (Let's Encrypt)             │    │
                    │  └─────────────────────────────────────────────┘    │
                    │                                                     │
                    │  ┌──────────────┐  ┌──────────────┐                 │
                    │  │ Web (Docker) │  │ API (Docker)  │                │
                    │  │ Next.js:3001 │  │ NestJS:3000   │                │
                    │  └──────────────┘  └──────────────┘                 │
                    │         Docker Compose (apps only)                  │
                    └─────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────────┐
  PRODUCTION        │  AWS ECS Fargate                                    │
  (branch:          │  ┌─────┐  ┌──────────────┐                          │
   production)      │  │     │→ │ Web Service   │ (Fargate task)          │
                    │  │ ALB │  └──────────────┘                          │
                    │  │     │→ ┌──────────────┐                          │
                    │  │     │  │ Backend Svc   │ (Fargate task)          │
                    │  └─────┘  └──────────────┘                          │
                    │    api.domain.com → backend, domain.com → web       │
                    └─────────────────────────────────────────────────────┘
```

### Subdomain Routing (Staging)

Each app gets its own subdomain. This is extensible for future microservices:

| Subdomain                    | Routes to         | Port |
| ---------------------------- | ----------------- | ---- |
| `staging.yourdomain.com`     | Web (Next.js)     | 3001 |
| `api.staging.yourdomain.com` | Backend (NestJS)  | 3000 |
| _(future)_ `ws.staging...`   | WebSocket service | 3002 |
| _(future)_ `admin.staging..` | Admin panel       | 3003 |

### Relevant Files

| File                                      | Purpose                                         |
| ----------------------------------------- | ----------------------------------------------- |
| `.github/workflows/ci.yml`                | CI (lint, typecheck, format) on all branches    |
| `.github/workflows/deploy-staging.yml`    | Staging deploy → EC2 via SSH                    |
| `.github/workflows/deploy-production.yml` | Production deploy → ECS Fargate                 |
| `aws/ec2/docker-compose.staging.yml`      | Docker Compose for app containers only          |
| `aws/ec2/nginx/web.conf`                  | Nginx HTTP template for web subdomain           |
| `aws/ec2/nginx/web-ssl.conf`              | Nginx HTTPS template for web subdomain          |
| `aws/ec2/nginx/api.conf`                  | Nginx HTTP template for API subdomain           |
| `aws/ec2/nginx/api-ssl.conf`              | Nginx HTTPS template for API subdomain          |
| `aws/ec2/setup-ec2.sh`                    | EC2 bootstrap (Docker, Nginx, Certbot, AWS CLI) |
| `aws/ec2/init-ssl.sh`                     | One-time SSL certificate setup                  |
| `aws/ecs/task-definition-*.json`          | ECS Fargate task definitions (production)       |
| `apps/web/Dockerfile`                     | Web app Docker image                            |
| `apps/backend/Dockerfile`                 | Backend Docker image                            |

---

## Branch and Deployment Mapping

| Branch       | CI                      | Deployment                 |
| ------------ | ----------------------- | -------------------------- |
| `dev`        | Lint, typecheck, format | None                       |
| `staging`    | Lint, typecheck, format | Auto-deploy to EC2         |
| `production` | Lint, typecheck, format | Auto-deploy to ECS Fargate |

---

## 1) Prerequisites

1. **AWS account** with AWS CLI installed locally (`aws configure`).
   - IAM user needs `AdministratorAccess` (or sufficient permissions for ECR, EC2, ECS, VPC, ALB, IAM).
2. **GitHub repository** admin access (for Secrets/Variables).
3. **Database connection string** for `DATABASE_URL`.
4. **Domain name** with DNS access (for subdomain configuration).
5. **Infrastructure repo** (separate repo) — provisions VPC, ECS cluster, ALB, ECR, IAM roles via Terraform. See the `infra/` template in this repo root for a ready-to-use starting point.

---

# Part A: Staging Deployment (Single EC2 + Subdomains)

## 2) Launch an EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**.
2. Choose **Amazon Linux 2023** or **Ubuntu 22.04+**.
3. Instance type: **t3.small** (recommended) or **t3.micro** (minimum).
4. Configure networking:
   - Place in a **public subnet** (or use an Elastic IP).
   - Security Group: Allow inbound **TCP 80** (HTTP), **TCP 443** (HTTPS), **TCP 22** (SSH).
5. Create or select a **key pair** for SSH access.
6. Launch the instance and note the **public IP or DNS**.

## 3) Configure DNS Records

Point your subdomains to the EC2 instance's public IP:

```
staging.yourdomain.com       A  →  <EC2_PUBLIC_IP>
api.staging.yourdomain.com   A  →  <EC2_PUBLIC_IP>
```

> **Tip**: Use an Elastic IP so the IP doesn't change on instance restart.

## 4) Setup the EC2 Instance

SSH into your instance and run the bootstrap script:

```bash
# Copy the setup script to the instance
scp -i your-key.pem aws/ec2/setup-ec2.sh ec2-user@<EC2_HOST>:/tmp/

# SSH in and run it
ssh -i your-key.pem ec2-user@<EC2_HOST>
sudo chmod +x /tmp/setup-ec2.sh
sudo /tmp/setup-ec2.sh
```

This installs **Docker, Docker Compose, Nginx, Certbot, and AWS CLI**, and creates the `/opt/staging` directory.

## 5) Attach an IAM Role to the EC2 Instance

Create an IAM Role with `AmazonEC2ContainerRegistryReadOnly` policy and attach it to the EC2 instance. This allows the instance to pull Docker images from ECR without storing credentials.

1. **AWS Console → IAM → Roles → Create Role**.
2. Trusted entity: **AWS Service → EC2**.
3. Attach policy: `AmazonEC2ContainerRegistryReadOnly`.
4. Name: `staging-ec2-ecr-pull-role`.
5. **AWS Console → EC2 → Select instance → Actions → Security → Modify IAM Role** → attach the role.

## 6) Create ECR Repositories for Staging

```bash
aws ecr create-repository --repository-name turbo-template-web-staging --region ap-southeast-1
aws ecr create-repository --repository-name turbo-template-backend-staging --region ap-southeast-1
```

## 7) Configure GitHub Environment: `staging`

Go to **GitHub → Settings → Environments → Create: `staging`**.

### Secrets

| Secret                        | Example Value                               | Description                   |
| ----------------------------- | ------------------------------------------- | ----------------------------- |
| `AWS_ACCESS_KEY_ID`           | `AKIAIOSFODNN7EXAMPLE`                      | AWS access key (push images)  |
| `AWS_SECRET_ACCESS_KEY`       | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`  | AWS secret key                |
| `EC2_HOST`                    | `12.34.56.78`                               | EC2 public IP                 |
| `EC2_USER`                    | `ec2-user`                                  | SSH user                      |
| `EC2_SSH_KEY`                 | `-----BEGIN RSA PRIVATE KEY-----\n...`      | Full .pem private key content |
| `DATABASE_URL`                | `postgres://user:pass@host:5432/db`         | Database connection string    |
| `CORS_ORIGINS`                | `https://staging.yourdomain.com`            | Allowed CORS origin           |
| `BETTER_AUTH_SECRET`          | `random_secure_string`                      | Auth secret                   |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `https://staging.yourdomain.com`            | Auth trusted origin           |
| `GOOGLE_CLIENT_ID`            | `your-client-id.apps.googleusercontent.com` | Google OAuth client ID        |
| `GOOGLE_CLIENT_SECRET`        | `your-client-secret`                        | Google OAuth secret           |

### Variables

| Variable                   | Example Value                            | Description          |
| -------------------------- | ---------------------------------------- | -------------------- |
| `AWS_REGION`               | `ap-southeast-1`                         | AWS region           |
| `PROJECT_NAME`             | `turbo-template`                         | Project name         |
| `ECR_REPOSITORY_WEB`       | `turbo-template-web-staging`             | ECR repo for web     |
| `ECR_REPOSITORY_BACKEND`   | `turbo-template-backend-staging`         | ECR repo for backend |
| `DOMAIN_WEB`               | `staging.yourdomain.com`                 | Web app subdomain    |
| `DOMAIN_API`               | `api.staging.yourdomain.com`             | API subdomain        |
| `NEXT_PUBLIC_APP_URL`      | `https://staging.yourdomain.com`         | Public web URL       |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.staging.yourdomain.com/api` | Public API base URL  |
| `NEXT_PUBLIC_API_VERSION`  | `1`                                      | API version          |

> **Important**: With subdomain routing, `NEXT_PUBLIC_API_BASE_URL` is a full URL (e.g., `https://api.staging.yourdomain.com/api`), not a relative path like `/api`.

## 8) Deploy to Staging

Two options:

1. **Push/merge to `staging` branch** — auto-triggers `deploy-staging.yml`
2. **Manual trigger** — Go to Actions → "Deploy Staging (EC2)" → Run workflow

### What the workflow does:

1. Builds web and backend Docker images
2. Pushes images to ECR (staging repositories)
3. SSHs into the EC2 instance
4. Copies `docker-compose.staging.yml` and Nginx templates to `/opt/staging/`
5. Writes `.env` with all secrets/variables
6. Pulls the new images from ECR
7. Runs `docker compose up -d` to start/restart containers
8. Generates Nginx configs from templates (auto-detects SSL)
9. Reloads Nginx
10. Runs health checks

### How it works on the EC2:

```
Internet
  ├── staging.yourdomain.com     → Nginx :80/:443 → 127.0.0.1:3001 (Web container)
  └── api.staging.yourdomain.com → Nginx :80/:443 → 127.0.0.1:3000 (Backend container)
```

## 9) Setup SSL (One-Time, After First Deploy)

After the first deployment succeeds (containers running, Nginx serving HTTP), set up HTTPS:

```bash
ssh -i your-key.pem ec2-user@<EC2_HOST>

# Run the SSL setup script
sudo /opt/staging/init-ssl.sh admin@example.com \
  staging.yourdomain.com \
  api.staging.yourdomain.com
```

This:

1. Gets SSL certificates from Let's Encrypt via certbot webroot
2. Updates Nginx configs to enable HTTPS with HTTP→HTTPS redirects
3. Sets up auto-renewal via cron (runs daily at 3 AM)

After running, trigger another deployment (or push to staging) — the workflow will automatically detect the SSL certs and use HTTPS configs from then on.

## 10) Adding a New Microservice Subdomain

To add a new service (e.g., `ws.staging.yourdomain.com`):

1. Add a new service to `docker-compose.staging.yml` with `127.0.0.1:<port>:<port>`
2. Create `aws/ec2/nginx/ws.conf` and `aws/ec2/nginx/ws-ssl.conf` (copy from api templates, change port)
3. Add `DOMAIN_WS` variable to GitHub environment
4. Add the Nginx config generation block in `deploy-staging.yml`
5. Add DNS record: `ws.staging.yourdomain.com A → <EC2_IP>`
6. Run: `sudo certbot certonly --webroot -w /var/www/certbot -d ws.staging.yourdomain.com`

---

# Part B: Production Deployment (ECS Fargate)

## 11) Create Production Infrastructure (Separate Repo)

Infrastructure is managed in a **separate Terraform repository** (see the `infra/` template in the monorepo root for a ready-to-use starting point).

The infra repo creates: VPC, subnets, NAT gateway, ALB, ECS cluster, ECR repositories, security groups, IAM roles.

After running `terraform apply` in the infra repo, it outputs the values you need to set as GitHub Variables in this app repo (ECR repo names, ECS cluster name, service names, ALB DNS, etc.).

## 12) Configure GitHub Environment: `production`

Go to **GitHub → Settings → Environments → Create: `production`**.

### Secrets

| Secret                        | Example Value                                    |
| ----------------------------- | ------------------------------------------------ |
| `AWS_ACCESS_KEY_ID`           | `AKIAIOSFODNN7EXAMPLE`                           |
| `AWS_SECRET_ACCESS_KEY`       | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`       |
| `DATABASE_URL`                | `postgres://prod-user:pass@host:5432/db`         |
| `CORS_ORIGINS`                | `https://yourdomain.com`                         |
| `BETTER_AUTH_SECRET`          | `random_secure_string_for_production`            |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `https://yourdomain.com`                         |
| `GOOGLE_CLIENT_ID`            | `your-prod-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`        | `your-prod-client-secret`                        |

### Variables

| Variable                   | Example Value                               |
| -------------------------- | ------------------------------------------- |
| `AWS_REGION`               | `ap-southeast-1`                            |
| `PROJECT_NAME`             | `turbo-template`                            |
| `ECR_REPOSITORY_WEB`       | `turbo-template-web-production`             |
| `ECR_REPOSITORY_BACKEND`   | `turbo-template-backend-production`         |
| `ECS_CLUSTER`              | `turbo-template-cluster-production`         |
| `ECS_SERVICE_WEB`          | `turbo-template-web-production-service`     |
| `ECS_SERVICE_BACKEND`      | `turbo-template-backend-production-service` |
| `NEXT_PUBLIC_APP_URL`      | `https://yourdomain.com`                    |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.yourdomain.com/api`            |
| `NEXT_PUBLIC_API_VERSION`  | `1`                                         |
| `BETTER_AUTH_COOKIE_DOMAIN`| `.yourdomain.com`                           |

> **Note**: Production uses ALB host-based (subdomain) routing — consistent with staging. `NEXT_PUBLIC_API_BASE_URL` is a full URL (e.g., `https://api.yourdomain.com/api`), not a relative path. `BETTER_AUTH_COOKIE_DOMAIN` must start with `.` (dot) to allow cookies to work across both `yourdomain.com` and `api.yourdomain.com`.

## 13) Deploy to Production

Two options:

1. **Push/merge to `production` branch** — auto-triggers `deploy-production.yml`
2. **Manual trigger** — Go to Actions → "Deploy Production (ECS Fargate)" → Run workflow

### What the workflow does:

1. Builds web and backend Docker images
2. Pushes images to ECR (production repositories)
3. Registers new ECS task definitions with updated image tags
4. Updates ECS services with new task definitions
5. Waits for services to stabilize (rolling deployment)

> **Note**: Infrastructure must already exist (created via the infra repo). This workflow only deploys application code.

### How it works on AWS:

```
Internet → ALB (:80/:443)
              ├── api.yourdomain.com  → Backend Target Group → Fargate Task (NestJS :3000)
              └── yourdomain.com      → Web Target Group     → Fargate Task (Next.js :3001)
```

---

# Verification & Troubleshooting

## 14) Verify Deployment

### Staging (EC2)

```bash
# SSH in and check
ssh -i your-key.pem ec2-user@<EC2_HOST>
cd /opt/staging

# Container status
docker compose -f docker-compose.staging.yml ps

# Container logs
docker compose -f docker-compose.staging.yml logs -f

# Nginx status
sudo systemctl status nginx
sudo nginx -t

# Test locally on EC2
curl -sf http://127.0.0.1:3001/        # Web
curl -sf http://127.0.0.1:3000/api/v1/health  # Backend

# From your browser:
# https://staging.yourdomain.com/              → Web app
# https://api.staging.yourdomain.com/api/v1/health → Backend health
```

### Production (ECS Fargate)

1. Check ECS services are stable in AWS Console → ECS → Clusters.
2. Check target groups show healthy targets in EC2 → Target Groups.
3. Visit your domains:
   - `https://yourdomain.com/` → web app
   - `https://api.yourdomain.com/api/v1/health` → backend health
4. Check logs in CloudWatch:
   - `/ecs/${PROJECT_NAME}-web-production`
   - `/ecs/${PROJECT_NAME}-backend-production`

## 15) Troubleshooting

### Staging (EC2)

1. **SSH connection refused**
   - Check Security Group allows port 22 from your IP.
   - Verify `EC2_HOST`, `EC2_USER`, and `EC2_SSH_KEY` GitHub secrets.

2. **Docker login fails**
   - Verify IAM role is attached to EC2 with `AmazonEC2ContainerRegistryReadOnly`.

3. **Containers won't start**
   - Check logs: `docker compose -f docker-compose.staging.yml logs`
   - Verify `.env` file contents in `/opt/staging/.env`

4. **Nginx returns 502/504**
   - Container still starting — wait 30s and retry.
   - Check: `docker compose -f docker-compose.staging.yml ps` — should show "Up".
   - Check Nginx config: `sudo nginx -t`
   - Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

5. **SSL cert fails to generate**
   - Verify DNS records point to the EC2 IP: `dig staging.yourdomain.com`
   - Ensure port 80 is open in Security Group.
   - Check Nginx is serving the certbot challenge: `curl http://staging.yourdomain.com/.well-known/acme-challenge/test`

### Production (ECS Fargate)

1. **GitHub preflight failure**
   - Missing/empty repo Variables or Secrets.

2. **ECS task won't start**
   - Wrong image URI/repo name/region.
   - Missing IAM permissions on execution role.

3. **Health check fails**
   - Backend endpoint must be `/api/v1/health` on port `3000`.
   - Web endpoint must be `/` on port `3001`.

4. **ALB returns 5xx**
   - Target groups unhealthy or SG routing mismatch.

5. **Runtime config crash**
   - Validate required backend env vars: `DATABASE_URL`, `CORS_ORIGINS`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_TRUSTED_ORIGINS`.

---

# Environment Variables Reference

This section is the single source of truth for **every** environment variable used in local development, staging, and production. It maps each variable to where it comes from and where it needs to be set.

## Local Development (`.env` files)

Create `.env` files in each workspace by copying the `.env.example` templates:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/backend/.env.example apps/backend/.env
cp packages/db/.env.example packages/db/.env
```

### `apps/web/.env`

| Variable                   | Default                     | Description                   |
| -------------------------- | --------------------------- | ----------------------------- |
| `NODE_ENV`                 | `development`               | Node environment              |
| `NEXT_PUBLIC_APP_URL`      | `http://localhost:3001`     | Public URL of the web app     |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3000/api` | Public URL of the backend API |
| `NEXT_PUBLIC_API_VERSION`  | `v1`                        | API version prefix            |

### `apps/backend/.env`

| Variable                      | Default                                                      | Description                                      |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `NODE_ENV`                    | `development`                                                | Node environment                                 |
| `PORT`                        | `3000`                                                       | Backend server port                              |
| `CORS_ORIGINS`                | `http://localhost:3001,http://localhost:3000`                | Allowed CORS origins (comma-separated)           |
| `DATABASE_URL`                | `postgres://postgres:password@localhost:5432/turbo-template` | PostgreSQL connection string (Supabase or local) |
| `BETTER_AUTH_SECRET`          | `default-secret-for-testing-change-in-production`            | Better Auth signing secret                       |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `http://localhost:3001,http://localhost:3000`                | Trusted origins for auth                         |
| `BETTER_AUTH_COOKIE_DOMAIN`   | `localhost`                                                  | Cookie domain for auth                           |
| `GOOGLE_CLIENT_ID`            | _(your Google OAuth client ID)_                              | Google OAuth client ID                           |
| `GOOGLE_CLIENT_SECRET`        | _(your Google OAuth client secret)_                          | Google OAuth client secret                       |

### `packages/db/.env`

| Variable       | Default                                                      | Description                                                                        |
| -------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `DATABASE_URL` | `postgres://postgres:password@localhost:5432/turbo-template` | Same connection string, used by Drizzle CLI (`db:push`, `db:migrate`, `db:studio`) |

> **Supabase**: Use your Supabase connection string for `DATABASE_URL` (e.g. `postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`). Works the same for local and deployed environments.

---

## GitHub Environments: What Goes Where

After running `terraform apply` in the infra repo, its outputs tell you the AWS resource names. Combine those with your app secrets below.

### Legend

| Icon      | Meaning                                             |
| --------- | --------------------------------------------------- |
| **TF**    | Value comes from Terraform output (infra repo)      |
| **You**   | Value you set yourself (credentials, URLs, secrets) |
| **Fixed** | Hardcoded / same for everyone                       |

---

### Staging Environment (`GitHub > Settings > Environments > staging`)

#### Secrets (sensitive - never log these)

| Secret                        | Source  | Example                                                      |
| ----------------------------- | ------- | ------------------------------------------------------------ |
| `AWS_ACCESS_KEY_ID`           | **You** | `AKIAIOSFODNN7EXAMPLE`                                       |
| `AWS_SECRET_ACCESS_KEY`       | **You** | `wJalrXUtnFEMI/K7MDENG/...`                                  |
| `EC2_HOST`                    | **You** | `12.34.56.78` (EC2 public IP)                                |
| `EC2_USER`                    | **You** | `ec2-user` (Amazon Linux) or `ubuntu`                        |
| `EC2_SSH_KEY`                 | **You** | Full `.pem` private key content                              |
| `DATABASE_URL`                | **You** | `postgres://user:pass@host:6543/postgres` (Supabase staging) |
| `CORS_ORIGINS`                | **You** | `https://staging.yourdomain.com`                             |
| `BETTER_AUTH_SECRET`          | **You** | Random 32+ char string (different from production)           |
| `BETTER_AUTH_TRUSTED_ORIGINS` | **You** | `https://staging.yourdomain.com`                             |
| `GOOGLE_CLIENT_ID`            | **You** | `your-staging-client-id.apps.googleusercontent.com`          |
| `GOOGLE_CLIENT_SECRET`        | **You** | `your-staging-client-secret`                                 |

#### Variables (non-sensitive)

| Variable                   | Source    | Example                                  |
| -------------------------- | --------- | ---------------------------------------- |
| `AWS_REGION`               | **You**   | `ap-southeast-1`                         |
| `PROJECT_NAME`             | **You**   | `turbo-template`                         |
| `ECR_REPOSITORY_WEB`       | **TF**    | `turbo-template-web-staging`             |
| `ECR_REPOSITORY_BACKEND`   | **TF**    | `turbo-template-backend-staging`         |
| `DOMAIN_WEB`               | **You**   | `staging.yourdomain.com`                 |
| `DOMAIN_API`               | **You**   | `api.staging.yourdomain.com`             |
| `NEXT_PUBLIC_APP_URL`      | **You**   | `https://staging.yourdomain.com`         |
| `NEXT_PUBLIC_API_BASE_URL` | **You**   | `https://api.staging.yourdomain.com/api` |
| `NEXT_PUBLIC_API_VERSION`  | **Fixed** | `1`                                      |

> **Terraform outputs for staging**: After `cd infra/environments/staging && terraform output`:
>
> ```
> ecr_web_repository_name     = "turbo-template-web-staging"       → vars.ECR_REPOSITORY_WEB
> ecr_backend_repository_name = "turbo-template-backend-staging"   → vars.ECR_REPOSITORY_BACKEND
> ```

---

### Production Environment (`GitHub > Settings > Environments > production`)

#### Secrets (sensitive)

| Secret                        | Source  | Example                                                         |
| ----------------------------- | ------- | --------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`           | **You** | `AKIAIOSFODNN7EXAMPLE`                                          |
| `AWS_SECRET_ACCESS_KEY`       | **You** | `wJalrXUtnFEMI/K7MDENG/...`                                     |
| `DATABASE_URL`                | **You** | `postgres://user:pass@host:6543/postgres` (Supabase production) |
| `CORS_ORIGINS`                | **You** | `https://yourdomain.com`                                        |
| `BETTER_AUTH_SECRET`          | **You** | Random 32+ char string (different from staging)                 |
| `BETTER_AUTH_TRUSTED_ORIGINS` | **You** | `https://yourdomain.com`                                        |
| `GOOGLE_CLIENT_ID`            | **You** | `your-prod-client-id.apps.googleusercontent.com`                |
| `GOOGLE_CLIENT_SECRET`        | **You** | `your-prod-client-secret`                                       |

#### Variables (non-sensitive)

| Variable                    | Source    | Example                                     |
| --------------------------- | --------- | ------------------------------------------- |
| `AWS_REGION`                | **You**   | `ap-southeast-1`                            |
| `PROJECT_NAME`              | **You**   | `turbo-template`                            |
| `ECR_REPOSITORY_WEB`        | **TF**    | `turbo-template-web-production`             |
| `ECR_REPOSITORY_BACKEND`    | **TF**    | `turbo-template-backend-production`         |
| `ECS_CLUSTER`               | **TF**    | `turbo-template-cluster-production`         |
| `ECS_SERVICE_WEB`           | **TF**    | `turbo-template-web-production-service`     |
| `ECS_SERVICE_BACKEND`       | **TF**    | `turbo-template-backend-production-service` |
| `NEXT_PUBLIC_APP_URL`       | **You**   | `https://yourdomain.com`                    |
| `NEXT_PUBLIC_API_BASE_URL`  | **You**   | `https://api.yourdomain.com/api`            |
| `NEXT_PUBLIC_API_VERSION`   | **Fixed** | `1`                                         |
| `BETTER_AUTH_COOKIE_DOMAIN` | **You**   | `.yourdomain.com`                           |

> **Terraform outputs for production**: After `cd infra/environments/production && terraform output`:
>
> ```
> ecr_web_repository_name     = "turbo-template-web-production"           → vars.ECR_REPOSITORY_WEB
> ecr_backend_repository_name = "turbo-template-backend-production"       → vars.ECR_REPOSITORY_BACKEND
> ecs_cluster_name            = "turbo-template-cluster-production"       → vars.ECS_CLUSTER
> ecs_web_service_name        = "turbo-template-web-production-service"   → vars.ECS_SERVICE_WEB
> ecs_backend_service_name    = "turbo-template-backend-production-service" → vars.ECS_SERVICE_BACKEND
> alb_dns_name                = "turbo-template-prod-alb-123456.ap-southeast-1.elb.amazonaws.com"
> ```
>
> Point **both** your web and API domain CNAMEs to the `alb_dns_name` value:
> ```
> yourdomain.com        CNAME  →  turbo-template-prod-alb-123456.ap-southeast-1.elb.amazonaws.com
> api.yourdomain.com    CNAME  →  turbo-template-prod-alb-123456.ap-southeast-1.elb.amazonaws.com
> ```

---

## Quick Checklist

### Before first deploy to staging:

- [ ] EC2 instance launched and setup script run
- [ ] DNS records pointing to EC2 IP
- [ ] `terraform apply` in `infra/environments/staging/`
- [ ] All 11 staging secrets set in GitHub
- [ ] All 9 staging variables set in GitHub (including TF outputs)
- [ ] Push to `staging` branch

### Before first deploy to production:

- [ ] `terraform apply` in `infra/environments/production/` (set `api_domain` in `terraform.tfvars`)
- [ ] All 8 production secrets set in GitHub
- [ ] All 11 production variables set in GitHub (including TF outputs and `BETTER_AUTH_COOKIE_DOMAIN`)
- [ ] DNS: `yourdomain.com` CNAME → ALB DNS
- [ ] DNS: `api.yourdomain.com` CNAME → ALB DNS
- [ ] Push to `production` branch

---

## 16) Recommended Improvements

1. **Staging**: Use an Elastic IP so the EC2 IP doesn't change on restart.
2. **Production**: Add HTTPS listener on ALB with ACM certificate.
3. Move sensitive env values to AWS Secrets Manager/SSM.
4. Add autoscaling policies for production ECS services.
5. Add WAF + HTTPS-only redirect on the ALB.
6. Set up CloudWatch alarms via the infra repo (set `enable_alarms = true` in `terraform.tfvars`).
