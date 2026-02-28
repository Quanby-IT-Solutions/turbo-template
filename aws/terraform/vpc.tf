# We use the official AWS VPC module for best-practice networking
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-vpc-${var.environment}"
  cidr = var.vpc_cidr

  # Use the first two availability zones in the region
  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = [cidrsubnet(var.vpc_cidr, 8, 1), cidrsubnet(var.vpc_cidr, 8, 2)]
  public_subnets  = [cidrsubnet(var.vpc_cidr, 8, 101), cidrsubnet(var.vpc_cidr, 8, 102)]

  # Enable NAT Gateways for ECS Tasks in private subnets to reach the internet (e.g., pulling Docker images)
  enable_nat_gateway     = true
  single_nat_gateway     = true  # Set to false for high-availability in pure production
  one_nat_gateway_per_az = false

  enable_dns_hostnames = true
  enable_dns_support   = true
}
