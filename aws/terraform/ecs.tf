# Create the ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Web Service (Bootstrap - Will be managed by GitHub Actions later)
resource "aws_ecs_service" "web" {
  name            = "${var.project_name}-web-${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  launch_type     = "FARGATE"
  desired_count   = 1 # Adjust based on needs

  # We use the generic execution role created in iam.tf
  # You will likely need to create a dummy task definition first or let GitHub Actions create it
  # Usually, for a fully automated setup from scratch, you'd deploy a "hello world" container here
  # first just so the service binds to the Target Group successfully before CI/CD takes over.
  # For simplicity, we define the networking here.
  
  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.web_sg.id]
    assign_public_ip = false # True if you place in public subnets, False for private subnets + NAT
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 3001
  }

  lifecycle {
    # Ignore changes to these because GitHub Actions will continually update them!
    ignore_changes = [task_definition, desired_count]
  }
}

# Backend Service (Bootstrap - Will be managed by GitHub Actions later)
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend-${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.backend_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}
