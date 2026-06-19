# Complete Setup Checklist

## Pre-Setup (Prepare Credentials)

- [ ] **Discord Bot Token**
  - Go to https://discord.com/developers/applications
  - Create "New Application"
  - Go to "Bot" tab
  - Click "Add Bot"
  - Copy TOKEN
  
- [ ] **Discord Client ID & Secret**
  - In same application
  - Go to OAuth2 → General
  - Copy Client ID
  - Copy Client Secret
  - Go to OAuth2 → Redirects
  - Add: `http://YOUR_DROPLET_IP:5000/callback`

- [ ] **Your Discord User ID**
  - Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
  - Right-click your name → Copy User ID

- [ ] **Generate Flask Secret**
  - Run: `python3 -c "import secrets; print(secrets.token_hex(16))"`
  - Copy the output

---

## DigitalOcean Setup

- [ ] Create DigitalOcean account (https://digitalocean.com)
- [ ] Add payment method
- [ ] Create Ubuntu 22.04 Droplet ($5/month plan)
- [ ] Wait for Droplet to boot (1-2 minutes)
- [ ] Note your Droplet IP address

---

## Server Setup

- [ ] SSH into server: `ssh root@YOUR_IP`
- [ ] Update system: `apt update && apt upgrade -y`
- [ ] Install Python: `apt install -y python3.11 python3-pip python3-venv git`
- [ ] Create bot folder: `mkdir -p /root/discord-bot`
- [ ] Clone bot: `git clone YOUR_REPO /root/discord-bot`
- [ ] Enter folder: `cd /root/discord-bot`

---

## Bot Installation

- [ ] Create venv: `python3 -m venv venv`
- [ ] Activate venv: `source venv/bin/activate`
- [ ] Install packages: `pip install -r requirements.txt`
- [ ] Create .env: `nano .env`
- [ ] Paste your credentials in .env
- [ ] Save .env (Ctrl+X, Y, Enter)

---

## Service Setup

- [ ] Create service file: `sudo nano /etc/systemd/system/discord-bot.service`
- [ ] Paste service configuration (from DIGITALOCEAN_SETUP.md)
- [ ] Save (Ctrl+X, Y, Enter)
- [ ] Reload systemd: `sudo systemctl daemon-reload`
- [ ] Enable auto-start: `sudo systemctl enable discord-bot`
- [ ] Start bot: `sudo systemctl start discord-bot`

---

## Verification

- [ ] Check status: `sudo systemctl status discord-bot`
  - Should show **active (running)** ✅
- [ ] View logs: `journalctl -u discord-bot -f`
  - Should show bot login message
- [ ] Access dashboard: `http://YOUR_IP:5000`
  - Should show login page ✅
- [ ] Login with Discord
  - Should show dashboard ✅
- [ ] Invite bot to server (OAuth URL)
- [ ] Test commands: `/help` in Discord

---

## Firewall (Optional)

- [ ] Allow SSH: `sudo ufw allow 22`
- [ ] Allow Flask: `sudo ufw allow 5000`
- [ ] Enable firewall: `sudo ufw enable`
- [ ] Check: `sudo ufw status`

---

## Domain Setup (Optional)

- [ ] Buy domain (Namecheap, GoDaddy, etc.)
- [ ] Add to DigitalOcean: DigitalOcean → Create → Domains
- [ ] Update nameservers at registrar to DigitalOcean
- [ ] Create A record: `@` points to Droplet IP
- [ ] Wait 5-30 min for DNS
- [ ] Access at: `http://your-domain.com:5000`

---

## Backup Setup

- [ ] Create backup folder: `mkdir -p /root/backups`
- [ ] Backup database: `cp /root/discord-bot/data/bot.db /root/backups/bot.db`
- [ ] Setup automated backups (optional)

---

## Post-Launch

- [ ] Bot is running 24/7 ✅
- [ ] Dashboard accessible ✅
- [ ] All commands working ✅
- [ ] Logs updating in real-time ✅

---

## Maintenance

- [ ] Monitor logs regularly: `journalctl -u discord-bot -f`
- [ ] Check memory: `free -h`
- [ ] Check disk: `df -h`
- [ ] Update bot: `git pull` + `systemctl restart`

---

## If Issues

- [ ] Check logs first: `journalctl -u discord-bot -f`
- [ ] Check .env is correct: `cat /root/discord-bot/.env`
- [ ] Restart: `sudo systemctl restart discord-bot`
- [ ] Check firewall: `sudo ufw status`
- [ ] Reboot server: `sudo reboot`

---

## Cleanup (If Stopping)

- [ ] Stop bot: `sudo systemctl stop discord-bot`
- [ ] Backup data: `cp -r /root/discord-bot/data /root/backups/`
- [ ] Delete Droplet (stops charges immediately)

---

## Success! 🚀

Your Discord bot is now:
- ✅ Online 24/7
- ✅ Running on real server
- ✅ Accessible via dashboard
- ✅ Persistent database
- ✅ Auto-restart on crash
- ✅ All features working

**Next:** Customize settings, add more commands, or scale!

---

See detailed guides:
- DIGITALOCEAN_SETUP.md - Complete walkthrough
- DIGITALOCEAN_QUICK.md - Quick reference
- README.md - General setup
- DEPLOYMENT.md - All hosting options
