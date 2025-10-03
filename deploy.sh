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

# Create .env file if it doesn't exist or prompt for missing values
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
else
    echo "📝 Found existing .env file, checking for missing values..."
fi

# Function to prompt for environment variable if not set
prompt_env_var() {
    local var_name=$1
    local prompt_text=$2
    local default_value=$3
    local is_secret=${4:-false}
    
    if ! grep -q "^${var_name}=" .env || grep -q "^${var_name}=your-" .env || grep -q "^${var_name}=$" .env; then
        echo ""
        if [ "$is_secret" = "true" ]; then
            echo -n "🔐 $prompt_text: "
            read -s value
            echo ""
        else
            echo -n "📝 $prompt_text"
            if [ -n "$default_value" ]; then
                echo -n " [$default_value]"
            fi
            echo -n ": "
            read value
            
            if [ -z "$value" ] && [ -n "$default_value" ]; then
                value="$default_value"
            fi
        fi
        
        if [ -n "$value" ]; then
            if grep -q "^${var_name}=" .env; then
                sed -i "s|^${var_name}=.*|${var_name}=${value}|" .env
            else
                echo "${var_name}=${value}" >> .env
            fi
        fi
    fi
}

# Update domain in .env
sed -i "s/sway.re/$DOMAIN/g" .env

echo ""
echo "🔧 Setting up environment variables..."
echo "⚠️  The following are REQUIRED for the timers application to work:"

# Generate database password if not set or empty
if grep -q "your_secure_password_here" .env || ! grep -q "^POSTGRES_PASSWORD=." .env; then
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    if grep -q "^POSTGRES_PASSWORD=" .env; then
        sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
    else
        echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> .env
    fi
    echo "✅ Generated secure database password: $POSTGRES_PASSWORD"
    echo "   (This password is saved in .env file)"
fi

# Prompt for required variables
prompt_env_var "LETSENCRYPT_EMAIL" "Email for SSL certificates (Let's Encrypt)" "admin@$DOMAIN"

# NextAuth configuration
echo ""
echo "🔐 NextAuth Configuration (required for user authentication):"
prompt_env_var "NEXTAUTH_SECRET" "NextAuth secret key (will generate if empty)"
prompt_env_var "NEXTAUTH_URL" "NextAuth URL" "https://timers.$DOMAIN"

# Ensure NEXTAUTH_URL matches the domain being deployed
if grep -q "timers.sway.re" .env && [ "$DOMAIN" != "sway.re" ]; then
    sed -i "s|timers.sway.re|timers.$DOMAIN|g" .env
    echo "✅ Updated NextAuth URL to match domain: timers.$DOMAIN"
fi

# Generate NextAuth secret if not provided
if grep -q "your-nextauth-secret-key-here" .env || grep -q "^NEXTAUTH_SECRET=$" .env; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    sed -i "s|your-nextauth-secret-key-here|$NEXTAUTH_SECRET|" .env
    sed -i "s|^NEXTAUTH_SECRET=$|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|" .env
    echo "✅ Generated NextAuth secret key"
fi

# EVE Online SSO configuration
echo ""
echo "🚀 EVE Online SSO Configuration (REQUIRED):"
echo "   Get these from: https://developers.eveonline.com/applications"
echo "   Create a new application with callback URL: https://timers.$DOMAIN/api/auth/callback/eve-online"
prompt_env_var "EVE_CLIENT_ID" "EVE Online Client ID for Timers app" "" false
prompt_env_var "EVE_CLIENT_SECRET" "EVE Online Client Secret for Timers app" "" true

# EVE Online SSO configuration for Toast app
echo ""
echo "🍞 Toast App EVE Online SSO Configuration (REQUIRED):"
echo "   Create a separate application with callback URL: https://toast.$DOMAIN/api/auth/callback/eve-online"
prompt_env_var "EVE_CLIENT_ID_TOAST" "EVE Online Client ID for Toast app" "" false
prompt_env_var "EVE_CLIENT_SECRET_TOAST" "EVE Online Client Secret for Toast app" "" true

# Verify required variables are set
echo ""
echo "🔍 Verifying configuration..."

missing_vars=""
if grep -q "your-eve-client-id" .env; then
    missing_vars="$missing_vars EVE_CLIENT_ID"
fi
if grep -q "your-eve-client-secret" .env; then
    missing_vars="$missing_vars EVE_CLIENT_SECRET"
fi
if grep -q "your-eve-client-id" .env || [ -z "$(grep '^EVE_CLIENT_ID_TOAST=' .env 2>/dev/null)" ]; then
    missing_vars="$missing_vars EVE_CLIENT_ID_TOAST"
fi
if grep -q "your-eve-client-secret" .env || [ -z "$(grep '^EVE_CLIENT_SECRET_TOAST=' .env 2>/dev/null)" ]; then
    missing_vars="$missing_vars EVE_CLIENT_SECRET_TOAST"
fi

if [ -n "$missing_vars" ]; then
    echo ""
    echo "❌ Missing required environment variables:$missing_vars"
    echo "   Both applications will not work without EVE Online SSO credentials."
    echo "   You can add them later by editing the .env file and restarting with:"
    echo "   docker-compose restart"
    echo ""
    echo -n "Continue with deployment anyway? (y/N): "
    read continue_deploy
    if [ "$continue_deploy" != "y" ] && [ "$continue_deploy" != "Y" ]; then
        echo "❌ Deployment cancelled. Please configure EVE Online SSO and run again."
        exit 1
    fi
else
    echo "✅ All required variables are configured"
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

# Wait for database to be ready with health checks
echo "⏳ Waiting for database to be ready..."
timeout=60
counter=0
until docker-compose exec -T postgres pg_isready -U sway -d sway_timers >/dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -gt $timeout ]; then
        echo "❌ Database failed to start within ${timeout}s"
        docker-compose logs postgres
        exit 1
    fi
    echo "Waiting for database... ($counter/${timeout}s)"
    sleep 1
done
echo "✅ Database is ready"

# Run database migrations for timers app
echo "🗄️ Running database migrations for timers app..."
if docker-compose exec -T timers npm run db:generate; then
    echo "✅ Timers Prisma client generated successfully"
else
    echo "❌ Failed to generate Timers Prisma client"
    docker-compose logs timers
    exit 1
fi

if docker-compose exec -T timers npm run db:migrate; then
    echo "✅ Timers database migrations completed successfully"
else
    echo "❌ Timers database migrations failed"
    docker-compose logs timers
    exit 1
fi

# Run database migrations for toast app
echo "🗄️ Running database migrations for toast app..."
if docker-compose exec -T toast npm run db:generate; then
    echo "✅ Toast Prisma client generated successfully"
else
    echo "❌ Failed to generate Toast Prisma client"
    docker-compose logs toast
    exit 1
fi

if docker-compose exec -T toast npm run db:migrate; then
    echo "✅ Toast database migrations completed successfully"
else
    echo "❌ Toast database migrations failed"
    docker-compose logs toast
    exit 1
fi

# Wait for services to be fully ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Test deployment
echo "🧪 Testing deployment..."
if curl -f http://localhost/health >/dev/null 2>&1; then
    echo "✅ Main health check passed"
else
    echo "⚠️ Main health check failed"
fi

# Test timers subdomain (if running locally with hosts file setup)
if curl -f -H "Host: timers.$DOMAIN" http://localhost/api/health >/dev/null 2>&1; then
    echo "✅ Timers health check passed"
else
    echo "⚠️ Timers health check failed - checking container logs"
    docker-compose logs --tail=20 timers
fi

# Test toast subdomain (if running locally with hosts file setup)
if curl -f -H "Host: toast.$DOMAIN" http://localhost/api/health >/dev/null 2>&1; then
    echo "✅ Toast health check passed"
else
    echo "⚠️ Toast health check failed - checking container logs"
    docker-compose logs --tail=20 toast
fi

# Show container status
echo "📊 Container status:"
docker-compose ps

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your applications should be accessible at:"
echo "   - Main site: http://$DOMAIN"
echo "   - Timers: http://timers.$DOMAIN"
echo "   - Toast: http://toast.$DOMAIN"
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