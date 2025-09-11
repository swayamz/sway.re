# Production Deployment Guide

## Quick Start on DigitalOcean

1. **Create a DigitalOcean Droplet**
   - Ubuntu 22.04 or later
   - At least 2GB RAM recommended
   - Configure your domain DNS to point to the droplet IP

2. **Clone the repository**
   ```bash
   git clone <your-repo-url> sway
   cd sway
   ```

3. **Run the deployment script**
   ```bash
   ./deploy.sh production your-domain.com
   ```

That's it! Your application will be accessible at:
- `http://your-domain.com` (main landing page)
- `http://timers.your-domain.com` (timers application)

## EVE Online SSO Setup (REQUIRED)

**Before deployment**, set up EVE Online authentication:

1. **Visit**: https://developers.eveonline.com/
2. **Create application** with these settings:
   - **Name**: Sway Timers
   - **Connection Type**: Authentication & API Access
   - **Scopes**: publicData
   - **Callback URL**: `https://timers.your-domain.com/api/auth/callback/eve-online`

3. **Save the credentials** - you'll be prompted for them during deployment

⚠️ **CRITICAL**: The callback URL must EXACTLY match your domain. CORS will fail if mismatched.

## SSL/HTTPS Setup

After the initial deployment, enable HTTPS:

```bash
./scripts/ssl-setup.sh your-domain.com
```

This will:
- Install certbot
- Generate Let's Encrypt certificates
- Configure nginx for HTTPS
- Set up automatic certificate renewal

## What the deployment script does

1. **Environment Setup**
   - Creates `.env` file from template
   - Generates secure database password
   - Updates domain configuration

2. **System Dependencies**
   - Installs Docker and Docker Compose
   - Updates system packages

3. **Application Deployment**
   - Builds all containers
   - Starts services
   - Runs database migrations
   - Tests deployment health

4. **Verification**
   - Tests health endpoints
   - Shows container status
   - Provides access URLs

## Manual Setup (Alternative)

If you prefer manual control:

1. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your domain and secure passwords
   ```

3. **Deploy**
   ```bash
   docker-compose up --build -d
   ```

4. **Setup Database**
   ```bash
   docker-compose exec timers npm run db:generate
   docker-compose exec timers npm run db:migrate
   ```

## Adding New Projects

1. Create project directory: `projects/new-project/`
2. Add Dockerfile (must expose port 3000)
3. Add service to `docker-compose.yml`
4. Add nginx configuration for subdomain
5. Deploy: `docker-compose up --build -d`

## Troubleshooting

**Health checks fail:**
```bash
docker-compose logs --tail=20
docker-compose ps
```

**Database connection issues:**
```bash
docker-compose logs postgres
docker-compose exec timers npm run db:generate
```

**SSL issues:**
```bash
docker-compose logs nginx
sudo certbot certificates
```

**Domain not resolving:**
- Check DNS configuration
- Verify nginx configuration
- Check firewall (ports 80, 443 must be open)

## Monitoring

Check application health:
```bash
curl http://your-domain.com/health
curl http://timers.your-domain.com/api/health
```

View logs:
```bash
docker-compose logs -f [service_name]
```

## Backup

Database backup:
```bash
docker-compose exec postgres pg_dump -U sway sway_timers > backup.sql
```

## Updates

To update the application:
```bash
git pull
docker-compose up --build -d
```

## Security Notes

- Database passwords are automatically generated
- SSL certificates are automatically managed
- Containers run with restart policies
- Health checks monitor application status
- Rate limiting configured in nginx