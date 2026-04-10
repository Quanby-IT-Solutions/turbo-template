---
name: aws-infrastructure
description: AWS infrastructure patterns for this monorepo. Infrastructure is managed in a separate turbo-infrastructure repo via Terraform modules. This app repo only contains deployment workflows (GitHub Actions) and a docker-compose for staging. Use when deploying to AWS, configuring CI/CD, or setting up GitHub environment variables.
---

# AWS Infrastructure

## Architecture

Infrastructure is split across two repositories:

| Repository                     | Purpose                                                   |
| ------------------------------ | --------------------------------------------------------- |
| **turbo-template** (this repo) | App code + CI/CD workflows + `docker-compose.staging.yml` |
| **turbo-infrastructure**       | Terraform modules (VPC, ECS, ALB, ECR, EC2, monitoring)   |

### Deployment Strategies

| Environment | Branch       | Strategy                          | Infrastructure          |
| ----------- | ------------ | --------------------------------- | ----------------------- |
| Staging     | `staging`    | EC2 + Docker Compose + host Nginx | Single EC2 instance     |
| Production  | `production` | ECS Fargate + ALB                 | Auto-managed containers |

### Architecture Diagram

```
STAGING:
  Internet → Nginx (EC2 host) → Docker Compose
                                   ├── Web (port 3001)
                                   └── Backend (port 3000)

PRODUCTION:
  Internet → ALB (port 80/443)
               ├── / → Web Target Group (port 3001)
               └── /api/* → Backend Target Group (port 3000)
                      ↓
                ECS Fargate (private subnets)
                ├── Web Service (512 CPU, 1024 MB)
                └── Backend Service (512 CPU, 1024 MB)
```

## App Repo Structure

```
.
├── docker-compose.staging.yml   # Docker Compose for staging EC2
├── docker-compose.yml           # Docker Compose for local dev
└── .github/workflows/
    ├── ci.yml                   # CI checks (lint, typecheck, format)
    ├── deploy-staging.yml       # Staging deploy (EC2)
    └── deploy-production.yml    # Production deploy (ECS Fargate)
```

All infrastructure templates (Terraform, nginx configs, task definitions) have been moved to the infra repo or inlined into CI/CD workflows. Developers only need to:

1. Set GitHub environment variables (see Deployment section in `README.md`)
2. Merge to `staging` or `production` branch

## CI/CD Workflows

### Staging (`deploy-staging.yml`)

1. CI passes (lint, typecheck, build)
2. Build Docker images → push to ECR
3. SSH into EC2 → copy docker-compose + generate nginx configs
4. `docker compose up` → configure nginx → health checks
5. Auto-rollback on health check failure

Nginx configs are generated **inline in the workflow** using heredocs. SSL detection is automatic — if Let's Encrypt certs exist, HTTPS configs are used.

### Production (`deploy-production.yml`)

1. CI passes
2. Build Docker images → push to ECR
3. Register ECS task definitions (generated **inline** via heredocs)
4. Deploy to ECS services → wait for stabilization
5. Auto-rollback to previous task definition on failure

Task definitions use `ECS_EXECUTION_ROLE_ARN` and `ECS_TASK_ROLE_ARN` from GitHub variables (sourced from Terraform outputs).

## ECS Task Definition Pattern

Task definitions are constructed inline in the production workflow:

```json
{
	"family": "${PROJECT_NAME}-web-production",
	"cpu": "512",
	"memory": "1024",
	"networkMode": "awsvpc",
	"requiresCompatibilities": ["FARGATE"],
	"executionRoleArn": "${ECS_EXECUTION_ROLE_ARN}",
	"taskRoleArn": "${ECS_TASK_ROLE_ARN}",
	"containerDefinitions": [
		{
			"name": "web",
			"image": "${ECR_REGISTRY}/${ECR_REPOSITORY_WEB}:${IMAGE_TAG}",
			"portMappings": [{ "containerPort": 3001 }],
			"environment": [
				{ "name": "NODE_ENV", "value": "production" },
				{ "name": "NEXT_PUBLIC_APP_URL", "value": "..." },
				{ "name": "NEXT_PUBLIC_API_BASE_URL", "value": "..." }
			],
			"healthCheck": {
				"command": ["CMD-SHELL", "wget --spider http://localhost:3001/ || exit 1"]
			},
			"logConfiguration": {
				"logDriver": "awslogs",
				"options": {
					"awslogs-group": "/ecs/${PROJECT_NAME}-web-production",
					"awslogs-region": "${AWS_REGION}"
				}
			}
		}
	]
}
```

## GitHub Environment Variables

See the Deployment section in `README.md` for the complete list. Key additions for production:

| Variable                 | Source                                    |
| ------------------------ | ----------------------------------------- |
| `ECS_EXECUTION_ROLE_ARN` | `terraform output ecs_execution_role_arn` |
| `ECS_TASK_ROLE_ARN`      | `terraform output ecs_task_role_arn`      |
| `ECS_CLUSTER`            | `terraform output ecs_cluster_name`       |
| `ECS_SERVICE_WEB`        | `terraform output ecs_service_names`      |
| `ECS_SERVICE_BACKEND`    | `terraform output ecs_service_names`      |

## Troubleshooting

1. **Service not starting** → Check CloudWatch logs: `/ecs/{PROJECT_NAME}-{service}-production`
2. **Health check failing** → Verify endpoint responds: `/api/v1/health` (backend), `/` (web)
3. **Image pull errors** → Check ECR URI matches, verify execution role has `ecr:GetDownloadUrlForLayer`
4. **Permission denied** → Verify task execution role has ECR pull + CloudWatch policies
5. **503 errors** → Check target group health, security group allows ALB → ECS
6. **Env vars missing** → Verify GitHub environment variables/secrets are set
7. **Staging nginx errors** → SSH to EC2, run `sudo nginx -t`, check `/etc/nginx/conf.d/*.conf`
