# 🤖 Advanced Discord Bot

A professional-grade Discord bot with moderation, security features, and a web dashboard - similar to Carl-bot but completely customizable!

## ✨ Features

### 🛡️ Security Features
- **Anti-Spam Protection**: Automatically detects and mutes spam users
- **Anti-Raid Detection**: Identifies mass user join attempts
- **Input Validation**: All inputs validated for security
- **Rate Limiting**: API rate limiting on dashboard
- **Role-Based Access**: Commands restricted by Discord permissions
- **Comprehensive Logging**: All actions logged to database

### 🔨 Moderation Commands
- `!warn <member> <reason>` - Warn a member
- `!kick <member> <reason>` - Kick a member
- `!ban <member> <reason>` - Ban a member
- `!mute <member> <duration> <reason>` - Timeout a member
- `!unmute <member>` - Remove timeout
- `!warnings <member>` - View user warnings
- `!modlogs [limit]` - View moderation logs
- `!clear <amount>` - Delete messages (bulk delete)

### 📊 Utility Commands
- `!help [command]` - Display help information
- `!serverinfo` - Get server statistics
- `!userinfo [member]` - Get user information
- `!ping` - Check bot latency
- `!suggest <suggestion>` - Submit a feature suggestion
- `!report <member> <reason>` - Report a user
- `!stats` - Bot statistics (owner only)

### 🌐 Web Dashboard
- Real-time statistics
- Moderation logs viewer
- Guild settings management
- Bot commands reference
- Security features overview
- Rate-limited API endpoints

### 📦 Advanced Features
- Automatic welcome messages for new members
- Member join/leave logging
- Message edit/delete logging
- Event-based responses
- Extensible cog system

## 📋 Requirements

- Python 3.10+
- pip (Python package manager)
- Discord account & bot token

## 🚀 Setup Instructions

### 1. Clone/Download the Project

```bash
cd path/to/discord-bot
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```
DISCORD_TOKEN=your_bot_token_here
APPLICATION_ID=your_application_id_here
OWNER_ID=your_discord_user_id_here
```

### 4. Get Your Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Advanced Bot")
4. Go to "Bot" section and click "Add Bot"
5. Copy the token to `.env` as `DISCORD_TOKEN`
6. Under "TOKEN", click "Copy"
7. In "Privileged Gateway Intents", enable:
   - Message Content Intent
   - Server Members Intent
   - Moderation Events

### 5. Set Bot Permissions

1. In Developer Portal, go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`
3. Select permissions:
   - Manage Messages
   - Ban Members
   - Kick Members
   - Timeout Members
   - Send Messages
   - Embed Links
   - Read Message History
   - Add Reactions
4. Copy the generated URL and open it to add bot to your server

### 6. Run the Bot

```bash
python main.py
```

You should see:
```
Bot logged in as YourBotName#0000 (123456789)
```

### 7. Run the Dashboard (Optional)

In another terminal:

```bash
cd dashboard
python app.py
```

Access at: http://localhost:5000

## 📁 Project Structure

```
discord-bot/
├── main.py                 # Bot entry point
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── README.md              # This file
├── cogs/                  # Bot command modules
│   ├── moderation.py      # Moderation commands
│   ├── utilities.py       # Utility commands
│   └── events.py          # Event handlers
├── utils/                 # Utility modules
│   ├── database.py        # SQLite database manager
│   ├── security.py        # Security features
│   ├── helpers.py         # Helper functions
│   └── __init__.py
├── dashboard/             # Web dashboard
│   ├── app.py            # Flask application
│   ├── templates/        # HTML templates
│   │   └── index.html    # Dashboard home page
│   └── static/           # CSS & JavaScript
│       ├── style.css     # Dashboard styling
│       └── script.js     # Dashboard functionality
└── data/                 # Data directory (created automatically)
    └── bot.db           # SQLite database
```

## 🔑 Bot Permissions

The bot requires these permissions:
- **Manage Messages** - For clearing messages and moderation actions
- **Ban Members** - For banning users
- **Kick Members** - For kicking users
- **Timeout Members** - For muting users
- **Send Messages** - For sending command responses
- **Embed Links** - For sending embed messages
- **Read Message History** - For accessing message history
- **Moderate Members** - For timeout features

## 📚 Command Usage Examples

### Moderation
```
!warn @username Spamming in chat
!kick @username No reason needed
!ban @username Banned for ban evading
!mute @username 1h Disruptive behavior
!unmute @username
!clear 10
!modlogs 20
!warnings @username
```

### Utility
```
!help
!help warn
!serverinfo
!userinfo @username
!ping
!stats
```

## 🔐 Security Features Explained

### Anti-Spam
- Tracks messages per user per guild
- Automatic mute if user sends 5+ messages in 10 seconds
- Configurable thresholds per guild

### Anti-Raid
- Detects rapid member joins
- Triggers alert if 10+ users join in 5 minutes
- Can be used to ban raid participants

### Input Validation
- All user inputs validated before processing
- SQL injection prevention via parameterized queries
- Null byte detection

### Rate Limiting
- Dashboard API limited to 200 requests/day per IP
- Prevents abuse and DDoS attacks
- Per-endpoint rate limits

## 🗄️ Database

The bot uses SQLite for data storage:
- **guild_settings** - Server configurations
- **user_warnings** - Warning history
- **user_bans** - Ban records
- **moderation_logs** - All moderation actions
- **spam_tracker** - Spam detection data
- **raids** - Raid detection data

## 🌐 API Endpoints

### Dashboard API (running on http://localhost:5000)

```
GET  /api/stats                          - Get bot statistics
GET  /api/modlogs/<guild_id>             - Get moderation logs
GET  /api/warnings/<user_id>/<guild_id>  - Get user warnings
GET  /api/guild-settings/<guild_id>      - Get guild settings
POST /api/guild-settings/<guild_id>      - Update guild settings
GET  /health                              - Health check
```

## 🐛 Troubleshooting

### Bot doesn't respond to commands
1. Check bot has "Read Messages" and "Send Messages" permissions
2. Verify bot is online in Discord
3. Check `.env` file has correct `DISCORD_TOKEN`
4. Restart the bot: `Ctrl+C` then `python main.py`

### Dashboard won't load
1. Check if Flask app is running: `python dashboard/app.py`
2. Verify port 5000 is not in use
3. Check firewall settings

### Database errors
1. Delete `data/bot.db` to reset database
2. Bot will recreate it on startup
3. Check file permissions in `data/` folder

### Commands not loading
1. Check `cogs/` folder has `.py` files
2. Verify `async def setup(bot):` in each cog
3. Check console for error messages

## 📈 Customization

### Add New Commands

Create a new file in `cogs/`:

```python
# cogs/fun.py
import discord
from discord.ext import commands

class Fun(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
    
    @commands.command(name="joke")
    async def joke(self, ctx):
        """Tell a joke"""
        await ctx.send("Why did the Discord bot go to school? To improve its cogs! 😄")

async def setup(bot):
    await bot.add_cog(Fun(bot))
```

The bot will automatically load it!

### Custom Moderation Rules

Edit `utils/security.py` to add custom rules:

```python
def add_blocked_word(self, word):
    """Add word to blocked list"""
    self.blocked_words.append(word.lower())
```

## 📖 Additional Resources

- [discord.py Documentation](https://discordpy.readthedocs.io/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord API Documentation](https://discord.com/developers/docs/intro)

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for error messages
3. Check Discord permissions are correctly set

## ⭐ Features Coming Soon

- Reaction roles
- Custom commands
- Music player integration
- Leveling system
- Birthday announcements
- Advanced analytics
- Multi-language support

---

**Made with ❤️ for the Discord community**
