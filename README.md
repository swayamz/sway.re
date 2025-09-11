# Sway Multi-Project Hosting

A Dockerized multi-project hosting platform designed for easy deployment to DigitalOcean. Host multiple projects under subdomains like `timers.sway.re`, `app2.sway.re`, etc.

## Architecture

- **Nginx Reverse Proxy**: Routes traffic to different projects based on subdomain
- **Docker Compose**: Orchestrates all services
- **Modular Projects**: Each project in its own directory with individual Dockerfile
- **Easy Scaling**: Add new projects by creating directories and updating configuration

## Quick Start

### Local Development

```bash
# Clone or create the project structure
git clone <your-repo> sway
cd sway

# Start all services
docker-compose up --build
```

Access your applications:
- Main site: http://localhost
- Timers app: http://timers.localhost (add to /etc/hosts: `127.0.0.1 timers.localhost`)

### Production Deployment to DigitalOcean

1. **Create a DigitalOcean Droplet**
   - Ubuntu 22.04 LTS
   - At least 1GB RAM
   - SSH access configured

2. **Upload your code**
   ```bash
   # From your local machine
   scp -r . root@your-droplet-ip:/root/sway
   ```

3. **Deploy**
   ```bash
   # SSH into your droplet
   ssh root@your-droplet-ip
   cd /root/sway
   
   # Run deployment script
   ./deploy.sh
   ```

4. **Configure DNS**
   - Point your domain to the droplet IP
   - Add A records for subdomains (timers.sway.re, etc.)

## Adding New Projects

1. **Create project directory**
   ```bash
   mkdir projects/newproject
   ```

2. **Add Dockerfile and application code**
   ```dockerfile
   # projects/newproject/Dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY . .
   RUN npm install
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

3. **Update docker-compose.yml**
   ```yaml
   services:
     # ... existing services
     newproject:
       build:
         context: ./projects/newproject
       container_name: sway-newproject
       expose:
         - "3000"
       networks:
         - sway-network
   ```

4. **Add Nginx configuration**
   ```nginx
   # Add to nginx/sites/default.conf
   server {
       listen 80;
       server_name newproject.sway.re;
       
       location / {
           proxy_pass http://sway-newproject:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

5. **Deploy**
   ```bash
   docker-compose up --build -d
   ```

## SSL/HTTPS Setup

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Stop nginx container temporarily
docker-compose stop nginx

# Obtain certificates
sudo certbot certonly --standalone -d sway.re -d timers.sway.re

# Copy certificates to nginx/ssl/
sudo cp /etc/letsencrypt/live/sway.re/fullchain.pem nginx/ssl/sway.re.crt
sudo cp /etc/letsencrypt/live/sway.re/privkey.pem nginx/ssl/sway.re.key

# Update nginx configuration (uncomment HTTPS blocks in nginx/sites/default.conf)
# Restart containers
docker-compose up -d
```

## Project Structure

```
sway/
├── docker-compose.yml          # Main orchestration
├── deploy.sh                   # Deployment script
├── nginx/
│   ├── nginx.conf             # Main nginx config
│   └── sites/
│       └── default.conf       # Site configurations
├── projects/
│   └── timers/                # Example project
│       ├── Dockerfile
│       ├── package.json
│       ├── server.js
│       └── public/
│           └── index.html
└── README.md
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DOMAIN=sway.re
SSL_ENABLED=false
LETSENCRYPT_EMAIL=your-email@example.com
```

## Monitoring

View logs:
```bash
# All containers
docker-compose logs -f

# Specific service
docker-compose logs -f timers
docker-compose logs -f nginx
```

Check container status:
```bash
docker-compose ps
```

## Backup Strategy

1. **Code**: Keep in Git repository
2. **SSL Certificates**: Backup `/etc/letsencrypt/` directory
3. **Data**: Use Docker volumes for persistent data

## Troubleshooting

### Containers won't start
```bash
docker-compose down
docker-compose up --build
```

### SSL issues
- Ensure DNS is pointing to your server
- Check certificate paths in nginx configuration
- Verify certificate validity: `openssl x509 -in nginx/ssl/sway.re.crt -text -noout`

### Domain routing issues
- Verify DNS A records
- Check nginx configuration syntax: `docker-compose exec nginx nginx -t`
- Review nginx logs: `docker-compose logs nginx`# sway.re
