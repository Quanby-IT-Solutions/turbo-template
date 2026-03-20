---
name: aws-infrastructure
description: AWS infrastructure patterns for this monorepo using Terraform and ECS Fargate. Use when deploying to AWS, configuring ECS services, setting up ALB, creating ECR repositories, managing CloudWatch alarms, or writing Terraform. Triggers on tasks involving AWS, cloud deployment, infrastructure-as-code, load balancing, container orchestration, or monitoring setup.
frameworks:
  - terraform
  - aws-ecs
  - aws-ecr
  - aws-alb
  - cloudwatch
languages:
  - hcl
  - bash
  - json
category: infrastructure
updated: 2025-07-12
---

# AWS Infrastructure

## Quick Reference

| Component        | Resource                           | Config Location             |
| ---------------- | ---------------------------------- | --------------------------- |
| VPC              | 10.0.0.0/16, 2 AZs                 | `aws/terraform/vpc.tf`      |
| ECS Cluster      | Fargate, Container Insights        | `aws/terraform/ecs.tf`      |
| ALB              | Internet-facing, path routing      | `aws/terraform/alb.tf`      |
| ECR              | Scan-on-push, 30-image retention   | `aws/terraform/ecr.tf`      |
| IAM              | Task execution + task roles        | `aws/terraform/iam.tf`      |
| Security         | ALB → ECS-only SGs                 | `aws/terraform/security.tf` |
| Task Definitions | Web (512/1024), Backend (512/1024) | `aws/ecs/*.json`            |
| CloudWatch       | CPU, memory, 5xx, unhealthy tasks  | `aws/monitoring/`           |

## Architecture Overview

```
Internet → ALB (port 80/443)
             ├── / → Web Target Group (port 3001)
             └── /api/* → Backend Target Group (port 3000)
                    ↓
              ECS Fargate (private subnets)
              ├── Web Service (1 task, 512 CPU, 1024 MB)
              └── Backend Service (1 task, 512 CPU, 1024 MB)
                    ↓
              NAT Gateway → Internet (outbound only)
```

## Terraform Configuration

### Variables (`aws/terraform/variables.tf`)

```hcl
variable "project_name" {
  default = "turbo-template"
}
variable "aws_region" {
  default = "ap-southeast-1"
}
variable "environment" {
  default     = "staging"
  description = "staging or production"
}
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}
```

### VPC Layout

- **Private subnets**: 10.0.1.0/24, 10.0.2.0/24 (ECS tasks run here)
- **Public subnets**: 10.0.101.0/24, 10.0.102.0/24 (ALB lives here)
- **NAT Gateway**: Single (cost-optimized; upgrade to per-AZ for HA)
- **DNS**: Enabled for hostname resolution

### ALB Routing Rules

```hcl
# Default: all traffic → web
resource "aws_lb_listener" "http" {
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# Path rule: /api/* → backend
resource "aws_lb_listener_rule" "api" {
  condition {
    path_pattern { values = ["/api/*"] }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}
```

### Security Groups

```
ALB SG: Allow 80, 443 from 0.0.0.0/0 (internet)
Web SG: Allow 3001 from ALB SG only
Backend SG: Allow 3000 from ALB SG only
All SGs: Allow all egress
```

### ECR Lifecycle Policy

```json
{
	"rules": [
		{
			"rulePriority": 1,
			"selection": {
				"tagStatus": "any",
				"countType": "imageCountMoreThan",
				"countNumber": 30
			},
			"action": { "type": "expire" }
		}
	]
}
```

Keeps last 30 images per repository. Scan-on-push enabled for vulnerability detection.

## ECS Task Definitions

### Production Web Task (`aws/ecs/task-definition-web.json`)

```json
{
	"family": "{PROJECT_NAME}-web-production",
	"cpu": "512",
	"memory": "1024",
	"networkMode": "awsvpc",
	"requiresCompatibilities": ["FARGATE"],
	"containerDefinitions": [
		{
			"name": "web",
			"image": "{AWS_ACCOUNT_ID}.dkr.ecr.{AWS_REGION}.amazonaws.com/{PROJECT_NAME}-web-production:{IMAGE_TAG:-latest}",
			"portMappings": [{ "containerPort": 3001 }],
			"environment": [
				{ "name": "NODE_ENV", "value": "production" },
				{ "name": "NEXT_PUBLIC_APP_URL", "value": "${NEXT_PUBLIC_APP_URL}" },
				{ "name": "NEXT_PUBLIC_API_BASE_URL", "value": "${NEXT_PUBLIC_API_BASE_URL}" },
				{ "name": "NEXT_PUBLIC_API_VERSION", "value": "${NEXT_PUBLIC_API_VERSION}" }
			],
			"healthCheck": {
				"command": [
					"CMD-SHELL",
					"wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1"
				],
				"interval": 30,
				"timeout": 10,
				"retries": 3,
				"startPeriod": 40
			},
			"logConfiguration": {
				"logDriver": "awslogs",
				"options": {
					"awslogs-group": "/ecs/{PROJECT_NAME}-web-production",
					"awslogs-region": "{AWS_REGION}",
					"awslogs-stream-prefix": "ecs"
				}
			}
		}
	]
}
```

### Production Backend Task (`aws/ecs/task-definition-backend.json`)

```json
{
	"family": "{PROJECT_NAME}-backend-production",
	"cpu": "512",
	"memory": "1024",
	"containerDefinitions": [
		{
			"name": "backend",
			"portMappings": [{ "containerPort": 3000 }],
			"environment": [
				{ "name": "NODE_ENV", "value": "production" },
				{ "name": "PORT", "value": "3000" },
				{ "name": "CORS_ORIGINS", "value": "${CORS_ORIGINS}" },
				{ "name": "DATABASE_URL", "value": "${DATABASE_URL}" },
				{ "name": "BETTER_AUTH_SECRET", "value": "${BETTER_AUTH_SECRET}" },
				{ "name": "BETTER_AUTH_TRUSTED_ORIGINS", "value": "${BETTER_AUTH_TRUSTED_ORIGINS}" },
				{ "name": "GOOGLE_CLIENT_ID", "value": "${GOOGLE_CLIENT_ID}" },
				{ "name": "GOOGLE_CLIENT_SECRET", "value": "${GOOGLE_CLIENT_SECRET}" }
			],
			"healthCheck": {
				"command": [
					"CMD-SHELL",
					"wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1"
				]
			}
		}
	]
}
```

### Staging vs Production

| Setting            | Staging    | Production          |
| ------------------ | ---------- | ------------------- |
| CPU                | 256        | 512                 |
| Memory             | 512 MB     | 1024 MB             |
| Desired count      | 1          | 1 (scale as needed) |
| Task family suffix | `-staging` | `-production`       |

## CloudWatch Monitoring

### Alarm Definitions (`aws/monitoring/cloudwatch-alarms.json`)

| Alarm                   | Metric                    | Threshold | Period | Evaluation    |
| ----------------------- | ------------------------- | --------- | ------ | ------------- |
| web-cpu-high            | CPUUtilization            | ≥ 80%     | 5 min  | 2 consecutive |
| web-memory-high         | MemoryUtilization         | ≥ 80%     | 5 min  | 2 consecutive |
| backend-cpu-high        | CPUUtilization            | ≥ 80%     | 5 min  | 2 consecutive |
| backend-memory-high     | MemoryUtilization         | ≥ 80%     | 5 min  | 2 consecutive |
| web-unhealthy-tasks     | UnhealthyTaskCount        | > 0       | 1 min  | 1 period      |
| backend-unhealthy-tasks | UnhealthyTaskCount        | > 0       | 1 min  | 1 period      |
| alb-5xx-errors          | HTTPCode_Target_5XX_Count | > 50      | 1 min  | 5 consecutive |
| alb-4xx-errors          | HTTPCode_Target_4XX_Count | > 100     | 1 min  | 5 consecutive |

All alarms push to SNS topic `{PROJECT_NAME}-alerts` for email notifications.

### Setup Script (`aws/monitoring/create-alarms.sh`)

```bash
# Create SNS topic
aws sns create-topic --name turbo-template-alerts

# Create log groups
aws logs create-log-group --log-group-name /ecs/{PROJECT_NAME}-web
aws logs put-retention-policy --log-group-name /ecs/{PROJECT_NAME}-web --retention-in-days 7

# Apply alarms from JSON
jq -c '.alarms[]' cloudwatch-alarms.json | while read alarm; do
  aws cloudwatch put-metric-alarm --cli-input-json "$alarm"
done
```

## Common Terraform Commands

```bash
cd aws/terraform

# Initialize
terraform init

# Plan changes
terraform plan -var="environment=staging"

# Apply
terraform apply -var="environment=staging"

# Destroy (careful!)
terraform destroy -var="environment=staging"

# Import existing resource
terraform import aws_ecs_cluster.main arn:aws:ecs:...
```

## GitHub Environment Variables

### Per Environment (staging/production)

**Variables:**

```
AWS_REGION, PROJECT_NAME, AWS_ACCOUNT_ID
ECR_REPOSITORY_WEB, ECR_REPOSITORY_BACKEND
ECS_CLUSTER, ECS_SERVICE_WEB, ECS_SERVICE_BACKEND
NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_API_VERSION
```

**Secrets:**

```
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
DATABASE_URL, CORS_ORIGINS
BETTER_AUTH_SECRET, BETTER_AUTH_TRUSTED_ORIGINS
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

## Troubleshooting Checklist

1. **Service not starting** → Check CloudWatch logs: `/ecs/{PROJECT_NAME}-{service}`
2. **Health check failing** → Verify endpoint responds: `/api/v1/health` (backend), `/` (web)
3. **Image pull errors** → Check ECR URI matches task definition image
4. **Permission denied** → Verify task execution role has ECR pull + CloudWatch policies
5. **503 errors** → Check target group health, security group allows ALB → ECS
6. **Env vars missing** → Verify GitHub environment variables/secrets are set
