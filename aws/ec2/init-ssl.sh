#!/bin/bash
# ==========================================================
# SSL Certificate Setup (Run ONCE after first deployment)
# ==========================================================
# Gets SSL certificates via Let's Encrypt (certbot) using the
# webroot method. Nginx must already be running with HTTP configs.
#
# Usage:
#   sudo ./init-ssl.sh <email> <web-domain> <api-domain>
#
# Example:
#   sudo ./init-ssl.sh admin@example.com staging.example.com api.staging.example.com
#
# After running this, trigger a new deployment (or run the
# update-nginx section below) to switch to HTTPS configs.
# ==========================================================

set -euo pipefail

EMAIL="${1:?Usage: $0 <email> <web-domain> <api-domain>}"
DOMAIN_WEB="${2:?Usage: $0 <email> <web-domain> <api-domain>}"
DOMAIN_API="${3:?Usage: $0 <email> <web-domain> <api-domain>}"

echo "=========================================="
echo "  SSL Certificate Setup"
echo "=========================================="
echo ""
echo "Email:      $EMAIL"
echo "Web domain: $DOMAIN_WEB"
echo "API domain: $DOMAIN_API"
echo ""

# ──────────────────────────────────────────────
# Ensure certbot webroot exists
# ──────────────────────────────────────────────
mkdir -p /var/www/certbot

# ──────────────────────────────────────────────
# Get certificate for web subdomain
# ──────────────────────────────────────────────
echo "Getting SSL certificate for $DOMAIN_WEB..."
certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN_WEB" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

if [ -f "/etc/letsencrypt/live/$DOMAIN_WEB/fullchain.pem" ]; then
    echo "✓ SSL certificate obtained for $DOMAIN_WEB"
else
    echo "❌ Failed to get SSL certificate for $DOMAIN_WEB"
    exit 1
fi

# ──────────────────────────────────────────────
# Get certificate for API subdomain
# ──────────────────────────────────────────────
echo ""
echo "Getting SSL certificate for $DOMAIN_API..."
certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN_API" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

if [ -f "/etc/letsencrypt/live/$DOMAIN_API/fullchain.pem" ]; then
    echo "✓ SSL certificate obtained for $DOMAIN_API"
else
    echo "❌ Failed to get SSL certificate for $DOMAIN_API"
    exit 1
fi

# ──────────────────────────────────────────────
# Update Nginx configs to use SSL
# ──────────────────────────────────────────────
echo ""
echo "Updating Nginx configs to enable HTTPS..."

NGINX_DIR="/opt/staging/nginx"

if [ -f "$NGINX_DIR/web-ssl.conf" ]; then
    sed "s/__DOMAIN__/$DOMAIN_WEB/g" "$NGINX_DIR/web-ssl.conf" > /tmp/web.conf
    mv /tmp/web.conf /etc/nginx/conf.d/$DOMAIN_WEB.conf
    echo "✓ Web HTTPS config written"
else
    echo "⚠️  Template $NGINX_DIR/web-ssl.conf not found — skipping"
fi

if [ -f "$NGINX_DIR/api-ssl.conf" ]; then
    sed "s/__DOMAIN__/$DOMAIN_API/g" "$NGINX_DIR/api-ssl.conf" > /tmp/api.conf
    mv /tmp/api.conf /etc/nginx/conf.d/$DOMAIN_API.conf
    echo "✓ API HTTPS config written"
else
    echo "⚠️  Template $NGINX_DIR/api-ssl.conf not found — skipping"
fi

echo ""
echo "Testing Nginx config..."
nginx -t

echo "Reloading Nginx..."
systemctl reload nginx

# ──────────────────────────────────────────────
# Setup auto-renewal cron (if not already)
# ──────────────────────────────────────────────
echo ""
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --webroot -w /var/www/certbot --quiet && systemctl reload nginx") | crontab -
    echo "✓ Auto-renewal cron job added (daily at 3 AM)"
else
    echo "✓ Auto-renewal cron already configured"
fi

echo ""
echo "=========================================="
echo "  SSL Setup Complete!"
echo "=========================================="
echo ""
echo "Your sites are now available at:"
echo "  https://$DOMAIN_WEB"
echo "  https://$DOMAIN_API"
echo ""
echo "Certificates auto-renew via cron."
echo "=========================================="
