# Discord Bot + Dashboard

A feature-rich Discord bot with web dashboard, leveling system, role management, and Carl-bot style commands.

## Features

✅ **Moderation** - warn, unwarn, kick, ban, mute, unmute, purge
✅ **Role Management** - roleall, unroleall, autorole
✅ **Leveling System** - XP gain, levels, leaderboard
✅ **Tagging System** - Create and use custom tags
✅ **Discord OAuth Login** - Secure dashboard access
✅ **Web Dashboard** - Manage server settings, members, commands
✅ **Modlogs** - Track all actions

## Setup

### 1. Create Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Go to "Bot" tab and click "Add Bot"
4. Copy the TOKEN
5. Enable these Intents:
   - Message Content Intent
   - Server Members Intent
   - Guilds
6. Go to OAuth2 → URL Generator
7. Select scopes: `bot`, `identify`, `guilds`
8. Select permissions: Administrator (or check needed ones)
9. Copy OAuth URL and invite bot to your server

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Edit `.env`:
```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
OWNER_ID=your_user_id
```

### 4. Run Locally

```bash
python bot.py
```

Dashboard: http://localhost:5000

### 5. Host on Production

#### Option A: Railway.app (Recommended)
1. Push to GitHub
2. Connect to Railway
3. Set environment variables in Railway dashboard
4. Deploy

#### Option B: Render.com
1. Push to GitHub
2. Create new Web Service on Render
3. Set start command: `gunicorn bot:app`
4. Add environment variables
5. Deploy

#### Option C: Heroku (Free tier ended)
Use Railway or Render instead

#### Option D: VPS (Linode, DigitalOcean, AWS)
```bash
git clone <your-repo>
cd bot
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
nohup python bot.py &  # Run in background
```

## Bot Commands

### Moderation
- `,warn @user reason` - Warn user
- `,unwarn @user` - Remove warning
- `,warnings [@user]` - View warnings
- `,kick @user reason` - Kick user
- `,ban @user reason` - Ban user
- `,mute @user 10m reason` - Timeout user
- `,unmute @user` - Remove timeout
- `,purge 10` - Delete messages

### Roles
- `,roleall @role` - Give role to all members
- `,unroleall @role` - Remove role from all
- `,autorole @role` - Set auto-assign role
- `,autorole` - Disable autorole

### Utility
- `,tag name` - Use tag
- `,tag name content` - Create tag
- `,prefix !` - Change prefix
- `,userinfo [@user]` - User info
- `,serverinfo` - Server info
- `,level [@user]` - Check level
- `,leaderboard` - Top members

## Dashboard

**Login:** Discord OAuth
**Access:** Admins + Server Owner
**Features:**
- View server stats
- Edit settings
- Manage members
- Give roles to all
- Create/use tags
- View modlogs

## File Structure

```
.
├── bot.py                 # Main bot + Flask app
├── requirements.txt       # Dependencies
├── .env.example          # Environment template
├── templates/
│   ├── login.html        # OAuth login page
│   └── dashboard.html    # Main dashboard
└── data/
    └── bot.db            # SQLite database
```

## Troubleshooting

### Bot doesn't respond
- Check token in `.env`
- Verify bot has Message Content Intent enabled
- Check permissions in server

### Dashboard won't load
- Ensure you're an admin or server owner
- Check `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- Verify `REDIRECT_URI` matches Discord OAuth settings

### Database errors
- Delete `data/bot.db` to reset
- Ensure `data/` folder exists

## Deploy to Production

### Railway.app (Best for beginners)
```bash
# 1. Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. Go to railway.app
# 3. Create new project → Import GitHub repo
# 4. Add variables:
#    DISCORD_TOKEN
#    DISCORD_CLIENT_ID
#    DISCORD_CLIENT_SECRET
#    OWNER_ID
#    REDIRECT_URI=https://your-railway-url.up.railway.app/callback
```

### Render.com
```bash
# 1. Push to GitHub
# 2. Create Web Service on Render
# 3. Connect GitHub repo
# 4. Build command: pip install -r requirements.txt
# 5. Start command: python bot.py
# 6. Add environment variables
```

## Support

For issues or feature requests, check the bot's GitHub or contact the developer.

---

Made with ❤️ for Discord communities
