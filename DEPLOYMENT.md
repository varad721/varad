# Discord Bot Docker Deployment Guide

This guide walks you through hosting the Advanced Discord Bot using Docker.

## Quick Start (5 minutes)

### 1. Prepare Environment Variables

Copy the deployment template and fill in your Discord bot credentials:

```bash
cp .env.docker .env
```

Edit `.env` and add:
- `DISCORD_TOKEN` - Your bot token from Discord Developer Portal
- `APPLICATION_ID` - Your application ID
- `OWNER_ID` - Your Discord user ID
- `DASHBOARD_SECRET` - Generate a random secret: `openssl rand -base64 32`

### 2. Build and Run

```bash
# Build the Docker image
docker build -t discord-bot:latest .

# Run with Docker Compose
docker compose up -d

# View logs
docker compose logs -f
```

### 3. Access the Dashboard

Dashboard runs on `http://localhost:5000`

---

## Deployment Options

### Option A: Local Machine (Development/Testing)

```bash
docker compose up -d
```

**Pros:**
- Simple setup
- Quick testing
- Low resource overhead

**Cons:**
- Bot stops if machine shuts down
- No automatic restart
- Limited scalability

---

### Option B: VPS (Production)

Popular VPS providers: DigitalOcean, Linode, Vultr, AWS, Azure, Google Cloud

#### 1. Connect to VPS via SSH

```bash
ssh root@your_vps_ip
```

#### 2. Install Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (optional)
sudo usermod -aG docker $USER
```

#### 3. Clone Your Bot Repository

```bash
git clone https://github.com/your-username/discord-bot.git
cd discord-bot
```

#### 4. Configure Environment

```bash
cp .env.docker .env
nano .env  # Edit with your credentials
```

#### 5. Deploy

```bash
docker compose up -d
```

#### 6. View Logs

```bash
docker compose logs -f
```

---

### Option C: Docker Hub Registry

Push your image to Docker Hub for easy deployment across multiple servers.

#### 1. Create Docker Hub Account

Visit https://hub.docker.com and sign up.

#### 2. Create Repository

Click "Create Repository" and name it `discord-bot`.

#### 3. Push Image

```bash
# Login to Docker Hub
docker login

# Tag image with your username
docker tag discord-bot:latest your-username/discord-bot:latest

# Push to Docker Hub
docker push your-username/discord-bot:latest
```

#### 4. Deploy from Any Server

```bash
docker run -d \
  --name discord-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=your_token \
  -e APPLICATION_ID=your_id \
  -e OWNER_ID=your_user_id \
  -e DASHBOARD_SECRET=your_secret \
  -p 5000:5000 \
  -v bot-data:/app/data \
  your-username/discord-bot:latest
```

---

### Option D: Docker Compose with Volumes (Recommended Production)

```yaml
version: '3.8'

services:
  discord-bot:
    image: discord-bot:latest
    container_name: discord-bot
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - APPLICATION_ID=${APPLICATION_ID}
      - OWNER_ID=${OWNER_ID}
      - DASHBOARD_SECRET=${DASHBOARD_SECRET}
      - ENABLE_DASHBOARD=true
      - DASHBOARD_PORT=5000
      - LOG_LEVEL=INFO
    ports:
      - "5000:5000"
    volumes:
      - bot-data:/app/data
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

volumes:
  bot-data:
```

---

## Management Commands

### View Logs

```bash
# Real-time logs
docker compose logs -f

# Last 50 lines
docker compose logs --tail=50

# Logs since last hour
docker compose logs --since 1h
```

### Stop Bot

```bash
docker compose down
```

### Restart Bot

```bash
docker compose restart
```

### Update Bot Code

```bash
git pull origin main
docker compose down
docker build -t discord-bot:latest .
docker compose up -d
```

### View Resource Usage

```bash
docker stats discord-bot
```

### Shell Access (for debugging)

```bash
docker compose exec discord-bot sh
```

---

## Reverse Proxy Setup (Optional)

If hosting on a VPS, use Nginx or Traefik to handle the dashboard.

### With Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable HTTPS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Troubleshooting

### Bot Not Starting

Check logs:
```bash
docker compose logs
```

Common issues:
- Missing `DISCORD_TOKEN` in `.env`
- Discord intents not enabled in Developer Portal
- Port 5000 already in use

### Dashboard Not Loading

```bash
# Check if service is running
docker compose ps

# Check port binding
docker compose port discord-bot 5000

# Verify connectivity
curl http://localhost:5000/health
```

### Out of Memory

Increase Docker memory limit in `.env`:
```yaml
deploy:
  resources:
    limits:
      memory: 1G
```

### Database Issues

Reset database:
```bash
docker compose exec discord-bot rm -f /app/data/bot.db
docker compose restart
```

---

## Monitoring & Backups

### Backup Database

```bash
# Create backup
docker compose exec discord-bot cp /app/data/bot.db /app/data/bot.db.backup

# Copy to local machine
docker cp discord-bot:/app/data/bot.db ./bot.db.backup
```

### Automated Backups (Linux)

Add to crontab:
```bash
0 2 * * * docker cp discord-bot:/app/data/bot.db /backups/bot.db.$(date +\%Y\%m\%d)
```

### Monitor Uptime

```bash
# Check restart count
docker compose ps

# View container stats
docker stats --no-stream
```

---

## Security Best Practices

1. **Use `.env` file** - Never hardcode secrets
2. **Change `DASHBOARD_SECRET`** - Generate a strong random string
3. **Use HTTPS** - Set up SSL with Let's Encrypt
4. **Restrict Dashboard** - Use reverse proxy auth or firewall rules
5. **Keep Docker Updated** - Run `docker system prune` regularly
6. **Limit Resources** - Set memory/CPU limits in compose file
7. **Monitor Logs** - Review logs regularly for errors

---

## Performance Optimization

### 1. Reduce Image Size

The current image is ~185MB. To reduce further:
- Use alpine base (already applied)
- Remove unused dependencies

### 2. Optimize Memory Usage

Adjust in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 256M  # Reduce if needed
```

### 3. Enable Log Rotation

Already configured in `docker-compose.yml` to prevent disk bloat.

---

## Support

For issues:
1. Check logs: `docker compose logs`
2. Verify `.env` configuration
3. Ensure Discord bot permissions are correct
4. Check port availability: `lsof -i :5000`

---

## Next Steps

- [ ] Configure your bot token and credentials
- [ ] Test locally first: `docker compose up -d`
- [ ] Deploy to production VPS
- [ ] Set up SSL/HTTPS with reverse proxy
- [ ] Configure monitoring and backups
- [ ] Add GitHub Actions CI/CD (optional)
