terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # For a production setup, you should define a backend block here to store your state in S3.
  # backend "s3" {
  #   bucket = "my-terraform-state-bucket"
  #   key    = "turbo-template/terraform.tfstate"
  #   region = "asia-northeast1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
