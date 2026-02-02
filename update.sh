#!/bin/bash

# Low-downtime update script for Sway multi-project hosting
# Usage: ./update.sh [service_name]
# Example: ./update.sh timers (updates only timers service)
# Example: ./update.sh (updates all services)
#
# Environment variables:
#   BUILD_CPU_LIMIT - Max CPU cores for builds (default: 50% of available cores)
#   Example: BUILD_CPU_LIMIT=1 ./update.sh timers

set -e

# Parse arguments
SERVICE_NAME=${1:-""}

# CPU limit for builds (default: 50% of available cores, minimum 1)
TOTAL_CPUS=$(nproc 2>/dev/null || echo 2)
DEFAULT_CPU_LIMIT=$(echo "scale=1; $TOTAL_CPUS * 0.5" | bc 2>/dev/null || echo 1)
BUILD_CPU_LIMIT=${BUILD_CPU_LIMIT:-$DEFAULT_CPU_LIMIT}

echo "🔄 Starting low-downtime update for Sway hosting platform..."
echo "   Build CPU limit: $BUILD_CPU_LIMIT cores (set BUILD_CPU_LIMIT to override)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose not found. Please install Docker Compose."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    log_error ".env file not found. Please run deploy.sh first to set up the environment."
    exit 1
fi

# Function to wait for service health check
wait_for_health() {
    local service_name=$1
    local max_attempts=${2:-30}
    local attempt=0
    
    log_info "Waiting for $service_name to become healthy..."
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps --services --filter "status=running" | grep -q "^$service_name$" && \
           docker-compose exec -T $service_name curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            log_success "$service_name is healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo "Attempt $attempt/$max_attempts - waiting for $service_name health check..."
        sleep 2
    done
    
    log_error "$service_name failed health check after $max_attempts attempts"
    return 1
}

# Function to perform rolling update for a service
rolling_update() {
    local service_name=$1
    
    log_info "Performing rolling update for $service_name..."
    
    # Check if service exists
    if ! docker-compose ps --services | grep -q "^$service_name$"; then
        log_error "Service '$service_name' not found in docker-compose.yml"
        return 1
    fi
    
    # Build new image first (without disrupting running service)
    # Use CPU limits to prevent system freeze during build
    log_info "Building new image for $service_name (CPU limit: $BUILD_CPU_LIMIT cores)..."

    # Get build context path for the service
    local build_context="./projects/$service_name"
    local dockerfile="$build_context/Dockerfile"
    local image_name="sway-$service_name"

    if [ -f "$dockerfile" ]; then
        # Use docker build directly with CPU limits
        if ! docker build --cpus="$BUILD_CPU_LIMIT" -t "$image_name" "$build_context"; then
            log_error "Failed to build new image for $service_name"
            return 1
        fi
    else
        # Fallback to docker-compose build if custom Dockerfile location
        log_warning "Using docker-compose build (no CPU limit) - Dockerfile not at expected location"
        if ! docker-compose build $service_name; then
            log_error "Failed to build new image for $service_name"
            return 1
        fi
    fi
    
    # Get current container ID
    CURRENT_CONTAINER=$(docker-compose ps -q $service_name)
    
    if [ -n "$CURRENT_CONTAINER" ]; then
        log_info "Current $service_name container: $CURRENT_CONTAINER"
        
        # Scale up to 2 instances temporarily (if nginx load balancing is configured)
        # For now, we'll do a careful restart with health checks
        
        # Create new container
        log_info "Creating new $service_name container..."
        docker-compose up -d --no-deps --scale $service_name=2 $service_name || {
            log_warning "Could not scale service, falling back to restart method"
            docker-compose up -d --no-deps $service_name
        }
        
        # Wait a moment for the new container to start
        sleep 5
        
        # Wait for new instance to be healthy
        if wait_for_health $service_name 30; then
            # Scale back down to 1 instance (removes old container)
            log_info "Scaling back to single instance..."
            docker-compose up -d --no-deps --scale $service_name=1 $service_name
            
            log_success "Rolling update completed for $service_name"
        else
            log_error "New $service_name instance failed health check, rolling back..."
            # Remove the new unhealthy container
            docker-compose up -d --no-deps --scale $service_name=1 $service_name
            return 1
        fi
    else
        log_info "No existing container found, starting $service_name..."
        docker-compose up -d --no-deps $service_name
        wait_for_health $service_name
    fi
}

# Function to update database (if needed)
update_database() {
    log_info "Checking for database updates..."
    
    # Run migrations if timers service is being updated
    if [ "$SERVICE_NAME" = "timers" ] || [ -z "$SERVICE_NAME" ]; then
        log_info "Running database migrations for timers..."

        if docker-compose exec -T timers npm run db:generate >/dev/null 2>&1; then
            log_success "Timers Prisma client generated"
        else
            log_warning "Failed to generate Timers Prisma client"
        fi

        if docker-compose exec -T timers npm run db:migrate >/dev/null 2>&1; then
            log_success "Timers database migrations completed"
        else
            log_warning "Timers database migrations failed or no new migrations"
        fi
    fi

    # Run migrations if toast service is being updated
    if [ "$SERVICE_NAME" = "toast" ] || [ -z "$SERVICE_NAME" ]; then
        log_info "Running database migrations for toast..."

        if docker-compose exec -T toast npm run db:generate >/dev/null 2>&1; then
            log_success "Toast Prisma client generated"
        else
            log_warning "Failed to generate Toast Prisma client"
        fi

        if docker-compose exec -T toast npm run db:migrate >/dev/null 2>&1; then
            log_success "Toast database migrations completed"
        else
            log_warning "Toast database migrations failed or no new migrations"
        fi
    fi
}

# Function to cleanup old images
cleanup_old_images() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f >/dev/null 2>&1 || true
    log_success "Cleanup completed"
}

# Main execution
echo ""
if [ -n "$SERVICE_NAME" ]; then
    log_info "Updating service: $SERVICE_NAME"
    
    case $SERVICE_NAME in
        "timers")
            rolling_update $SERVICE_NAME
            update_database
            ;;
        "toast")
            rolling_update $SERVICE_NAME
            update_database
            ;;
        "nginx")
            # Nginx needs special handling - reload config instead of restart
            log_info "Reloading nginx configuration..."
            if docker-compose exec nginx nginx -t; then
                docker-compose exec nginx nginx -s reload
                log_success "Nginx configuration reloaded"
            else
                log_error "Nginx configuration test failed"
                exit 1
            fi
            ;;
        "postgres")
            log_warning "Database updates require careful planning. Consider using pg_dump/restore for major updates."
            log_info "For minor updates, you can run: docker-compose pull postgres && docker-compose up -d postgres"
            ;;
        *)
            rolling_update $SERVICE_NAME
            ;;
    esac
else
    log_info "Updating all services..."
    
    # Update application services first
    for service in timers toast; do
        if docker-compose ps --services | grep -q "^$service$"; then
            rolling_update $service
        fi
    done
    
    # Update database
    update_database
    
    # Update nginx (reload config)
    if docker-compose ps --services | grep -q "^nginx$"; then
        log_info "Reloading nginx configuration..."
        if docker-compose exec nginx nginx -t; then
            docker-compose exec nginx nginx -s reload
            log_success "Nginx configuration reloaded"
        else
            log_warning "Nginx configuration test failed, skipping reload"
        fi
    fi
fi

# Cleanup
cleanup_old_images

# Final health checks
echo ""
log_info "Performing final health checks..."

# Check all services are running
docker-compose ps

# Test main endpoint
if curl -f http://localhost/health >/dev/null 2>&1; then
    log_success "Main health check passed"
else
    log_warning "Main health check failed"
fi

# Test timers endpoint
if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    log_success "Timers health check passed"
elif curl -f -H "Host: timers.sway.re" http://localhost/api/health >/dev/null 2>&1; then
    log_success "Timers health check passed (via nginx proxy)"
else
    log_warning "Timers health check failed"
fi

# Test toast endpoint
if curl -f http://localhost:3002/api/health >/dev/null 2>&1; then
    log_success "Toast health check passed"
elif curl -f -H "Host: toast.sway.re" http://localhost/api/health >/dev/null 2>&1; then
    log_success "Toast health check passed (via nginx proxy)"
else
    log_warning "Toast health check failed"
fi

echo ""
log_success "Update completed successfully!"
echo ""
log_info "Usage tips:"
echo "  - Update specific service: ./update.sh timers (or ./update.sh toast)"
echo "  - Update all services: ./update.sh"
echo "  - Check logs: docker-compose logs -f [service_name]"
echo "  - Check status: docker-compose ps"