# 🚀 Complete Setup Guide

## Step-by-Step Installation

### ✅ Pre-Requirements Check

- [ ] Python 3.10 or higher installed
- [ ] pip package manager working
- [ ] Discord account
- [ ] Administrative access to a Discord server (for testing)

---

## 📝 Part 1: Discord Developer Portal Setup

### Step 1: Create Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter name: `Advanced Discord Bot` (or your preferred name)
4. Click **"Create"**

### Step 2: Create Bot User

1. In left menu, click **"Bot"**
2. Click **"Add Bot"**
3. Under **TOKEN**, click **"Copy"** to copy your bot token
4. **SAVE THIS TOKEN SECURELY** - you'll need it soon

### Step 3: Enable Required Intents

In the Bot settings, enable these **Privileged Gateway Intents**:
- [ ] Message Content Intent
- [ ] Server Members Intent
- [ ] Moderation Events

Click **"Save Changes"**

### Step 4: Get Application ID

1. Go to **"General Information"** tab
2. Copy the **APPLICATION ID**
3. Save this too

---

## 💻 Part 2: Local Setup

### Step 1: Install Python Dependencies

```bash
# Navigate to bot directory
cd "path/to/discord bot cline"

# Install required packages
pip install -r requirements.txt
```

**Expected output**: All packages should install successfully

### Step 2: Create Environment File

```bash
# Copy example file
copy .env.example .env          # Windows
cp .env.example .env            # Mac/Linux
```

### Step 3: Configure .env File

Open `.env` with a text editor and fill in:

```env
# Your bot token from Discord Developer Portal
DISCORD_TOKEN=paste_your_token_here

# Your application ID from Discord Developer Portal  
APPLICATION_ID=paste_your_app_id_here

# Your Discord user ID (optional, for owner commands)
# To get it: Enable Developer Mode in Discord settings,
# right-click yourself, click "Copy User ID"
OWNER_ID=your_user_id_here
```

---

## 🔑 Part 3: Bot Permissions Setup

### Step 1: Generate OAuth2 URL

1. In Developer Portal, go to **"OAuth2"** → **"URL Generator"**
2. Under **SCOPES**, select:
   - [ ] `bot`
3. Under **PERMISSIONS**, select:
   - [ ] Manage Messages
   - [ ] Ban Members
   - [ ] Kick Members
   - [ ] Timeout Members
   - [ ] Send Messages
   - [ ] Embed Links
   - [ ] Read Message History
   - [ ] Add Reactions

### Step 2: Add Bot to Server

1. Copy the generated URL from the bottom
2. Paste into browser
3. Select a test server
4. Click **"Authorize"**
5. Complete the CAPTCHA

Bot should now appear in your server!

---

## 🎮 Part 4: Running the Bot

### Option A: Quick Start (Windows)

```bash
# Double-click start.bat
# Follow the menu
```

### Option B: Command Line (All Systems)

```bash
# Navigate to bot directory
cd "path/to/discord bot cline"

# Run bot only
python main.py

# In another terminal, run dashboard (optional)
cd dashboard
python app.py
```

### Option C: Linux/Mac

```bash
# Make script executable
chmod +x start.sh

# Run it
./start.sh
```

---

## ✅ Verification Steps

### Is the Bot Running?

Check these signs:
1. ✓ Console shows: `Bot logged in as YourBotName#0000`
2. ✓ Bot shows as "Online" in Discord server
3. ✓ No error messages in console

### Test Commands

In your Discord server, try:

```
!help
!ping
!serverinfo
!userinfo
```

You should see responses for each!

### Dashboard Access (Optional)

Open browser and go to: http://localhost:5000

You should see the dashboard homepage.

---

## 🐛 Troubleshooting

### Problem: "DISCORD_TOKEN not found in .env file"

**Solution:**
1. Make sure `.env` file exists in bot directory
2. Check `.env` has `DISCORD_TOKEN=your_token` (not commented out)
3. Restart the bot

### Problem: Bot doesn't respond to commands

**Solution:**
1. Check bot has "Send Messages" permission in channel
2. Verify bot is online in Discord
3. Try `!help` command
4. Check console for error messages

### Problem: "discord.py not found" error

**Solution:**
```bash
pip install -r requirements.txt
```

### Problem: Dashboard won't load

**Solution:**
1. Make sure Flask is running: `python dashboard/app.py`
2. Check port 5000 is not in use
3. Try clearing browser cache (Ctrl+Shift+Delete)

### Problem: Database errors

**Solution:**
1. Delete `data/bot.db` file
2. Bot will recreate it automatically
3. Restart the bot

---

## 🎯 Next Steps

### 1. Test Moderation Commands

```bash
# Warning command
!warn @username Test warning

# View warnings
!warnings @username

# View logs
!modlogs
```

### 2. Customize Settings

Edit `config.py` to customize:
- Blocked words
- Spam thresholds
- Moderation colors
- Feature flags

### 3. Add New Commands

Create new files in `cogs/` folder:

```python
# cogs/mycog.py
from discord.ext import commands

class MyCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
    
    @commands.command(name="hello")
    async def hello(self, ctx):
        await ctx.send("Hello!")

async def setup(bot):
    await bot.add_cog(MyCog(bot))
```

Bot will auto-load it!

### 4. Deploy to Production

For production deployment:
1. Use a proper hosting service (Heroku, AWS, Digital Ocean)
2. Use environment variables properly
3. Enable HTTPS for dashboard
4. Set up proper logging and monitoring
5. Use a production database (PostgreSQL instead of SQLite)

---

## 📚 Useful Resources

- [discord.py Documentation](https://discordpy.readthedocs.io/)
- [Discord Developer Documentation](https://discord.com/developers/docs)
- [Python Documentation](https://docs.python.org/3/)
- [Flask Documentation](https://flask.palletsprojects.com/)

---

## 🎓 Learning Path

1. **Start Here**: Get bot running (Parts 1-4)
2. **Learn Commands**: Test all available commands
3. **Explore Code**: Look at `cogs/` and `utils/` files
4. **Customize**: Edit `config.py` and colors
5. **Extend**: Create your own cogs and commands
6. **Deploy**: Host the bot on a server

---

## 📞 Support

If you get stuck:
1. Check the troubleshooting section above
2. Read error messages carefully (they usually tell you the problem)
3. Check your `.env` file is correct
4. Verify Discord permissions are set up
5. Try restarting the bot

---

## ✨ What You Now Have

Congratulations! You now have:

✅ A professional Discord bot with:
- Moderation commands (warn, kick, ban, mute)
- Security features (anti-spam, anti-raid)
- Utility commands (help, userinfo, serverinfo)
- Web dashboard for management
- SQLite database for storing data
- Comprehensive error handling
- Extensible cog system

✅ Ready to:
- Invite to multiple servers
- Customize with your own commands
- Deploy to production
- Monitor via dashboard
- Scale to thousands of users

---

**Happy Botting! 🎉**
