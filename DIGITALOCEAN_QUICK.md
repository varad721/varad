# DigitalOcean Quick Reference

## TL;DR (5 Minutes)

```bash
# 1. SSH into server
ssh root@YOUR_IP

# 2. Setup
apt update && apt install -y python3-pip git
git clone YOUR_REPO_URL /root/bot
cd /root/bot

# 3. Install & Config
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
nano .env  # Edit with your settings

# 4. Run as Service
sudo nano /etc/systemd/system/discord-bot.service
# Paste the service file from DIGITALOCEAN_SETUP.md
sudo systemctl enable discord-bot
sudo systemctl start discord-bot

# 5. Check Status
sudo systemctl status discord-bot
journalctl -u discord-bot -f
```

Done! ✅

---

## Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| Bot won't start | `journalctl -u discord-bot -f` to see errors |
| Dashboard won't load | `sudo systemctl restart discord-bot` |
| Permission denied | Use `sudo` before commands |
| Port in use | `sudo ufw allow 5000` |
| Out of memory | `free -h` to check, then `sudo systemctl restart discord-bot` |

---

## One-Liner Commands

```bash
# Get bot status
sudo systemctl status discord-bot

# Restart bot
sudo systemctl restart discord-bot

# View logs
journalctl -u discord-bot -f

# Check IP
hostname -I

# Reboot server
sudo reboot

# Stop bot
sudo systemctl stop discord-bot

# Start bot
sudo systemctl start discord-bot
```

---

## File Locations

```
/root/discord-bot/          # Bot folder
/root/discord-bot/bot.py    # Main bot file
/root/discord-bot/.env      # Configuration
/root/discord-bot/data/     # Database
/etc/systemd/system/discord-bot.service  # Service file
```

---

## Access

```
Dashboard: http://YOUR_DROPLET_IP:5000
SSH: ssh root@YOUR_DROPLET_IP
```

---

## Pricing

- **$5/month** - 1GB RAM (perfect for 1 bot)
- **$12/month** - 2GB RAM (multiple bots)
- Bandwidth: Unlimited
- Storage: 25GB included

---

## 24/7 Uptime ✅

Bot runs 24/7 automatically. Never turn it off unless needed.

Auto-restarts on crash, reboot, or update.

---

Need help? See DIGITALOCEAN_SETUP.md for detailed steps.
