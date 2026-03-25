#!/bin/bash
# ==========================================================
# EC2 Instance Setup Script for Staging
# ==========================================================
# Run this ONCE on a fresh EC2 instance (Amazon Linux 2023 / Ubuntu 22.04+)
# to install Docker, Docker Compose, Nginx, Certbot, and AWS CLI.
#
# Architecture:
#   - Nginx on HOST for subdomain routing + SSL termination
#   - Docker containers for web + backend apps only
#   - Certbot on HOST for Let's Encrypt SSL certificates
#
# Usage:
#   chmod +x setup-ec2.sh
#   sudo ./setup-ec2.sh
# ==========================================================

set -euo pipefail

echo "=========================================="
echo "  EC2 Staging Setup"
echo "=========================================="

# ──────────────────────────────────────────────
# Detect OS
# ──────────────────────────────────────────────
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Cannot detect OS"
    exit 1
fi

echo "Detected OS: $OS"

# ──────────────────────────────────────────────
# Step 1: Install Docker
# ──────────────────────────────────────────────
echo ""
echo "Step 1: Installing Docker..."

if [ "$OS" = "amzn" ]; then
    dnf update -y
    dnf install -y docker
    systemctl start docker
    systemctl enable docker
elif [ "$OS" = "ubuntu" ]; then
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
    echo "❌ Unsupported OS: $OS. Please install Docker manually."
    exit 1
fi

# Add ec2-user or ubuntu to docker group
if id "ec2-user" &>/dev/null; then
    usermod -aG docker ec2-user
elif id "ubuntu" &>/dev/null; then
    usermod -aG docker ubuntu
fi

echo "✓ Docker installed"

# ──────────────────────────────────────────────
# Step 2: Install Docker Compose (if not bundled)
# ──────────────────────────────────────────────
echo ""
echo "Step 2: Installing Docker Compose..."

if ! command -v docker compose &>/dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
    curl -SL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    echo "✓ Docker Compose installed: ${DOCKER_COMPOSE_VERSION}"
else
    echo "✓ Docker Compose already available"
fi

# ──────────────────────────────────────────────
# Step 3: Install AWS CLI (if not present)
# ──────────────────────────────────────────────
echo ""
echo "Step 3: Installing AWS CLI..."

if ! command -v aws &>/dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    cd /tmp && unzip -qo awscliv2.zip && ./aws/install && cd -
    rm -rf /tmp/awscliv2.zip /tmp/aws
    echo "✓ AWS CLI installed"
else
    echo "✓ AWS CLI already installed"
fi

# ──────────────────────────────────────────────
# Step 4: Install Nginx
# ──────────────────────────────────────────────
echo ""
echo "Step 4: Installing Nginx..."

if [ "$OS" = "amzn" ]; then
    dnf install -y nginx
elif [ "$OS" = "ubuntu" ]; then
    apt-get install -y nginx
fi

# Remove default site configs
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true

systemctl start nginx
systemctl enable nginx

echo "✓ Nginx installed and running"

# ──────────────────────────────────────────────
# Step 5: Install Certbot
# ──────────────────────────────────────────────
echo ""
echo "Step 5: Installing Certbot..."

if [ "$OS" = "amzn" ]; then
    # Amazon Linux 2023: install via pip
    dnf install -y python3-pip
    pip3 install certbot
elif [ "$OS" = "ubuntu" ]; then
    apt-get install -y certbot
fi

# Create certbot webroot directory
mkdir -p /var/www/certbot

echo "✓ Certbot installed"

# ──────────────────────────────────────────────
# Step 6: Create app directory
# ──────────────────────────────────────────────
echo ""
echo "Step 6: Creating app directory..."

APP_DIR="/opt/staging"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/nginx

echo "✓ App directory created: $APP_DIR"

# ──────────────────────────────────────────────
# Step 7: Create helper scripts
# ──────────────────────────────────────────────
echo ""
echo "Step 7: Creating helper scripts..."

# ECR login helper
cat > $APP_DIR/ecr-login.sh << 'SCRIPT'
#!/bin/bash
# Login to ECR - run before pulling images
# Usage: ./ecr-login.sh <aws-region> <aws-account-id>
set -euo pipefail
AWS_REGION="${1:-ap-southeast-1}"
AWS_ACCOUNT_ID="${2}"

if [ -z "$AWS_ACCOUNT_ID" ]; then
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
fi

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
echo "✓ Logged in to ECR: $ECR_REGISTRY"
SCRIPT
chmod +x $APP_DIR/ecr-login.sh

# Quick deploy helper
cat > $APP_DIR/deploy.sh << 'SCRIPT'
#!/bin/bash
# Quick deploy script - pulls latest images and restarts
# Usage: ./deploy.sh
set -euo pipefail
cd /opt/staging

echo "Pulling latest images..."
docker compose -f docker-compose.staging.yml pull

echo "Restarting services..."
docker compose -f docker-compose.staging.yml up -d --remove-orphans

echo "Cleaning up old images..."
docker image prune -f

echo "✓ Deploy complete"
docker compose -f docker-compose.staging.yml ps
SCRIPT
chmod +x $APP_DIR/deploy.sh

echo "✓ Helper scripts created"

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Installed: Docker, Docker Compose, AWS CLI, Nginx, Certbot"
echo ""
echo "Next steps:"
echo ""
echo "  1. Attach an IAM Role to this EC2 instance:"
echo "     - Role policy: AmazonEC2ContainerRegistryReadOnly"
echo "     - Or run: aws configure"
echo ""
echo "  2. Point your DNS records to this instance's IP:"
echo "     - staging.yourdomain.com     → <EC2_PUBLIC_IP>"
echo "     - api.staging.yourdomain.com → <EC2_PUBLIC_IP>"
echo ""
echo "  3. Push to the 'staging' branch to trigger auto-deployment."
echo "     (GitHub Actions will handle everything else)"
echo ""
echo "  4. After the first deployment, setup SSL:"
echo "     sudo /opt/staging/init-ssl.sh admin@example.com \\"
echo "       staging.yourdomain.com api.staging.yourdomain.com"
echo ""
echo "  5. Push again (or re-run workflow) — HTTPS will be enabled"
echo "     automatically on the next deploy."
echo ""
echo "=========================================="
