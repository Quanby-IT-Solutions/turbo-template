# Web Repository
# Note: Name exactly matches what GitHub Actions expects in `ECR_REPOSITORY_WEB`
# e.g. turbo-template-web-staging
resource "aws_ecr_repository" "web" {
  name                 = "${var.project_name}-web-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Backend Repository
# Note: Name exactly matches what GitHub Actions expects in `ECR_REPOSITORY_BACKEND`
# e.g. turbo-template-backend-staging
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECR Lifecycle Policy (Keep last 10 images)
resource "aws_ecr_lifecycle_policy" "web_policy" {
  repository = aws_ecr_repository.web.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1,
      description  = "Keep last 30 images",
      selection = {
        tagStatus   = "any",
        countType   = "imageCountMoreThan",
        countNumber = 30
      },
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "backend_policy" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1,
      description  = "Keep last 30 images",
      selection = {
        tagStatus   = "any",
        countType   = "imageCountMoreThan",
        countNumber = 30
      },
      action = {
        type = "expire"
      }
    }]
  })
}
