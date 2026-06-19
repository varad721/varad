# DigitalOcean Setup Guide

## Step 1: Create DigitalOcean Account

1. Go to https://www.digitalocean.com
2. Click **Sign Up**
3. Use email or GitHub/Google to register
4. Add payment method (credit/debit card)
5. Verify email

---

## Step 2: Create a Droplet

### What's a Droplet?
A Droplet = Virtual server in the cloud. Think of it as renting a computer.

### Create Droplet:

1. **Dashboard** → Click **Create** → Select **Droplets**

2. **Choose Image:** Select **Ubuntu 22.04 LTS** (Latest stable Linux)

3. **Choose Plan:** 
   - **Basic** ($5/month) ← RECOMMENDED FOR START
   - Processor: Regular
   - 1GB RAM, 25GB SSD
   
4. **Choose Datacenter:** Pick closest to you (e.g., New York, London, Singapore)

5. **Authentication:** 
   - **Choose Password** (easier for beginners)
   - Set a strong password like: `MyBot@2024Secure!`
   - OR add SSH key (advanced)

6. **Hostname:** Name your server
   - Example: `discord-bot-server`

7. **Click Create Droplet** → Wait 1-2 minutes

---

## Step 3: Access Your Server

### Option A: Browser Console (Easiest)

1. Go to DigitalOcean Dashboard
2. Click your Droplet
3. Click **Access** → **Launch Console**
4. Login with:
   - Username: `root`
   - Password: (the one you set)

### Option B: Terminal/SSH (Better)

**On Windows:**
- Download PuTTY: https://www.putty.org
- Host: Your Droplet IP (shown in DigitalOcean)
- Login as: `root`
- Password: Your password

**On Mac/Linux:**
```bash
ssh root@YOUR_DROPLET_IP
```
Replace `YOUR_DROPLET_IP` with the IP shown in DigitalOcean

---

## Step 4: Install Prerequisites

Once logged in, run these commands:

```bash
# Update system
apt update && apt upgrade -y

# Install Python 3.11
apt install -y python3.11 python3-pip python3-venv

# Install Git
apt install -y git

# Install other tools
apt install -y nano curl wget
```

Each command takes 1-5 minutes. Wait for it to finish before next one.

---

## Step 5: Clone Your Bot

```bash
# Create folder
mkdir -p /root/discord-bot
cd /root/discord-bot

# Clone from GitHub (or download manually)
git clone https://github.com/YOUR_USERNAME/discord-bot.git .
# Replace YOUR_USERNAME with your GitHub username

# Or manually upload files:
# Use SCP or drag-drop in console
```

---

## Step 6: Setup Bot

```bash
# Go to folder
cd /root/discord-bot

# Create virtual environment
python3 -m venv venv

# Activate venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
nano .env
```

In nano editor:
1. Paste your configuration:
```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
OWNER_ID=your_user_id
REDIRECT_URI=http://YOUR_DROPLET_IP:5000/callback
FLASK_SECRET=your-random-secret-key-here
PORT=5000
DATABASE_PATH=/root/discord-bot/data/bot.db
```

2. Press `Ctrl + X`, then `Y`, then `Enter` to save

---

## Step 7: Create Startup Service

Create a systemd service so bot auto-starts:

```bash
# Create service file
nano /etc/systemd/system/discord-bot.service
```

Paste this:
```ini
[Unit]
Description=Discord Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/discord-bot
Environment="PATH=/root/discord-bot/venv/bin"
ExecStart=/root/discord-bot/venv/bin/python bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Save with `Ctrl + X`, `Y`, `Enter`

---

## Step 8: Start Bot

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start on reboot
sudo systemctl enable discord-bot

# Start the bot
sudo systemctl start discord-bot

# Check status
sudo systemctl status discord-bot
```

If status shows **active (running)** ✅ - Bot is running!

---

## Step 9: Monitor Logs

View bot logs in real-time:

```bash
# Live logs
journalctl -u discord-bot -f

# Last 100 lines
journalctl -u discord-bot -n 100

# Exit logs
Press Ctrl + C
```

Common output:
```
Bot logged in as YourBot#1234
Dashboard: http://YOUR_IP:5000
```

---

## Step 10: Access Dashboard

1. Get your Droplet IP from DigitalOcean dashboard
2. Open browser: `http://YOUR_DROPLET_IP:5000`
3. Login with Discord
4. Manage bot!

---

## Firewall Setup (Optional but Recommended)

Allow ports:

```bash
# Allow SSH (port 22)
ufw allow 22

# Allow Flask (port 5000)
ufw allow 5000

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## Troubleshooting

### Bot not running?

```bash
# Check status
sudo systemctl status discord-bot

# Restart
sudo systemctl restart discord-bot

# View errors
journalctl -u discord-bot -n 50
```

### Port 5000 already in use?

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 PID_NUMBER
```

### Bot keeps crashing?

```bash
# Check logs for errors
journalctl -u discord-bot -f

# Common fixes:
# 1. Check .env file is correct
nano /root/discord-bot/.env

# 2. Check database folder exists
mkdir -p /root/discord-bot/data

# 3. Reinstall packages
source /root/discord-bot/venv/bin/activate
pip install -r /root/discord-bot/requirements.txt --force-reinstall
```

### Dashboard won't load?

```bash
# Check if Flask is running
curl http://localhost:5000

# Check firewall
sudo ufw status

# Restart bot
sudo systemctl restart discord-bot
```

---

## Update Bot

To update your bot with new code:

```bash
cd /root/discord-bot

# Pull latest from GitHub
git pull origin main

# Restart bot
sudo systemctl restart discord-bot

# Check new logs
journalctl -u discord-bot -f
```

---

## Backup Database

Backup your bot's database:

```bash
# Create backup folder
mkdir -p /root/backups

# Backup database
cp /root/discord-bot/data/bot.db /root/backups/bot-$(date +%Y%m%d-%H%M%S).db

# Download to computer using SCP:
# scp -r root@YOUR_IP:/root/backups/ ./
```

---

## Useful Commands

```bash
# Check bot is running
systemctl is-active discord-bot

# Restart bot
sudo systemctl restart discord-bot

# Stop bot
sudo systemctl stop discord-bot

# Start bot
sudo systemctl start discord-bot

# View last 50 logs
journalctl -u discord-bot -n 50

# Check memory usage
free -h

# Check disk usage
df -h

# Check server uptime
uptime

# Reboot server (bot auto-restarts)
sudo reboot
```

---

## Performance Tips

### Monitor Resources

```bash
# Real-time monitoring
top

# Memory info
free -h

# Disk usage
du -sh /root/discord-bot

# Exit: Press Q
```

### If Low Memory

```bash
# Kill unused processes
pkill -f "unused_process"

# Check running processes
ps aux

# Restart bot (clears cache)
sudo systemctl restart discord-bot
```

---

## SSL Certificate (HTTPS)

For production dashboard access:

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot certonly --standalone -d your-domain.com

# Restart
sudo systemctl restart discord-bot
```

---

## Connect Domain

1. **Buy domain** from Namecheap, GoDaddy, etc.
2. **In DigitalOcean:**
   - Create > Domains
   - Add your domain
   - Point nameservers to DigitalOcean
3. **Create A record:**
   - Name: `@` (or subdomain like `bot`)
   - Points to: Your Droplet IP
4. **Wait 5-30 minutes** for DNS propagation

Then access: `http://your-domain.com:5000`

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Droplet (1GB, $5/month) | $5/month |
| Domain (.com) | $10-15/year |
| Bandwidth (included) | Free |
| **Total** | ~$5-6/month |

---

## Delete Droplet (Stop Charges)

When you're done:

1. DigitalOcean Dashboard → Droplet
2. Click **Destroy**
3. Confirm → Charges stop immediately

---

## Support

If issues:

1. Check logs: `journalctl -u discord-bot -f`
2. Check .env is correct: `cat /root/discord-bot/.env`
3. Restart: `sudo systemctl restart discord-bot`
4. Check DigitalOcean status page for outages

---

## Next Steps

✅ Bot is now online 24/7!
✅ Dashboard accessible
✅ All commands working
✅ Database persistent

**Your bot is now running on a real server!** 🚀
