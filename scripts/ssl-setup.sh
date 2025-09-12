#!/bin/bash

# SSL setup script for production deployment
# Usage: ./scripts/ssl-setup.sh your-domain.com

set -e

DOMAIN=${1:-sway.re}
EMAIL=${2:-$(grep LETSENCRYPT_EMAIL .env 2>/dev/null | cut -d'=' -f2 || echo "admin@$DOMAIN")}

echo "🔒 Setting up SSL certificates for $DOMAIN..."
echo "📧 Using email: $EMAIL"

# Install certbot
echo "📦 Installing certbot..."
sudo apt-get update
sudo apt-get install -y certbot

# Stop nginx temporarily
echo "🛑 Stopping nginx container..."
docker-compose stop nginx

# Obtain certificates
echo "🔑 Obtaining SSL certificates..."
sudo certbot certonly --standalone \
    -d "$DOMAIN" \
    -d "timers.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

# Copy certificates to nginx directory
echo "📁 Copying certificates..."
sudo mkdir -p nginx/ssl
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "nginx/ssl/$DOMAIN.crt"
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "nginx/ssl/$DOMAIN.key"
sudo chown $USER:$USER nginx/ssl/*

# Update .env to enable SSL
echo "⚙️ Enabling SSL in configuration..."
sed -i 's/SSL_ENABLED=false/SSL_ENABLED=true/' .env

# Restart containers
echo "🔄 Restarting containers..."
docker-compose up -d

# Test SSL
echo "🧪 Testing SSL setup..."
sleep 5
if curl -f "https://$DOMAIN/health" >/dev/null 2>&1; then
    echo "✅ SSL setup successful!"
    echo "🌐 Your sites are now available at:"
    echo "   - https://$DOMAIN"
    echo "   - https://timers.$DOMAIN"
else
    echo "⚠️ SSL test failed - checking logs..."
    docker-compose logs nginx --tail=20
fi

echo ""
echo "🔄 To renew certificates automatically, add to crontab:"
echo "0 12 * * * /usr/bin/certbot renew --quiet"