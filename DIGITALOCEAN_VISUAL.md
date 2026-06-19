# DigitalOcean Visual Step-by-Step

## STEP 1: Create Account

```
Visit: https://digitalocean.com
              ↓
        Click "Sign Up"
              ↓
    Email + Password or GitHub
              ↓
      Add Credit/Debit Card
              ↓
        Verify Email
```

## STEP 2: Create Droplet

```
Dashboard → Create ↓
   ↓
Select "Droplets" ↓
   ↓
Choose Image: Ubuntu 22.04 LTS ↓
   ↓
Choose Plan: $5/month (1GB RAM) ↓
   ↓
Region: Pick closest (NYC, London, etc) ↓
   ↓
Auth: Choose Password (set strong one) ↓
   ↓
Hostname: discord-bot-server ↓
   ↓
Click "Create Droplet" ↓
   ↓
⏳ Wait 1-2 minutes...
```

**Result:** You get an IP like `123.45.67.89`

## STEP 3: Login to Server

```
Option A (Browser Console - Easiest):
    Dashboard → Click Droplet → Access → Launch Console
    Username: root
    Password: (the one you set)

Option B (Terminal - Better):
    Mac/Linux: ssh root@123.45.67.89
    Windows: Use PuTTY → Add IP → Connect
```

## STEP 4: Setup Commands

Copy and paste each line, wait for it to finish:

```bash
# Update system (takes 1-2 min)
apt update && apt upgrade -y

# Install Python (takes 1 min)
apt install -y python3.11 python3-pip python3-venv

# Install Git (takes 30 sec)
apt install -y git

# Create folder
mkdir -p /root/discord-bot
cd /root/discord-bot

# Clone bot (replace with YOUR repo)
git clone https://github.com/YOUR_USERNAME/discord-bot.git .
# If no GitHub: manually upload files
```

## STEP 5: Install Bot

```bash
# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate

# Install packages (takes 2-3 min)
pip install -r requirements.txt

# Create config file
nano .env
```

**In nano editor:**
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
OWNER_ID=your_user_id
REDIRECT_URI=http://123.45.67.89:5000/callback
FLASK_SECRET=any-random-string-here
PORT=5000
DATABASE_PATH=data/bot.db
```

**Save:** Press `Ctrl + X` → `Y` → `Enter`

## STEP 6: Create Service

```bash
# Create service file
nano /etc/systemd/system/discord-bot.service
```

**Paste this:**
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

**Save:** `Ctrl + X` → `Y` → `Enter`

## STEP 7: Enable & Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start
sudo systemctl enable discord-bot

# Start bot
sudo systemctl start discord-bot

# Check status
sudo systemctl status discord-bot
```

**Expected output:**
```
● discord-bot.service - Discord Bot
   Loaded: loaded (/etc/systemd/system/discord-bot.service; enabled)
   Active: active (running) since...
```

If you see `active (running)` ✅ - **Bot is running!**

## STEP 8: Check Logs

```bash
# View live logs
journalctl -u discord-bot -f

# Expected output:
Bot logged in as YourBotName#1234
Dashboard: http://123.45.67.89:5000
```

If you see this ✅ - **Bot is online!**

## STEP 9: Access Dashboard

```
Open browser: http://123.45.67.89:5000
          ↓
    Click "Login with Discord"
          ↓
    Authorize app
          ↓
    See Dashboard ✅
```

## STEP 10: Invite Bot to Server

```
Get OAuth URL from Discord Developers:
    Applications → Bot Name → OAuth2 → URL Generator
    Select: bot + permissions
    
Copy URL → Paste in browser → Select Server → Authorize

Bot appears in server ✅
```

---

## Troubleshooting Flowchart

```
Bot not running?
├─ Check logs: journalctl -u discord-bot -f
│  ├─ Token error? Fix in .env
│  ├─ Port error? Change PORT in .env
│  └─ Other? Post error message
│
Dashboard won't load?
├─ Restart: sudo systemctl restart discord-bot
├─ Check IP: correct in .env?
└─ Check firewall: sudo ufw allow 5000
│
Commands not working?
├─ Check bot has permissions in server
├─ Check token is correct
└─ Restart bot: sudo systemctl restart discord-bot
│
Server restarted?
└─ Bot auto-starts ✅ (no action needed)
```

---

## Common Terminal Commands

```bash
# Check if running
sudo systemctl status discord-bot

# Restart
sudo systemctl restart discord-bot

# Stop
sudo systemctl stop discord-bot

# View logs
journalctl -u discord-bot -f

# Get server IP
hostname -I

# Check memory
free -h

# Check disk space
df -h

# Reboot server
sudo reboot
```

---

## Droplet IP Location

```
DigitalOcean Dashboard
    ↓
Click your Droplet
    ↓
See IP in top right
    ↓
Copy IP: 123.45.67.89
```

Use this IP for:
- SSH: `ssh root@123.45.67.89`
- Dashboard: `http://123.45.67.89:5000`
- REDIRECT_URI: `http://123.45.67.89:5000/callback`

---

## File Structure on Server

```
/root/discord-bot/
├── bot.py              # Main bot
├── requirements.txt    # Packages
├── .env               # Your config (SECRET!)
├── venv/              # Virtual environment
│   └── bin/
│       └── python    # Python interpreter
├── data/
│   └── bot.db        # Database
└── templates/
    ├── login.html
    └── dashboard.html
```

---

## Estimated Time

| Step | Time |
|------|------|
| Create Account | 5 min |
| Create Droplet | 10 min |
| SSH Setup | 2 min |
| Install packages | 5 min |
| Clone bot | 1 min |
| Install Python packages | 3 min |
| Create .env | 2 min |
| Create service | 2 min |
| Start bot | 1 min |
| **TOTAL** | **30-40 min** |

Then bot runs 24/7! ✅

---

## After Setup

✅ Bot is online 24/7
✅ Dashboard is live
✅ All commands work
✅ Database is persistent
✅ Auto-restarts if crash
✅ Auto-starts if server reboots

**Next: Invite to server, configure, enjoy!**

---

## Need Help?

1. **Check logs:** `journalctl -u discord-bot -f`
2. **Check .env:** `cat /root/discord-bot/.env`
3. **Restart bot:** `sudo systemctl restart discord-bot`
4. **View status:** `sudo systemctl status discord-bot`
5. **Read guide:** DIGITALOCEAN_SETUP.md

---

## Cost

```
$5/month = Droplet
$0/month = Bandwidth (unlimited)
$0/month = Database
         ─────────
$5/month = Total for a bot running 24/7!

Compare to: $50-100+ to leave PC running
```

**Much cheaper!**

---

**🎉 You're ready to deploy!**

Ready? Follow SETUP_CHECKLIST.md next!
