#!/bin/bash

# Deployment script for DigitalOcean droplet
# Usage: ./deploy.sh [production|staging] [domain]
# Example: ./deploy.sh production sway.re

set -e

# Parse arguments
ENVIRONMENT=${1:-production}
DOMAIN=${2:-sway.re}

echo "🚀 Starting deployment of Sway multi-project hosting..."
echo "Environment: $ENVIRONMENT"
echo "Domain: $DOMAIN"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    sed -i "s/sway.re/$DOMAIN/g" .env
fi

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "🐙 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create necessary directories
echo "📁 Creating SSL directory..."
sudo mkdir -p nginx/ssl

# Stop existing containers if running
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start containers
echo "🏗️ Building and starting containers..."
docker-compose up --build -d

# Wait for containers to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Test deployment
echo "🧪 Testing deployment..."
if curl -f http://localhost/health >/dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "⚠️ Health check failed - checking container logs"
    docker-compose logs --tail=20
fi

# Show container status
echo "📊 Container status:"
docker-compose ps

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your applications should be accessible at:"
echo "   - Main site: http://$DOMAIN"
echo "   - Timers: http://timers.$DOMAIN"
echo ""
echo "💻 Server IP: $(curl -s ifconfig.me || echo 'Unable to detect')"
echo ""
echo "🔒 To enable HTTPS:"
echo "   1. Obtain SSL certificates (using Let's Encrypt/Certbot recommended)"
echo "   2. Place certificates in nginx/ssl/ directory"
echo "   3. Uncomment HTTPS server blocks in nginx/sites/default.conf"
echo "   4. Run: docker-compose restart nginx"
echo ""
echo "📝 To add new projects:"
echo "   1. Create a new directory in projects/"
echo "   2. Add the service to docker-compose.yml"
echo "   3. Add subdomain configuration to nginx/sites/default.conf"
echo "   4. Run: docker-compose up --build -d"