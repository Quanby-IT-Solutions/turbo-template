# alb-sg: Allows HTTP/HTTPS from the public internet
resource "aws_security_group" "alb_sg" {
  name        = "${var.project_name}-alb-sg-${var.environment}"
  description = "Security Group for Application Load Balancer"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# web-sg: Allows port 3001 ONLY from the ALB
resource "aws_security_group" "web_sg" {
  name        = "${var.project_name}-web-sg-${var.environment}"
  description = "Security Group for Web ECS Tasks"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "Port 3001 from ALB"
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# backend-sg: Allows port 3000 ONLY from the ALB (and optionally web)
resource "aws_security_group" "backend_sg" {
  name        = "${var.project_name}-backend-sg-${var.environment}"
  description = "Security Group for Backend ECS Tasks"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "Port 3000 from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
