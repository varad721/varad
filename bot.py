import asyncio
import json
import os
import re
import sqlite3
import random
from datetime import datetime, timedelta
from functools import wraps

import discord
import requests
from discord.ext import commands, tasks
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for

load_dotenv()

# ==================== CONFIG ====================
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:5000/callback")
OWNER_IDS = [int(x.strip()) for x in os.getenv("OWNER_ID", "").split(",") if x.strip().isdigit()]
DB_PATH = os.getenv("DATABASE_PATH", "data/bot.db")
FLASK_SECRET = os.getenv("FLASK_SECRET", "change-me-in-production")

os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)

# Bad words for anti-swear
BAD_WORDS = ["badword1", "badword2"]  # Add your own
SPAM_THRESHOLD = 5  # Messages in 5 seconds = spam
RAID_THRESHOLD = 10  # Users joining in 10 seconds = raid

# ==================== DATABASE ====================
def db_connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db_connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id INTEGER PRIMARY KEY,
                prefix TEXT DEFAULT ',',
                welcome_enabled INTEGER DEFAULT 1,
                welcome_channel INTEGER,
                farewell_channel INTEGER,
                autorole_id INTEGER,
                mod_log_channel INTEGER,
                anti_spam INTEGER DEFAULT 1,
                anti_link INTEGER DEFAULT 1,
                anti_swear INTEGER DEFAULT 1,
                anti_raid INTEGER DEFAULT 1,
                auto_publish INTEGER DEFAULT 0,
                verification_enabled INTEGER DEFAULT 0,
                verification_role INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                guild_id INTEGER NOT NULL,
                reason TEXT NOT NULL,
                moderator_id INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS mod_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                moderator_id INTEGER NOT NULL,
                reason TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_levels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                guild_id INTEGER NOT NULL,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                UNIQUE(user_id, guild_id)
            );

            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                creator_id INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, name)
            );

            CREATE TABLE IF NOT EXISTS giveaways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                channel_id INTEGER NOT NULL,
                message_id INTEGER,
                prize TEXT NOT NULL,
                host_id INTEGER NOT NULL,
                winners INTEGER DEFAULT 1,
                end_time TEXT NOT NULL,
                ended INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                channel_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                remind_at TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS invites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                uses INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                suggestion TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                channel_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                status TEXT DEFAULT 'open',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS birthdays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                guild_id INTEGER NOT NULL,
                birthday TEXT NOT NULL,
                UNIQUE(user_id, guild_id)
            );

            CREATE TABLE IF NOT EXISTS auto_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                trigger TEXT NOT NULL,
                response TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)

def ensure_guild(guild_id):
    with db_connect() as conn:
        conn.execute("INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)", (guild_id,))

def get_settings(guild_id):
    ensure_guild(guild_id)
    with db_connect() as conn:
        return conn.execute("SELECT * FROM guild_settings WHERE guild_id = ?", (guild_id,)).fetchone()

# ==================== BOT SETUP ====================
intents = discord.Intents.all()
intents.message_content = True

async def get_prefix(bot, message):
    if not message.guild:
        return ","
    settings = get_settings(message.guild.id)
    return settings["prefix"] or ","

bot = commands.Bot(command_prefix=get_prefix, intents=intents, help_command=None)
init_db()

# ==================== HELPERS ====================
def is_mod(ctx):
    return ctx.author.id in OWNER_IDS or ctx.author.guild_permissions.administrator

def add_modlog(guild_id, action, user_id, moderator_id, reason):
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO mod_logs (guild_id, action, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (guild_id, action, user_id, moderator_id, reason, datetime.utcnow().isoformat())
        )

spam_cache = {}
raid_cache = {}

# ==================== BOT EVENTS ====================
@bot.event
async def on_ready():
    for guild in bot.guilds:
        ensure_guild(guild.id)
    print(f"Bot logged in as {bot.user}")
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.listening, name=",help"))

@bot.event
async def on_member_join(member):
    settings = get_settings(member.guild.id)
    
    # Auto role
    if settings["autorole_id"]:
        role = member.guild.get_role(settings["autorole_id"])
        if role:
            try:
                await member.add_roles(role)
            except:
                pass
    
    # Greeting
    if settings["welcome_enabled"] and settings["welcome_channel"]:
        channel = member.guild.get_channel(settings["welcome_channel"])
        if channel:
            embed = discord.Embed(title="Welcome!", description=f"Welcome {member.mention} to {member.guild.name}!", color=discord.Color.green())
            embed.set_thumbnail(url=member.display_avatar.url)
            try:
                await channel.send(embed=embed)
            except:
                pass
    
    # Anti-raid detection
    guild_id = member.guild.id
    if guild_id not in raid_cache:
        raid_cache[guild_id] = []
    
    raid_cache[guild_id].append(datetime.utcnow())
    raid_cache[guild_id] = [t for t in raid_cache[guild_id] if (datetime.utcnow() - t).seconds < 10]
    
    if len(raid_cache[guild_id]) > RAID_THRESHOLD:
        try:
            await member.ban(reason="Raid protection")
        except:
            pass

@bot.event
async def on_member_remove(member):
    settings = get_settings(member.guild.id)
    
    # Farewell message
    if settings["farewell_channel"]:
        channel = member.guild.get_channel(settings["farewell_channel"])
        if channel:
            embed = discord.Embed(title="Goodbye!", description=f"{member.mention} has left.", color=discord.Color.red())
            try:
                await channel.send(embed=embed)
            except:
                pass

@bot.event
async def on_message(message):
    if message.author.bot or not message.guild:
        return
    
    settings = get_settings(message.guild.id)
    
    # Anti-spam
    if settings["anti_spam"]:
        user_id = message.author.id
        if user_id not in spam_cache:
            spam_cache[user_id] = []
        spam_cache[user_id].append(datetime.utcnow())
        spam_cache[user_id] = [t for t in spam_cache[user_id] if (datetime.utcnow() - t).seconds < 5]
        
        if len(spam_cache[user_id]) > SPAM_THRESHOLD:
            try:
                await message.author.timeout(timedelta(minutes=10), reason="Spam")
                await message.channel.send(f"⏱️ {message.author.mention} timed out for spam")
                add_modlog(message.guild.id, "SPAM", message.author.id, bot.user.id, "Auto-spam")
            except:
                pass
    
    # Anti-link
    if settings["anti_link"]:
        if re.search(r'(https?://|www\.)', message.content):
            if not message.author.guild_permissions.manage_messages:
                try:
                    await message.delete()
                    await message.channel.send(f"❌ {message.author.mention}, links are not allowed here")
                except:
                    pass
    
    # Anti-swear
    if settings["anti_swear"]:
        for word in BAD_WORDS:
            if word.lower() in message.content.lower():
                try:
                    await message.delete()
                    await message.channel.send(f"⚠️ {message.author.mention}, watch your language!")
                except:
                    pass
    
    # Auto-publish (news channels)
    if settings["auto_publish"] and message.channel.type == discord.ChannelType.news:
        try:
            await message.publish()
        except:
            pass
    
    # XP gain
    with db_connect() as conn:
        conn.execute("INSERT OR IGNORE INTO user_levels (user_id, guild_id) VALUES (?, ?)", (message.author.id, message.guild.id))
        row = conn.execute("SELECT xp, level FROM user_levels WHERE user_id = ? AND guild_id = ?", (message.author.id, message.guild.id)).fetchone()
        new_xp = row["xp"] + 5
        new_level = row["level"]
        xp_needed = new_level * 100
        while new_xp >= xp_needed:
            new_xp -= xp_needed
            new_level += 1
            xp_needed = new_level * 100
        conn.execute("UPDATE user_levels SET xp = ?, level = ? WHERE user_id = ? AND guild_id = ?", (new_xp, new_level, message.author.id, message.guild.id))
    
    # Auto-responses
    with db_connect() as conn:
        triggers = conn.execute("SELECT trigger, response FROM auto_responses WHERE guild_id = ?", (message.guild.id,)).fetchall()
    
    for trigger_row in triggers:
        if trigger_row["trigger"].lower() in message.content.lower():
            try:
                await message.reply(trigger_row["response"])
            except:
                pass
    
    await bot.process_commands(message)

# ==================== MODERATION ====================
@bot.command(name="warn")
@commands.check(is_mod)
async def warn(ctx, member: discord.Member, *, reason="No reason"):
    if member.bot:
        return await ctx.send("Cannot warn bots.")
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO warnings (user_id, guild_id, reason, moderator_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (member.id, ctx.guild.id, reason, ctx.author.id, datetime.utcnow().isoformat())
        )
        count = conn.execute("SELECT COUNT(*) FROM warnings WHERE user_id = ? AND guild_id = ?", (member.id, ctx.guild.id)).fetchone()[0]
    add_modlog(ctx.guild.id, "WARN", member.id, ctx.author.id, reason)
    await ctx.send(f"⚠️ {member.mention} warned (Total: {count})")

@bot.command(name="unwarn")
@commands.check(is_mod)
async def unwarn(ctx, member: discord.Member):
    with db_connect() as conn:
        row = conn.execute("SELECT id FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY id DESC LIMIT 1", (member.id, ctx.guild.id)).fetchone()
        if not row:
            return await ctx.send(f"{member.mention} has no warnings.")
        conn.execute("DELETE FROM warnings WHERE id = ?", (row["id"],))
    await ctx.send(f"✅ Removed warning from {member.mention}")

@bot.command(name="warnings")
async def warnings_cmd(ctx, member: discord.Member = None):
    member = member or ctx.author
    with db_connect() as conn:
        rows = conn.execute("SELECT reason, moderator_id, created_at FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY id DESC LIMIT 10", (member.id, ctx.guild.id)).fetchall()
    if not rows:
        return await ctx.send(f"{member.mention} has no warnings.")
    embed = discord.Embed(title=f"Warnings - {member}", color=discord.Color.orange())
    for i, row in enumerate(rows, 1):
        embed.add_field(name=f"#{i}", value=f"{row['reason']}\n<@{row['moderator_id']}> • {row['created_at'][:10]}", inline=False)
    await ctx.send(embed=embed)

@bot.command(name="kick")
@commands.check(is_mod)
async def kick(ctx, member: discord.Member, *, reason="No reason"):
    await member.kick(reason=reason)
    add_modlog(ctx.guild.id, "KICK", member.id, ctx.author.id, reason)
    await ctx.send(f"👢 Kicked {member.mention}")

@bot.command(name="ban")
@commands.check(is_mod)
async def ban(ctx, member: discord.Member, *, reason="No reason"):
    await member.ban(reason=reason)
    add_modlog(ctx.guild.id, "BAN", member.id, ctx.author.id, reason)
    await ctx.send(f"🚫 Banned {member.mention}")

@bot.command(name="unban")
@commands.check(is_mod)
async def unban(ctx, user_id: int):
    try:
        user = await bot.fetch_user(user_id)
        await ctx.guild.unban(user)
        await ctx.send(f"✅ Unbanned {user}")
    except:
        await ctx.send("User not found or not banned")

@bot.command(name="mute")
@commands.check(is_mod)
async def mute(ctx, member: discord.Member, duration="10m", *, reason="No reason"):
    match = re.fullmatch(r"(\d+)([smhd])", duration.lower())
    if not match:
        return await ctx.send("Format: `,mute @user 10m reason`")
    seconds = int(match.group(1)) * {"s": 1, "m": 60, "h": 3600, "d": 86400}[match.group(2)]
    seconds = min(seconds, 28 * 86400)
    await member.timeout(discord.utils.utcnow() + timedelta(seconds=seconds), reason=reason)
    add_modlog(ctx.guild.id, "MUTE", member.id, ctx.author.id, reason)
    await ctx.send(f"⏱️ Muted {member.mention} for {duration}")

@bot.command(name="unmute")
@commands.check(is_mod)
async def unmute(ctx, member: discord.Member):
    await member.timeout(None)
    add_modlog(ctx.guild.id, "UNMUTE", member.id, ctx.author.id, "Unmuted")
    await ctx.send(f"✅ Unmuted {member.mention}")

@bot.command(name="purge")
@commands.check(is_mod)
async def purge(ctx, amount: int = 10):
    amount = max(1, min(amount, 100))
    deleted = await ctx.channel.purge(limit=amount)
    await ctx.send(f"🧹 Deleted {len(deleted)} messages", delete_after=5)

# ==================== ROLES ====================
@bot.command(name="roleall")
@commands.check(is_mod)
async def roleall(ctx, role: discord.Role):
    count = 0
    async with ctx.typing():
        for member in ctx.guild.members:
            if not member.bot and role not in member.roles:
                try:
                    await member.add_roles(role)
                    count += 1
                except:
                    pass
    await ctx.send(f"✅ Added {role.mention} to {count} members")

@bot.command(name="unroleall")
@commands.check(is_mod)
async def unroleall(ctx, role: discord.Role):
    count = 0
    async with ctx.typing():
        for member in ctx.guild.members:
            if role in member.roles:
                try:
                    await member.remove_roles(role)
                    count += 1
                except:
                    pass
    await ctx.send(f"✅ Removed {role.mention} from {count} members")

@bot.command(name="autorole")
@commands.check(is_mod)
async def autorole(ctx, role: discord.Role = None):
    with db_connect() as conn:
        if role:
            conn.execute("UPDATE guild_settings SET autorole_id = ? WHERE guild_id = ?", (role.id, ctx.guild.id))
            await ctx.send(f"✅ Autorole set to {role.mention}")
        else:
            conn.execute("UPDATE guild_settings SET autorole_id = NULL WHERE guild_id = ?", (ctx.guild.id,))
            await ctx.send("✅ Autorole disabled")

# ==================== GIVEAWAY ====================
@bot.command(name="giveaway")
@commands.check(is_mod)
async def giveaway(ctx, duration: str, winners: int = 1, *, prize: str):
    match = re.fullmatch(r"(\d+)([smhd])", duration.lower())
    if not match:
        return await ctx.send("Format: `,giveaway 1d 1 Prize`")
    seconds = int(match.group(1)) * {"s": 1, "m": 60, "h": 3600, "d": 86400}[match.group(2)]
    end_time = (datetime.utcnow() + timedelta(seconds=seconds)).isoformat()
    
    embed = discord.Embed(title="🎉 GIVEAWAY", description=f"Prize: **{prize}**\nWinners: {winners}", color=discord.Color.gold())
    embed.set_footer(text=f"Ends in {duration}")
    msg = await ctx.send(embed=embed)
    await msg.add_reaction("🎉")
    
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO giveaways (guild_id, channel_id, message_id, prize, host_id, winners, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (ctx.guild.id, ctx.channel.id, msg.id, prize, ctx.author.id, winners, end_time)
        )

# ==================== UTILITY ====================
@bot.command(name="tag")
async def tag(ctx, name: str = None, *, content: str = None):
    if name and content:
        with db_connect() as conn:
            try:
                conn.execute("INSERT INTO tags (guild_id, name, content, creator_id) VALUES (?, ?, ?, ?)", (ctx.guild.id, name, content, ctx.author.id))
                await ctx.send(f"✅ Tag `{name}` created")
            except:
                await ctx.send(f"Tag `{name}` already exists")
    elif name:
        with db_connect() as conn:
            row = conn.execute("SELECT content FROM tags WHERE guild_id = ? AND name = ?", (ctx.guild.id, name)).fetchone()
        if row:
            await ctx.send(row["content"])
        else:
            await ctx.send(f"❌ Tag `{name}` not found")
    else:
        await ctx.send("Usage: `,tag name content` or `,tag name`")

@bot.command(name="autoresponse")
@commands.check(is_mod)
async def autoresponse(ctx, trigger: str, *, response: str):
    with db_connect() as conn:
        try:
            conn.execute("INSERT INTO auto_responses (guild_id, trigger, response) VALUES (?, ?, ?)", (ctx.guild.id, trigger, response))
            await ctx.send(f"✅ Auto-response created: `{trigger}` → `{response}`")
        except:
            await ctx.send("Auto-response already exists")

@bot.command(name="prefix")
@commands.check(is_mod)
async def prefix_cmd(ctx, new_prefix: str = None):
    if not new_prefix:
        settings = get_settings(ctx.guild.id)
        return await ctx.send(f"Current prefix: `{settings['prefix']}`")
    if len(new_prefix) > 5:
        return await ctx.send("Prefix must be ≤5 characters")
    with db_connect() as conn:
        conn.execute("UPDATE guild_settings SET prefix = ? WHERE guild_id = ?", (new_prefix, ctx.guild.id))
    await ctx.send(f"✅ Prefix changed to `{new_prefix}`")

@bot.command(name="suggestion")
async def suggestion(ctx, *, text: str):
    with db_connect() as conn:
        conn.execute("INSERT INTO suggestions (guild_id, user_id, suggestion) VALUES (?, ?, ?)", (ctx.guild.id, ctx.author.id, text))
    await ctx.send("✅ Suggestion submitted!")

@bot.command(name="userinfo")
async def userinfo(ctx, member: discord.Member = None):
    member = member or ctx.author
    embed = discord.Embed(title=f"User Info - {member}", color=member.color)
    embed.add_field(name="ID", value=member.id, inline=False)
    embed.add_field(name="Created", value=member.created_at.strftime("%d/%m/%Y"), inline=True)
    embed.add_field(name="Joined", value=member.joined_at.strftime("%d/%m/%Y") if member.joined_at else "Unknown", inline=True)
    embed.add_field(name="Roles", value=len(member.roles)-1, inline=True)
    embed.set_thumbnail(url=member.display_avatar.url)
    await ctx.send(embed=embed)

@bot.command(name="serverinfo")
async def serverinfo(ctx):
    embed = discord.Embed(title=f"Server Info - {ctx.guild.name}", color=discord.Color.blue())
    embed.add_field(name="Members", value=ctx.guild.member_count, inline=True)
    embed.add_field(name="Channels", value=len(ctx.guild.channels), inline=True)
    embed.add_field(name="Roles", value=len(ctx.guild.roles), inline=True)
    embed.add_field(name="Owner", value=f"<@{ctx.guild.owner_id}>", inline=False)
    embed.add_field(name="Created", value=ctx.guild.created_at.strftime("%d/%m/%Y"), inline=True)
    embed.set_thumbnail(url=ctx.guild.icon.url if ctx.guild.icon else "")
    await ctx.send(embed=embed)

@bot.command(name="level")
async def level(ctx, member: discord.Member = None):
    member = member or ctx.author
    with db_connect() as conn:
        row = conn.execute("SELECT level, xp FROM user_levels WHERE user_id = ? AND guild_id = ?", (member.id, ctx.guild.id)).fetchone()
    if not row:
        return await ctx.send(f"{member.mention} is Level 1 (0 XP)")
    xp_needed = row["level"] * 100
    embed = discord.Embed(title=f"Level - {member}", color=discord.Color.gold())
    embed.add_field(name="Level", value=row["level"], inline=True)
    embed.add_field(name="XP", value=f"{row['xp']}/{xp_needed}", inline=True)
    embed.set_thumbnail(url=member.display_avatar.url)
    await ctx.send(embed=embed)

@bot.command(name="leaderboard")
async def leaderboard(ctx):
    with db_connect() as conn:
        rows = conn.execute("SELECT user_id, level, xp FROM user_levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT 10", (ctx.guild.id,)).fetchall()
    if not rows:
        return await ctx.send("No leveled users yet")
    embed = discord.Embed(title=f"Leaderboard - {ctx.guild.name}", color=discord.Color.gold())
    for i, row in enumerate(rows, 1):
        user = bot.get_user(row["user_id"]) or f"User {row['user_id']}"
        embed.add_field(name=f"#{i} - Level {row['level']}", value=f"{user} ({row['xp']} XP)", inline=False)
    await ctx.send(embed=embed)

@bot.command(name="poll")
async def poll(ctx, *, question):
    embed = discord.Embed(title="📊 Poll", description=question, color=discord.Color.blue())
    msg = await ctx.send(embed=embed)
    await msg.add_reaction("✅")
    await msg.add_reaction("❌")

@bot.command(name="remind")
async def remind(ctx, duration: str, *, reminder: str):
    match = re.fullmatch(r"(\d+)([smhd])", duration.lower())
    if not match:
        return await ctx.send("Format: `,remind 1d Your reminder`")
    seconds = int(match.group(1)) * {"s": 1, "m": 60, "h": 3600, "d": 86400}[match.group(2)]
    remind_at = (datetime.utcnow() + timedelta(seconds=seconds)).isoformat()
    
    with db_connect() as conn:
        conn.execute("INSERT INTO reminders (user_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?)", (ctx.author.id, ctx.channel.id, reminder, remind_at))
    await ctx.send(f"⏰ Reminder set for {duration}")

@bot.command(name="help")
async def help_cmd(ctx):
    embed = discord.Embed(title="📚 Bot Commands", color=discord.Color.blurple())
    embed.add_field(name="📋 Moderation", value="`warn unwarn warnings kick ban unban mute unmute purge`", inline=False)
    embed.add_field(name="👥 Roles", value="`roleall unroleall autorole`", inline=False)
    embed.add_field(name="🎉 Fun", value="`giveaway poll`", inline=False)
    embed.add_field(name="🏷️ Utility", value="`tag autoresponse prefix userinfo serverinfo level leaderboard remind suggestion`", inline=False)
    embed.add_field(name="⚙️ Settings", value="`prefix` (more in dashboard)", inline=False)
    await ctx.send(embed=embed)

# ==================== FLASK OAUTH ====================
app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = FLASK_SECRET

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper

@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/auth")
def auth():
    oauth_url = f"https://discord.com/api/oauth2/authorize?client_id={DISCORD_CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify%20guilds"
    return redirect(oauth_url)

@app.route("/callback")
def callback():
    code = request.args.get("code")
    if not code:
        return redirect(url_for("login"))
    
    data = {
        "client_id": DISCORD_CLIENT_ID,
        "client_secret": DISCORD_CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "scope": "identify guilds"
    }
    
    response = requests.post("https://discord.com/api/v10/oauth2/token", data=data)
    if response.status_code != 200:
        return redirect(url_for("login"))
    
    token_data = response.json()
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    user_response = requests.get("https://discord.com/api/v10/users/@me", headers=headers)
    user_data = user_response.json()
    
    session["user_id"] = user_data["id"]
    session["username"] = user_data["username"]
    session["avatar"] = user_data.get("avatar", "")
    
    return redirect(url_for("dashboard"))

@app.route("/dashboard")
@login_required
def dashboard():
    user_id = session.get("user_id")
    guilds = []
    for guild in bot.guilds:
        member = guild.get_member(int(user_id))
        if member and (member.guild_permissions.administrator or member.id == guild.owner_id):
            guilds.append({"id": guild.id, "name": guild.name, "icon": guild.icon.url if guild.icon else ""})
    
    return render_template("dashboard.html", username=session.get("username"), guilds=json.dumps(guilds))

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/api/guild/<int:guild_id>")
@login_required
def api_guild(guild_id):
    guild = bot.get_guild(guild_id)
    if not guild:
        return jsonify({"error": "Guild not found"}), 404
    
    settings = get_settings(guild_id)
    members = len([m for m in guild.members if not m.bot])
    
    return jsonify({
        "id": guild.id,
        "name": guild.name,
        "members": members,
        "channels": len(guild.channels),
        "roles": len(guild.roles),
        "prefix": settings["prefix"],
        "autorole": settings["autorole_id"],
        "anti_spam": settings["anti_spam"],
        "anti_link": settings["anti_link"],
        "anti_swear": settings["anti_swear"]
    })

@app.route("/api/guild/<int:guild_id>/members")
@login_required
def api_members(guild_id):
    guild = bot.get_guild(guild_id)
    if not guild:
        return jsonify([]), 404
    
    search = request.args.get("search", "").lower()
    limit = min(request.args.get("limit", 50, type=int), 100)
    
    members = []
    for member in guild.members[:500]:
        if member.bot:
            continue
        if search and search not in member.name.lower():
            continue
        members.append({
            "id": member.id,
            "name": member.name,
            "avatar": str(member.display_avatar.url),
            "roles": len(member.roles)
        })
        if len(members) >= limit:
            break
    
    return jsonify(members)

@app.route("/api/guild/<int:guild_id>/settings", methods=["POST"])
@login_required
def api_update_settings(guild_id):
    data = request.get_json() or {}
    with db_connect() as conn:
        conn.execute(
            "UPDATE guild_settings SET prefix = ?, anti_spam = ?, anti_link = ?, anti_swear = ?, auto_publish = ? WHERE guild_id = ?",
            (data.get("prefix", ","), data.get("anti_spam", 1), data.get("anti_link", 1), data.get("anti_swear", 1), data.get("auto_publish", 0), guild_id)
        )
    return jsonify({"status": "success"})

def run_flask():
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=False)

if __name__ == "__main__":
    if not DISCORD_TOKEN:
        raise SystemExit("DISCORD_TOKEN not set")
    
    import threading
    threading.Thread(target=run_flask, daemon=True).start()
    print("Dashboard: http://localhost:5000")
    bot.run(DISCORD_TOKEN)
