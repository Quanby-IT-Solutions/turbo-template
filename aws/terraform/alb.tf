# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = module.vpc.public_subnets
}

# Web Target Group
resource "aws_lb_target_group" "web" {
  name        = "${var.project_name}-tg-web-${var.environment}"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 10
    interval            = 30
    matcher             = "200"
  }
}

# Backend Target Group
resource "aws_lb_target_group" "backend" {
  name        = "${var.project_name}-tg-api-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/v1/health" # Aligning with your docs
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 10
    interval            = 30
    matcher             = "200"
  }
}

# Main ALB HTTP Listener (Port 80)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  # Default action: route to the Web Target Group
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# Listener Rule for /api/* routing to Backend Target Group
resource "aws_lb_listener_rule" "api_routing" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Outputs to give you the URLs after deployment!
output "alb_dns_name" {
  description = "The DNS name of the ALB. Point your custom domain CNAME at this!"
  value       = aws_lb.main.dns_name
}
