# Deployment Guide

## Quick Start (Local)

```bash
# 1. Install Python 3.10+
# 2. Clone/download project
# 3. Create virtual environment
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate on Windows

# 4. Install dependencies
pip install -r requirements.txt

# 5. Configure
cp .env.example .env
# Edit .env with your values

# 6. Run
python bot.py
```

Visit: http://localhost:5000

---

## Deploy to Railway (RECOMMENDED)

### Why Railway?
- Free tier available
- Easy GitHub integration
- Auto-deploys on push
- Environment variables in UI
- Dashboard with logs

### Steps:

1. **Create GitHub repo**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/discord-bot.git
   git push -u origin main
   ```

2. **Go to railway.app**
   - Login with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your bot repo

3. **Add Variables**
   - Click "Variables"
   - Add these:
     ```
     DISCORD_TOKEN = your_token
     DISCORD_CLIENT_ID = your_id
     DISCORD_CLIENT_SECRET = your_secret
     OWNER_ID = 123456789
     REDIRECT_URI = https://yourbotname-production.up.railway.app/callback
     PORT = 5000
     ```

4. **Get your URL**
   - Railway creates URL automatically
   - Update `REDIRECT_URI` in Discord settings

---

## Deploy to Render.com

### Steps:

1. **Create GitHub repo** (same as Railway)

2. **Go to render.com**
   - Sign up
   - Click "New +"
   - Select "Web Service"
   - Connect GitHub repo

3. **Configure**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python bot.py`
   - Environment: Python 3.10

4. **Add Variables**
   - Click "Environment"
   - Add all variables from .env

5. **Deploy**
   - Click "Create Web Service"
   - Get URL from dashboard
   - Update Discord OAuth settings

---

## Deploy to Replit

### Steps:

1. **Create Replit account** → replit.com

2. **Click "Create"** → "Import from GitHub"

3. **Paste your GitHub URL**

4. **Click Secrets** (lock icon)
   - Add all variables

5. **Run:**
   ```bash
   python bot.py
   ```

---

## Deploy to DigitalOcean / Linode (VPS)

### Prerequisites:
- VPS with Ubuntu 20.04+
- SSH access

### Steps:

```bash
# 1. SSH into server
ssh root@your_ip

# 2. Update system
apt update && apt upgrade -y

# 3. Install Python & dependencies
apt install -y python3 python3-pip python3-venv git

# 4. Clone repo
git clone https://github.com/yourusername/discord-bot.git
cd discord-bot

# 5. Create venv
python3 -m venv venv
source venv/bin/activate

# 6. Install requirements
pip install -r requirements.txt

# 7. Create .env
nano .env
# Paste your variables

# 8. Install & start with systemd
sudo nano /etc/systemd/system/discord-bot.service
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

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable discord-bot
sudo systemctl start discord-bot
sudo systemctl status discord-bot  # Check status

# View logs:
journalctl -u discord-bot -f
```

---

## Environment Variables Explained

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | OAuth Client ID |
| `DISCORD_CLIENT_SECRET` | OAuth Client Secret (keep secret!) |
| `OWNER_ID` | Your Discord user ID |
| `REDIRECT_URI` | Where Discord redirects after login (deployment URL) |
| `FLASK_SECRET` | Secret for Flask sessions (any random string) |
| `PORT` | Port to run on (default 5000, Railway sets to 5000) |
| `DATABASE_PATH` | Where to store SQLite db (default: data/bot.db) |

---

## Getting OAuth Credentials

1. Go to https://discord.com/developers/applications
2. Click your bot application
3. Go to "OAuth2" tab
4. Copy **Client ID** and **Client Secret**
5. Go to "OAuth2 → Redirects"
6. Add your deployment URL + `/callback`
   - Local: `http://localhost:5000/callback`
   - Production: `https://yourbotname.up.railway.app/callback`

---

## Post-Deployment Checklist

- [ ] Bot is online in Discord
- [ ] Dashboard loads at your URL
- [ ] Can login with Discord
- [ ] Commands work (`/help`)
- [ ] No errors in logs
- [ ] Database file created
- [ ] Modlogs showing actions

---

## Update Bot

```bash
# Pull latest changes
git pull origin main

# Restart service (Railway auto-restarts)
# For VPS:
sudo systemctl restart discord-bot
```

---

## Troubleshooting Deployment

**Bot offline?**
- Check DISCORD_TOKEN is correct
- Verify bot is in your server
- Check deployment logs

**Dashboard won't load?**
- Verify REDIRECT_URI is set in Discord settings
- Check CLIENT_ID and CLIENT_SECRET
- Look at Flask logs

**Database errors?**
- Check file permissions: `chmod 755 data/`
- Delete `data/bot.db` to reset

**Memory issues?**
- Upgrade plan (Railway: starter to hobby)
- Close unused processes
- Check for memory leaks

---

## Monitoring

**Railway:** Dashboard shows logs + metrics
**Render:** Real-time logs in dashboard
**VPS:** Use `journalctl -u discord-bot -f` for logs

---

## Support

Stuck? Check logs first:
```bash
# Local:
# Just watch console output

# Railway/Render:
# Check "Logs" tab in dashboard

# VPS:
journalctl -u discord-bot -f
```
