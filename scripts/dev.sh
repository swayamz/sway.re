#!/bin/bash

# Local development helper script
# Automatically sets up hosts entries and starts development environment

set -e

echo "🔧 Setting up local development environment..."

# Check if running on Linux/Mac (Windows users need manual hosts setup)
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🌐 Adding local domains to /etc/hosts..."
    
    # Remove existing entries
    sudo sed -i '/# Sway local development/d' /etc/hosts
    sudo sed -i '/timers.localhost/d' /etc/hosts
    
    # Add new entries
    echo "# Sway local development" | sudo tee -a /etc/hosts
    echo "127.0.0.1 timers.localhost" | sudo tee -a /etc/hosts
    
    echo "✅ Added timers.localhost to /etc/hosts"
fi

# Start development containers
echo "🚀 Starting development containers..."
docker-compose -f docker-compose.local.yml down 2>/dev/null || true
docker-compose -f docker-compose.local.yml up --build

echo "🎉 Development environment ready!"
echo ""
echo "🌐 Access your apps:"
echo "   - Main page: http://localhost"  
echo "   - Timers app: http://timers.localhost"
echo "   - Timers direct: http://localhost:3001"
echo ""
echo "🛑 To stop: Ctrl+C or run 'docker-compose -f docker-compose.local.yml down'"