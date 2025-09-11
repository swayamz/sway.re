# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Dockerized multi-project hosting platform designed for deployment to DigitalOcean. The system hosts multiple web applications under subdomains of sway.re (e.g., timers.sway.re, app2.sway.re).

## Architecture

**Core Components:**
- **Nginx Reverse Proxy**: Routes traffic based on subdomains using container name routing
- **Docker Compose**: Orchestrates all services with a shared `sway-network`
- **Individual Projects**: Each project has its own container in `projects/` directory
- **PostgreSQL Database**: Persistent database with separate instances for local/production
- **SSL Integration**: Designed for Let's Encrypt certificates with both HTTP and HTTPS configurations

**Key Design Patterns:**
- Each project is a separate Docker service exposed internally on port 3000
- Nginx proxies to containers by name (e.g., `sway-timers:3000`)
- Domain routing handled in `nginx/sites/default.conf` with separate server blocks per subdomain
- Environment variable configuration through `.env` file

## Common Development Commands

**Local Development:**
```bash
# Quick start - sets up hosts and starts dev environment
./scripts/dev.sh

# Manual start with hot reload
docker-compose -f docker-compose.local.yml up --build

# View logs
docker-compose logs -f [service_name]

# Direct access to timers for debugging
http://localhost:3001
```

**Production Deployment:**
```bash
# Deploy to DigitalOcean droplet
./deploy.sh [environment] [domain]
# Example: ./deploy.sh production mysite.com

# SSL setup with Let's Encrypt
./scripts/ssl-setup.sh your-domain.com

# Manual SSL (alternative)
sudo certbot certonly --standalone -d sway.re -d timers.sway.re
```

**Project-Specific Commands:**

*Timers project:*
```bash
# Development
cd projects/timers && npm run dev

# Database commands
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

## Adding New Projects

1. Create directory in `projects/[project-name]/`
2. Add Dockerfile (expose port 3000)
3. Add service to `docker-compose.yml`:
   ```yaml
   newproject:
     build:
       context: ./projects/newproject
     container_name: sway-newproject
     expose:
       - "3000"
     networks:
       - sway-network
   ```
4. Add server block to `nginx/sites/default.conf` for subdomain routing
5. Deploy with `docker-compose up --build -d`

## File Structure Significance

- `nginx/nginx.conf`: Main nginx configuration with rate limiting and gzip
- `nginx/sites/default.conf`: Subdomain routing configuration (HTTP/HTTPS server blocks)
- `nginx/ssl/`: SSL certificate storage directory
- `projects/*/`: Individual application directories with their own Dockerfiles
- `deploy.sh`: Production deployment automation script
- `.env.example`: Template for environment configuration

## SSL/HTTPS Configuration

The system has commented-out HTTPS server blocks in nginx configuration. To enable SSL:
1. Obtain certificates and place in `nginx/ssl/`
2. Uncomment HTTPS server blocks in `nginx/sites/default.conf`
3. Set `SSL_ENABLED=true` in `.env`
4. Restart nginx container

## Environment Variables

Key variables in `.env`:
- `DOMAIN`: Main domain (sway.re)
- `SSL_ENABLED`: Controls HTTPS configuration
- `LETSENCRYPT_EMAIL`: For SSL certificate registration
- `POSTGRES_PASSWORD`: PostgreSQL database password

## Database Setup

**PostgreSQL Configuration:**
- Production: Uses `postgres_data` volume for persistence
- Local dev: Uses `postgres_local_data` volume, exposed on port 5432
- Separate databases: `sway_timers` (prod), `sway_timers_dev` (local)
- Connection via environment variables in docker-compose files

**Database Commands:**
```bash
# Start database only for local development
docker-compose -f docker-compose.local.yml up postgres-local -d

# Run migrations (from timers directory)
npm run db:migrate

# Reset database (careful - destroys data!)
npx prisma migrate reset
```

## Testing and Verification

No formal testing framework is configured. Verify functionality by:
- Checking container health: `docker-compose ps`
- Testing endpoints: curl or browser access
- Reviewing logs: `docker-compose logs [service]`
- Database connection: `npm run db:studio`
- Nginx configuration validation: `docker-compose exec nginx nginx -t`