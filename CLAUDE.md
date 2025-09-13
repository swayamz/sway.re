# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Dockerized multi-project hosting platform designed for deployment to DigitalOcean. The system hosts multiple web applications under subdomains of sway.re (e.g., timers.sway.re, app2.sway.re).

**Current Projects:**
- **Timers**: EVE Online timer tracking application (Next.js + Prisma + PostgreSQL)
  - Features: Timer management, timerboards, sovereignty tracking, user authentication via EVE SSO
  - Location: `projects/timers/`
  - Tech Stack: Next.js 14, Prisma, PostgreSQL, NextAuth, TailwindCSS

## Common Development Commands

**Local Development:**
```bash
# Quick start - sets up hosts and starts dev environment
./scripts/dev.sh

# View logs
docker-compose logs -f [service_name]

# Direct access URLs
http://timers.localhost  # Timers app via nginx proxy
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

**Root Level:**
- `docker-compose.yml`: Production services configuration
- `docker-compose.local.yml`: Local development services configuration
- `deploy.sh`: Production deployment automation script with interactive setup
- `.env.example`: Template for environment configuration
- `update.sh`: Project update script
- `DEPLOYMENT.md`: Detailed deployment documentation

**Nginx Configuration:**
- `nginx/nginx.conf`: Main nginx configuration with rate limiting, gzip, security headers
- `nginx/sites/default.conf`: Production subdomain routing (HTTP/HTTPS server blocks)
- `nginx/sites/local.conf`: Local development routing (localhost domains)
- `nginx/ssl/`: SSL certificate storage directory

**Scripts:**
- `scripts/dev.sh`: Local development setup (hosts file, container startup)
- `scripts/ssl-setup.sh`: SSL certificate automation

**Projects:**
- `projects/timers/`: EVE Online timers application
  - `Dockerfile`: Production container build
  - `Dockerfile.dev`: Development container with hot reload
  - `prisma/`: Database schema and migrations
  - `src/`: Next.js application source code

**Database Initialization:**
- `postgres-init/`: PostgreSQL initialization scripts

## Environment Variables

**Core Configuration:**
- `DOMAIN`: Main domain (sway.re)
- `SUBDOMAIN_TIMERS`: Timers subdomain (timers.sway.re)
- `SSL_ENABLED`: Controls HTTPS configuration (true/false)
- `LETSENCRYPT_EMAIL`: For SSL certificate registration
- `POSTGRES_PASSWORD`: PostgreSQL database password

**Authentication (Timers App):**
- `NEXTAUTH_SECRET`: NextAuth.js secret key for session encryption
- `NEXTAUTH_URL`: External URL for NextAuth callbacks
- `EVE_CLIENT_ID`: EVE Online SSO application ID
- `EVE_CLIENT_SECRET`: EVE Online SSO application secret

**Optional Deployment:**
- `DO_TOKEN`: DigitalOcean API token for automated deployment
- `DO_DROPLET_NAME`: Target droplet name for deployment

**Development Defaults:**
- Local development uses `postgres-local` service
- Default password fallback: `swaypassword`
- Development database: `sway_timers_dev`
- Production database: `sway_timers`

## Testing Changes

**IMPORTANT: After making code changes, Claude MUST test the changes using the following workflow:**

1. **Start Development Environment:**
   ```bash
   # If containers are not running, start them. Make sure to check first
   # to avoid any unnecessary dev.sh running.
   # If you need to run dev.sh, use a 5 minute timeout.
   ./scripts/dev.sh
   
   # Verify containers are running
   docker-compose -f docker-compose.local.yml ps
   ```

2. **Navigate to Application Using Playwright MCP:**
   - Use Playwright MCP tools to navigate to the changed application
   - Current available sites:
     - `http://timers.localhost` - EVE Online timers application

3. **Authenticate and Test Features:**
   - **Sign into the application** using EVE SSO authentication via Playwright
   - **Test all new features thoroughly** by interacting with the UI
   - **Verify existing functionality** is not broken
   - **Test edge cases and error scenarios**

4. **Testing Requirements:**
   - Navigate through all affected UI components
   - Test form submissions, data updates, and user interactions
   - Verify responsive behavior on different screen sizes
   - Check console for JavaScript errors
   - Validate API responses and data persistence

**Test Checklist:**
- [ ] Development environment started with `./scripts/dev.sh`
- [ ] Successfully navigated to application URL
- [ ] Authenticated with EVE SSO
- [ ] All new features tested and working
- [ ] Existing functionality verified as unbroken
- [ ] No console errors or broken UI elements
- [ ] Edge cases and error scenarios tested

**Note:** Testing with Playwright MCP is mandatory for any UI changes, new features, or bug fixes. Do not consider the task complete until full testing has been performed.