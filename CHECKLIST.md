# ✅ Setup Checklist

## Pre-Setup Requirements

- [ ] Python 3.10+ installed
- [ ] pip working (`pip --version` shows version)
- [ ] Discord account
- [ ] Access to Discord server for testing
- [ ] Text editor (VS Code, Notepad, etc.)

---

## Discord Developer Portal Setup

- [ ] Go to https://discord.com/developers/applications
- [ ] Click "New Application"
- [ ] Enter bot name
- [ ] Go to "Bot" section
- [ ] Click "Add Bot"
- [ ] Enable "Message Content Intent"
- [ ] Enable "Server Members Intent"
- [ ] Enable "Moderation Events"
- [ ] Copy and save bot **TOKEN**
- [ ] Copy and save **APPLICATION ID**
- [ ] Go to OAuth2 → URL Generator
- [ ] Select scope: `bot`
- [ ] Select permissions:
  - [ ] Manage Messages
  - [ ] Ban Members
  - [ ] Kick Members
  - [ ] Timeout Members
  - [ ] Send Messages
  - [ ] Embed Links
  - [ ] Read Message History
- [ ] Copy generated URL
- [ ] Open URL and add bot to test server

---

## Local Installation

- [ ] Navigate to bot directory
- [ ] Open command prompt/terminal
- [ ] Run: `pip install -r requirements.txt`
- [ ] Wait for all packages to install
- [ ] Verify no errors appeared

---

## Configuration

- [ ] Copy `.env.example` to `.env`
- [ ] Open `.env` in text editor
- [ ] Paste bot TOKEN next to `DISCORD_TOKEN=`
- [ ] Paste APPLICATION ID next to `APPLICATION_ID=`
- [ ] (Optional) Add your user ID next to `OWNER_ID=`
- [ ] Save `.env` file
- [ ] Verify `.env` is in same folder as `main.py`

---

## First Run - Bot

- [ ] Open terminal in bot directory
- [ ] Run: `python main.py`
- [ ] Check for message: "Bot logged in as YourBotName#0000"
- [ ] Verify bot shows "Online" in Discord
- [ ] In Discord, type: `!help`
- [ ] Verify bot responds with help menu

---

## Test Commands

- [ ] `!ping` - Should show latency
- [ ] `!help` - Should show commands
- [ ] `!serverinfo` - Should show server info
- [ ] `!userinfo` - Should show your info
- [ ] `!warn @botname Test warning` - If you're mod/admin
- [ ] `!modlogs` - Should show empty or prev logs

---

## Dashboard Setup (Optional)

- [ ] Open new terminal
- [ ] Navigate to `dashboard` folder
- [ ] Run: `python app.py`
- [ ] Open browser: `http://localhost:5000`
- [ ] Verify page loads
- [ ] Check statistics show correct numbers
- [ ] Try entering a Guild ID in modlogs section

---

## Security Verification

- [ ] [ ] `.env` file is NOT in git (check `.gitignore`)
- [ ] [ ] Bot token is hidden in `.env` only
- [ ] [ ] Database file `data/bot.db` exists
- [ ] [ ] No tokens logged in console output
- [ ] [ ] Rate limiting working on dashboard
- [ ] [ ] Input validation on all forms

---

## Files Verification

Check these files exist:

**Main Files:**
- [ ] main.py
- [ ] config.py
- [ ] requirements.txt
- [ ] .env (created from .env.example)

**Cogs (in cogs/ folder):**
- [ ] moderation.py
- [ ] utilities.py
- [ ] events.py

**Utils (in utils/ folder):**
- [ ] database.py
- [ ] security.py
- [ ] helpers.py

**Dashboard (in dashboard/ folder):**
- [ ] app.py
- [ ] templates/index.html
- [ ] static/style.css
- [ ] static/script.js

**Documentation:**
- [ ] README.md
- [ ] SETUP.md
- [ ] COMMANDS.md
- [ ] PROJECT_SUMMARY.md

**Scripts:**
- [ ] start.bat (for Windows)
- [ ] start.sh (for Mac/Linux)

---

## Troubleshooting Checklist

**Bot won't start:**
- [ ] Python 3.10+ installed?
- [ ] All packages installed? (`pip install -r requirements.txt`)
- [ ] `.env` file exists?
- [ ] `DISCORD_TOKEN` is in `.env`?
- [ ] Bot token is correct?

**Bot doesn't respond:**
- [ ] Bot is online in Discord?
- [ ] Bot has "Send Messages" permission?
- [ ] Correct prefix used (default: `!`)?
- [ ] Message Content Intent enabled?
- [ ] `!help` command works?

**Dashboard won't load:**
- [ ] Flask running? (`python app.py` in dashboard folder)
- [ ] Port 5000 available? (check task manager)
- [ ] Trying http://localhost:5000?
- [ ] No error in terminal?

**Commands not working:**
- [ ] Do you have required permission?
- [ ] Using correct syntax?
- [ ] Command exists? (check `!help`)
- [ ] Bot has permission in channel?

---

## Performance Checks

- [ ] Bot responds within 1 second
- [ ] Dashboard loads in <2 seconds
- [ ] No lag when executing commands
- [ ] Database queries complete quickly
- [ ] Memory usage reasonable
- [ ] CPU usage below 10%

---

## Next Steps Checklist

Once everything works:

- [ ] Read through command examples in COMMANDS.md
- [ ] Customize blocked words in config.py
- [ ] Try adding your own command (see SETUP.md)
- [ ] Test moderation commands with trusted users
- [ ] Set up moderation logs channel
- [ ] Invite bot to more servers
- [ ] Monitor logs for issues
- [ ] Customize colors and messages
- [ ] Plan production deployment

---

## Customization Checklist

- [ ] Review config.py settings
- [ ] Adjust spam thresholds if needed
- [ ] Add/remove blocked words
- [ ] Change embed colors (if desired)
- [ ] Enable/disable features in config
- [ ] Set custom prefix (if desired)
- [ ] Add your own cogs/commands
- [ ] Configure dashboard appearance

---

## Production Deployment Checklist

- [ ] Switch to PostgreSQL database
- [ ] Enable HTTPS for dashboard
- [ ] Set debug=False in Flask
- [ ] Use proper hosting (Heroku, AWS, etc.)
- [ ] Set up monitoring/alerts
- [ ] Configure proper logging
- [ ] Enable backups
- [ ] Set environment variables on host
- [ ] Test failover procedures
- [ ] Document procedures

---

## Final Verification

- [ ] [ ] Bot starts without errors
- [ ] [ ] All commands respond
- [ ] [ ] Database saving correctly
- [ ] [ ] Dashboard accessible
- [ ] [ ] Documentation is clear
- [ ] [ ] Project structure organized
- [ ] [ ] No sensitive data in code
- [ ] [ ] Ready for production

---

## 🎉 You're Ready!

Check marks in all sections? Congratulations! 

Your Discord bot is:
✅ Installed correctly
✅ Configured properly
✅ Running smoothly
✅ Ready for use
✅ Documented thoroughly
✅ Production ready

**Start using your bot with:**
```bash
python main.py
```

**Dashboard (optional):**
```bash
cd dashboard
python app.py
```

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Install packages | `pip install -r requirements.txt` |
| Run bot | `python main.py` |
| Run dashboard | `cd dashboard && python app.py` |
| Create .env | Copy `.env.example` to `.env` |
| Get help | `python main.py` then `!help` in Discord |
| View logs | Check console output |
| Check config | Open `config.py` |
| Add commands | Create file in `cogs/` folder |

---

**Last Updated:** 2025-06-16  
**Status:** Ready for Use ✅
