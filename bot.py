import asyncio
import io
import json
import math
import os
import random
import re
import shutil
import sqlite3
import threading
from datetime import datetime, timedelta
from functools import wraps

import discord
import requests
from discord.ext import commands
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None

load_dotenv()

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
OWNER_IDS = [int(item.strip()) for item in os.getenv("OWNER_ID", "").split(",") if item.strip().isdigit()]
DEFAULT_PREFIX = os.getenv("DEFAULT_PREFIX", ",")
DB_PATH = os.getenv("DATABASE_PATH", "data/bot.db")
FLASK_SECRET = os.getenv("DASHBOARD_SECRET", "change-this-dashboard-secret")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_FALLBACK_MODELS = [
    item.strip()
    for item in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-1.5-flash-8b,gemini-2.0-flash").split(",")
    if item.strip()
]

os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)


def db_connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db_connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id INTEGER PRIMARY KEY,
                prefix TEXT DEFAULT ',',
                welcome_enabled INTEGER DEFAULT 1,
                welcome_channel INTEGER,
                welcome_message TEXT DEFAULT 'Welcome {member} to {server}! You are member #{count}.',
                mod_log_channel INTEGER,
                raid_protection_enabled INTEGER DEFAULT 0,
                raid_threshold INTEGER DEFAULT 5,
                mass_mention_block INTEGER DEFAULT 1,
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

            CREATE TABLE IF NOT EXISTS snipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER NOT NULL,
                content TEXT,
                author_id INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS raid_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                trigger TEXT,
                locked_channels INTEGER,
                banned_users INTEGER,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS warning_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                role_id INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS dashboard_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                level TEXT DEFAULT 'INFO',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_levels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                guild_id INTEGER NOT NULL,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, guild_id)
            );

            CREATE TABLE IF NOT EXISTS level_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                level INTEGER NOT NULL,
                role_id INTEGER NOT NULL,
                gif_perm INTEGER DEFAULT 0,
                sticker_perm INTEGER DEFAULT 0,
                emoji_perm INTEGER DEFAULT 0,
                attachment_perm INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, level)
            );
            """
        )


def ensure_guild(guild_id):
    with db_connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO guild_settings (guild_id, prefix) VALUES (?, ?)",
            (guild_id, DEFAULT_PREFIX),
        )


def get_settings(guild_id):
    ensure_guild(guild_id)
    with db_connect() as conn:
        return conn.execute("SELECT * FROM guild_settings WHERE guild_id = ?", (guild_id,)).fetchone()


def add_modlog(guild_id, action, user_id, moderator_id, reason):
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO mod_logs (guild_id, action, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (guild_id, action, user_id, moderator_id, reason, datetime.utcnow().isoformat()),
        )


def add_dashboard_log(guild_id, message, level="INFO"):
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO dashboard_logs (guild_id, message, level, created_at) VALUES (?, ?, ?, ?)",
            (guild_id, message, level, datetime.utcnow().isoformat()),
        )
        conn.execute("DELETE FROM dashboard_logs WHERE id NOT IN (SELECT id FROM dashboard_logs ORDER BY id DESC LIMIT 500)")


def add_xp(user_id, guild_id, xp_amount=5):
    with db_connect() as conn:
        conn.execute("INSERT OR IGNORE INTO user_levels (user_id, guild_id, xp, level) VALUES (?, ?, 0, 1)", (user_id, guild_id))
        row = conn.execute("SELECT xp, level FROM user_levels WHERE user_id = ? AND guild_id = ?", (user_id, guild_id)).fetchone()
        if not row:
            return None
        current_xp = row[0] + xp_amount
        current_level = row[1]
        xp_required = current_level * 100
        new_level = current_level
        while current_xp >= xp_required:
            current_xp -= xp_required
            new_level += 1
            xp_required = new_level * 100
        conn.execute("UPDATE user_levels SET xp = ?, level = ? WHERE user_id = ? AND guild_id = ?", (current_xp, new_level, user_id, guild_id))
        return {"old_level": current_level, "new_level": new_level, "leveled_up": new_level > current_level}


async def assign_level_role(member, guild_id, new_level):
    try:
        with db_connect() as conn:
            role_row = conn.execute("SELECT role_id FROM level_roles WHERE guild_id = ? AND level = ?", (guild_id, new_level)).fetchone()
        if role_row:
            role = member.guild.get_role(role_row[0])
            if role:
                await member.add_roles(role)
                add_dashboard_log(guild_id, f"Assigned Level {new_level} role to {member}")
    except:
        pass


async def get_prefix(bot, message):
    if not message.guild:
        return commands.when_mentioned_or(DEFAULT_PREFIX)(bot, message)
    settings = get_settings(message.guild.id)
    return commands.when_mentioned_or(settings["prefix"] or DEFAULT_PREFIX)(bot, message)


intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.guilds = True
intents.voice_states = True

bot = commands.Bot(command_prefix=get_prefix, intents=intents, help_command=None)
init_db()

music_queues = {}
music_now = {}
music_repeat = {}
music_volume = {}

YTDL_OPTIONS = {
    "format": "bestaudio[ext=m4a]/bestaudio[acodec!=none]/best[acodec!=none]/best",
    "noplaylist": True,
    "quiet": True,
    "default_search": "ytsearch",
    "source_address": "0.0.0.0",
    "extractor_args": {"youtube": {"player_client": ["android_vr", "web"]}},
}

FFMPEG_OPTIONS = {
    "before_options": "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5",
    "options": "-vn",
}


def ffmpeg_executable():
    found = shutil.which("ffmpeg")
    if found:
        return found
    if imageio_ffmpeg:
        return imageio_ffmpeg.get_ffmpeg_exe()
    return "ffmpeg"


def is_mod(ctx):
    perms = ctx.author.guild_permissions
    return ctx.author.id in OWNER_IDS or perms.manage_messages or perms.administrator


def can_warn(ctx):
    if is_mod(ctx):
        return True
    with db_connect() as conn:
        for role_id in [r.id for r in ctx.author.roles]:
            row = conn.execute(
                "SELECT id FROM warning_roles WHERE guild_id = ? AND role_id = ?",
                (ctx.guild.id, role_id),
            ).fetchone()
            if row:
                return True
    return False


def owner_or_mod():
    async def predicate(ctx):
        return is_mod(ctx)
    return commands.check(predicate)


def format_welcome(template, member):
    return template.format(
        member=member.mention,
        user=member.name,
        server=member.guild.name,
        count=member.guild.member_count,
    )


@bot.event
async def on_ready():
    for guild in bot.guilds:
        ensure_guild(guild.id)
    print(f"Bot logged in as {bot.user} ({bot.user.id})")
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.listening, name=f"{DEFAULT_PREFIX}help"))


@bot.event
async def on_member_join(member):
    settings = get_settings(member.guild.id)
    if not settings["welcome_enabled"]:
        return
    channel = member.guild.get_channel(settings["welcome_channel"]) if settings["welcome_channel"] else None
    if not channel:
        channel = discord.utils.get(member.guild.text_channels, name="welcome") or discord.utils.get(member.guild.text_channels, name="general")
    if not channel:
        return
    embed = discord.Embed(
        title="Welcome!",
        description=format_welcome(settings["welcome_message"], member),
        color=discord.Color.green(),
    )
    embed.set_thumbnail(url=member.display_avatar.url)
    await channel.send(content=member.mention, embed=embed)


@bot.event
async def on_message_delete(message):
    if message.author.bot:
        return
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO snipes (channel_id, content, author_id, created_at) VALUES (?, ?, ?, ?)",
            (message.channel.id, message.content or "[embed/attachment]", message.author.id, datetime.utcnow().isoformat()),
        )
        conn.execute("DELETE FROM snipes WHERE id NOT IN (SELECT id FROM snipes ORDER BY id DESC LIMIT 200)")


def is_mod_context(message):
    if message.author.id in OWNER_IDS:
        return True
    perms = message.author.guild_permissions
    return perms.manage_messages or perms.administrator


@bot.event
async def on_message(message):
    if message.author.bot:
        return
    if message.guild:
        settings = get_settings(message.guild.id)
        if settings["mass_mention_block"]:
            if ("@everyone" in message.content or "@here" in message.content) and not is_mod_context(message):
                try:
                    await message.delete()
                    await message.author.send(f"Mass mentions are blocked in {message.guild.name}.")
                except:
                    pass
        result = add_xp(message.author.id, message.guild.id, 5)
        if result and result["leveled_up"]:
            try:
                embed = discord.Embed(title=f"Level Up!", description=f"{message.author.mention} reached **Level {result['new_level']}**!", color=discord.Color.gold())
                await message.channel.send(embed=embed)
                await assign_level_role(message.author, message.guild.id, result['new_level'])
            except:
                pass
    await bot.process_commands(message)


@bot.command(name="help", aliases=["h", "cmds", "commands"])
async def help_command(ctx):
    prefix = get_settings(ctx.guild.id)["prefix"] if ctx.guild else DEFAULT_PREFIX
    embed = discord.Embed(title="Bot Commands", color=discord.Color.blurple())
    embed.add_field(
        name="Moderation",
        value=(
            f"`{prefix}w @user reason` warn\n"
            f"`{prefix}uw @user` unwarn\n"
            f"`{prefix}wl [@user]` warnings\n"
            f"`{prefix}k @user reason` kick\n"
            f"`{prefix}b @user reason` ban\n"
            f"`{prefix}mute @user 10m reason` timeout\n"
            f"`{prefix}unmute @user` remove timeout\n"
            f"`{prefix}raid` lockdown\n"
            f"`{prefix}unlockall` unlock all channels"
        ),
        inline=False,
    )
    embed.add_field(name="Setup", value=f"`{prefix}prefix !` `{prefix}welcome #ch msg`", inline=False)
    embed.add_field(name="Music", value=f"`{prefix}play song` `{prefix}skip` `{prefix}queue`", inline=False)
    embed.add_field(name="Use Dashboard", value="Full management at http://localhost:5000", inline=False)
    await ctx.send(embed=embed)


@bot.command(name="ping")
async def ping(ctx):
    await ctx.send(embed=discord.Embed(title="Pong", description=f"{round(bot.latency * 1000)} ms", color=discord.Color.green()))


@bot.command(name="prefix")
@owner_or_mod()
async def prefix_cmd(ctx, new_prefix: str = None):
    if not new_prefix:
        return await ctx.send(f"Current prefix: `{get_settings(ctx.guild.id)['prefix']}`")
    if len(new_prefix) > 5:
        return await ctx.send("Prefix must be 5 characters or fewer.")
    with db_connect() as conn:
        conn.execute("UPDATE guild_settings SET prefix = ? WHERE guild_id = ?", (new_prefix, ctx.guild.id))
    await ctx.send(f"Prefix updated to `{new_prefix}`")


@bot.command(name="welcome")
@owner_or_mod()
async def welcome(ctx, channel: discord.TextChannel = None, *, message: str = None):
    channel = channel or ctx.channel
    message = message or "Welcome {member} to {server}! You are member #{count}."
    with db_connect() as conn:
        conn.execute(
            "UPDATE guild_settings SET welcome_enabled = 1, welcome_channel = ?, welcome_message = ? WHERE guild_id = ?",
            (channel.id, message, ctx.guild.id),
        )
    await ctx.send(f"Welcome messages enabled in {channel.mention}.")


@bot.command(name="w", aliases=["warn"])
async def warn(ctx, member: discord.Member, *, reason="No reason"):
    if not can_warn(ctx):
        return await ctx.send("You don't have permission to warn.")
    if member.bot or member == ctx.author:
        return await ctx.send("Cannot warn that member.")
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO warnings (user_id, guild_id, reason, moderator_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (member.id, ctx.guild.id, reason, ctx.author.id, datetime.utcnow().isoformat()),
        )
        count = conn.execute("SELECT COUNT(*) FROM warnings WHERE user_id = ? AND guild_id = ?", (member.id, ctx.guild.id)).fetchone()[0]
    add_modlog(ctx.guild.id, "WARN", member.id, ctx.author.id, reason)
    await ctx.send(f"{member.mention} warned. Total warnings: `{count}`")


@bot.command(name="uw", aliases=["unwarn"])
@owner_or_mod()
async def unwarn(ctx, member: discord.Member):
    with db_connect() as conn:
        row = conn.execute(
            "SELECT id FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY id DESC LIMIT 1",
            (member.id, ctx.guild.id),
        ).fetchone()
        if not row:
            return await ctx.send(f"{member.mention} has no warnings.")
        conn.execute("DELETE FROM warnings WHERE id = ?", (row["id"],))
        remaining = conn.execute("SELECT COUNT(*) FROM warnings WHERE user_id = ? AND guild_id = ?", (member.id, ctx.guild.id)).fetchone()[0]
    add_modlog(ctx.guild.id, "UNWARN", member.id, ctx.author.id, "Removed warning")
    await ctx.send(f"Removed warning from {member.mention}. Remaining: `{remaining}`")


@bot.command(name="wl", aliases=["warnings"])
async def warnings(ctx, member: discord.Member = None):
    member = member or ctx.author
    with db_connect() as conn:
        rows = conn.execute(
            "SELECT reason, moderator_id, created_at FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY id DESC LIMIT 10",
            (member.id, ctx.guild.id),
        ).fetchall()
    if not rows:
        return await ctx.send(f"{member.mention} has no warnings.")
    embed = discord.Embed(title=f"Warnings for {member}", color=discord.Color.orange())
    for index, row in enumerate(rows, 1):
        embed.add_field(
            name=f"#{index}",
            value=f"{row['reason']}\nBy: <@{row['moderator_id']}> • {row['created_at'][:10]}",
            inline=False,
        )
    await ctx.send(embed=embed)


@bot.command(name="p", aliases=["purge", "clear"])
@owner_or_mod()
async def purge(ctx, amount: int = 10):
    amount = max(1, min(amount, 100))
    deleted = await ctx.channel.purge(limit=amount + 1)
    await ctx.send(f"Deleted `{max(0, len(deleted) - 1)}` messages.", delete_after=5)


@bot.command(name="k", aliases=["kick"])
@owner_or_mod()
async def kick(ctx, member: discord.Member, *, reason="No reason"):
    await member.kick(reason=reason)
    add_modlog(ctx.guild.id, "KICK", member.id, ctx.author.id, reason)
    await ctx.send(f"Kicked {member.mention}.")


@bot.command(name="b", aliases=["ban"])
@owner_or_mod()
async def ban(ctx, member: discord.Member, *, reason="No reason"):
    await member.ban(reason=reason)
    add_modlog(ctx.guild.id, "BAN", member.id, ctx.author.id, reason)
    await ctx.send(f"Banned {member.mention}.")


@bot.command(name="mute", aliases=["timeout", "m"])
@owner_or_mod()
async def mute(ctx, member: discord.Member, duration="10m", *, reason="No reason"):
    match = re.fullmatch(r"(\d+)([smhd])", duration.lower())
    seconds = 600 if not match else int(match.group(1)) * {"s": 1, "m": 60, "h": 3600, "d": 86400}[match.group(2)]
    seconds = min(seconds, 28 * 86400)
    await member.timeout(discord.utils.utcnow() + timedelta(seconds=seconds), reason=reason)
    add_modlog(ctx.guild.id, "MUTE", member.id, ctx.author.id, reason)
    await ctx.send(f"Muted {member.mention} for `{duration}`.")


@bot.command(name="unmute", aliases=["um"])
@owner_or_mod()
async def unmute(ctx, member: discord.Member, *, reason="Unmuted"):
    await member.timeout(None, reason=reason)
    add_modlog(ctx.guild.id, "UNMUTE", member.id, ctx.author.id, reason)
    await ctx.send(f"Unmuted {member.mention}.")


@bot.command(name="raid")
@owner_or_mod()
async def raid_lockdown(ctx):
    guild = ctx.guild
    action_log = {"locked_channels": 0, "banned_users": 0}
    for channel in guild.text_channels:
        try:
            await channel.set_permissions(guild.default_role, send_messages=False)
            action_log["locked_channels"] += 1
        except:
            pass
    cutoff = datetime.utcnow() - timedelta(minutes=10)
    try:
        async for member in guild.fetch_members(limit=None):
            if member.joined_at and member.joined_at > cutoff and not member.bot:
                try:
                    await member.ban(reason="Raid protection")
                    action_log["banned_users"] += 1
                except:
                    pass
    except:
        pass
    with db_connect() as conn:
        conn.execute(
            "INSERT INTO raid_logs (guild_id, action, locked_channels, banned_users, created_at) VALUES (?, ?, ?, ?, ?)",
            (guild.id, "RAID_LOCKDOWN", action_log["locked_channels"], action_log["banned_users"], datetime.utcnow().isoformat()),
        )
    await ctx.send(f"🚨 Lockdown: `{action_log['locked_channels']}` channels locked, `{action_log['banned_users']}` users banned")


@bot.command(name="unlockall")
@owner_or_mod()
async def unlockall(ctx):
    count = 0
    for channel in ctx.guild.text_channels:
        try:
            await channel.set_permissions(ctx.guild.default_role, send_messages=None)
            count += 1
        except:
            pass
    await ctx.send(f"Unlocked `{count}` channels.")


@bot.command(name="play", aliases=["pl"])
async def play(ctx, *, query):
    if not ctx.author.voice or not ctx.author.voice.channel:
        return await ctx.send("Join a voice channel first.")
    await ctx.send("Music feature requires FFmpeg. Contact admin if not working.")


@bot.command(name="ask", aliases=["ai"])
async def ask(ctx, *, question):
    if not GEMINI_API_KEY:
        return await ctx.send("Gemini API not configured.")
    await ctx.send("AI feature available on dashboard.")


@bot.command(name="level", aliases=["lvl"])
async def level(ctx, member: discord.Member = None):
    member = member or ctx.author
    with db_connect() as conn:
        row = conn.execute("SELECT xp, level FROM user_levels WHERE user_id = ? AND guild_id = ?", (member.id, ctx.guild.id)).fetchone()
    if not row:
        return await ctx.send(f"{member.mention} is Level 1 with 0 XP.")
    xp_for_next = row[1] * 100
    embed = discord.Embed(title=f"{member.name} - Level {row[1]}", color=discord.Color.gold())
    embed.add_field(name="XP", value=f"{row[0]}/{xp_for_next}", inline=True)
    embed.set_thumbnail(url=member.display_avatar.url)
    await ctx.send(embed=embed)


@bot.command(name="leaderboard", aliases=["lb"])
async def leaderboard(ctx):
    with db_connect() as conn:
        rows = conn.execute("SELECT user_id, level, xp FROM user_levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT 10", (ctx.guild.id,)).fetchall()
    if not rows:
        return await ctx.send("No leveled users yet.")
    embed = discord.Embed(title=f"{ctx.guild.name} - Leaderboard", color=discord.Color.gold())
    for i, row in enumerate(rows, 1):
        user = bot.get_user(row[0]) or f"User {row[0]}"
        embed.add_field(name=f"#{i} - Level {row[1]}", value=f"{user} ({row[2]} XP)", inline=False)
    await ctx.send(embed=embed)


@bot.command(name="setuplevel", aliases=["setuplevels"])
@owner_or_mod()
async def setup_levels(ctx):
    """Auto-create level roles and permissions."""
    guild = ctx.guild
    levels = {5: "gif", 7: "sticker", 10: "emoji", 15: "attachment"}
    created = 0
    try:
        for level, perm in levels.items():
            role = await guild.create_role(name=f"Level {level}", reason="Auto-created by bot")
            with db_connect() as conn:
                conn.execute(
                    f"INSERT OR REPLACE INTO level_roles (guild_id, level, role_id, {perm}_perm) VALUES (?, ?, ?, 1)",
                    (guild.id, level, role.id),
                )
            created += 1
        await ctx.send(f"Created {created} level roles!")
        add_dashboard_log(guild.id, f"Created {created} level tier roles")
    except Exception as e:
        await ctx.send(f"Error: {str(e)[:100]}")


app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = FLASK_SECRET


def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper


@app.route("/")
@login_required
def dashboard():
    return render_template("dashboard.html", user_id=session.get("user_id"))


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/api/login", methods=["POST"])
def api_login():
    user_id = int((request.get_json() or {}).get("user_id", 0))
    if user_id not in OWNER_IDS:
        return jsonify({"status": "error", "message": "Not authorized"}), 401
    session["user_id"] = user_id
    return jsonify({"status": "success"})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"status": "success"})


@app.route("/api/stats")
@login_required
def api_stats():
    with db_connect() as conn:
        warnings_count = conn.execute("SELECT COUNT(*) FROM warnings").fetchone()[0]
        modlogs_count = conn.execute("SELECT COUNT(*) FROM mod_logs").fetchone()[0]
        bans = conn.execute("SELECT COUNT(*) FROM mod_logs WHERE action = 'BAN'").fetchone()[0]
        kicks = conn.execute("SELECT COUNT(*) FROM mod_logs WHERE action = 'KICK'").fetchone()[0]
    latency = bot.latency * 1000
    if math.isnan(latency) or math.isinf(latency):
        latency = 0
    return jsonify({
        "status": "success",
        "guilds": len(bot.guilds),
        "users": sum(g.member_count or 0 for g in bot.guilds),
        "warnings": warnings_count,
        "modlogs": modlogs_count,
        "bans": bans,
        "kicks": kicks,
        "latency": round(latency) if latency < 999999 else 0,
    })


@app.route("/api/guilds")
@login_required
def api_guilds():
    return jsonify({
        "status": "success",
        "guilds": [{"id": g.id, "name": g.name, "members": g.member_count} for g in bot.guilds],
    })


@app.route("/api/members/<int:guild_id>")
@login_required
def api_members(guild_id):
    guild = bot.get_guild(guild_id)
    if not guild:
        return jsonify({"status": "error"}), 404
    search = request.args.get("search", "").lower()
    limit = min(request.args.get("limit", 50, type=int), 100)
    members = []
    for member in guild.members[:500]:
        if search and search not in member.name.lower() and search not in str(member.id):
            continue
        if member.bot:
            continue
        members.append({
            "id": member.id,
            "name": member.name,
            "avatar": str(member.display_avatar.url),
            "joined_at": member.joined_at.isoformat() if member.joined_at else None,
            "is_timed_out": member.timed_out,
        })
        if len(members) >= limit:
            break
    return jsonify({"status": "success", "members": members})


@app.route("/api/member_action/<int:guild_id>/<int:user_id>", methods=["POST"])
@login_required
def api_member_action(guild_id, user_id):
    guild = bot.get_guild(guild_id)
    if not guild:
        return jsonify({"status": "error"}), 404
    data = request.get_json() or {}
    action = data.get("action", "").lower()
    reason = data.get("reason", "No reason")
    duration = data.get("duration", "10m")
    try:
        member = guild.get_member(user_id)
        if not member:
            return jsonify({"status": "error", "message": "Member not found"}), 404
        if action == "timeout":
            match = re.fullmatch(r"(\d+)([smhd])", duration.lower())
            seconds = 600 if not match else int(match.group(1)) * {"s": 1, "m": 60, "h": 3600, "d": 86400}[match.group(2)]
            asyncio.run_coroutine_threadsafe(member.timeout(discord.utils.utcnow() + timedelta(seconds=seconds), reason=reason), bot.loop).result(timeout=5)
            add_modlog(guild_id, "MUTE", user_id, session.get("user_id"), reason)
            add_dashboard_log(guild_id, f"Timed out {member} for {duration}")
            return jsonify({"status": "success", "message": f"Timed out {member}"})
        elif action == "kick":
            asyncio.run_coroutine_threadsafe(member.kick(reason=reason), bot.loop).result(timeout=5)
            add_modlog(guild_id, "KICK", user_id, session.get("user_id"), reason)
            add_dashboard_log(guild_id, f"Kicked {member}")
            return jsonify({"status": "success", "message": f"Kicked {member}"})
        elif action == "ban":
            asyncio.run_coroutine_threadsafe(member.ban(reason=reason), bot.loop).result(timeout=5)
            add_modlog(guild_id, "BAN", user_id, session.get("user_id"), reason)
            add_dashboard_log(guild_id, f"Banned {member}", level="WARNING")
            return jsonify({"status": "success", "message": f"Banned {member}"})
        elif action == "warn":
            with db_connect() as conn:
                conn.execute(
                    "INSERT INTO warnings (user_id, guild_id, reason, moderator_id, created_at) VALUES (?, ?, ?, ?, ?)",
                    (user_id, guild_id, reason, session.get("user_id"), datetime.utcnow().isoformat()),
                )
                count = conn.execute("SELECT COUNT(*) FROM warnings WHERE user_id = ? AND guild_id = ?", (user_id, guild_id)).fetchone()[0]
            add_modlog(guild_id, "WARN", user_id, session.get("user_id"), reason)
            add_dashboard_log(guild_id, f"Warned {member}")
            return jsonify({"status": "success", "message": f"Warned {member}. Total: {count}"})
        elif action == "unmute":
            asyncio.run_coroutine_threadsafe(member.timeout(None), bot.loop).result(timeout=5)
            add_modlog(guild_id, "UNMUTE", user_id, session.get("user_id"), "Unmuted")
            add_dashboard_log(guild_id, f"Unmuted {member}")
            return jsonify({"status": "success", "message": f"Unmuted {member}"})
        else:
            return jsonify({"status": "error"}), 400
    except Exception as e:
        add_dashboard_log(guild_id, f"Action failed: {str(e)[:100]}", level="ERROR")
        return jsonify({"status": "error", "message": str(e)[:100]}), 500


@app.route("/api/console_logs/<int:guild_id>")
@login_required
def api_console_logs(guild_id):
    limit = min(request.args.get("limit", 100, type=int), 500)
    with db_connect() as conn:
        rows = conn.execute(
            "SELECT * FROM dashboard_logs WHERE guild_id = ? ORDER BY id DESC LIMIT ?",
            (guild_id, limit),
        ).fetchall()
    return jsonify({
        "status": "success",
        "logs": [{"id": row["id"], "message": row["message"], "level": row["level"], "created_at": row["created_at"]} for row in rows]
    })


@app.route("/api/modlogs")
@login_required
def api_modlogs():
    limit = min(request.args.get("limit", 25, type=int), 100)
    guild_id = request.args.get("guild_id", type=int)
    with db_connect() as conn:
        if guild_id:
            rows = conn.execute("SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY id DESC LIMIT ?", (guild_id, limit)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM mod_logs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return jsonify({"status": "success", "logs": [dict(row) for row in rows]})


@app.route("/api/settings/<int:guild_id>", methods=["GET", "POST"])
@login_required
def api_settings(guild_id):
    ensure_guild(guild_id)
    if request.method == "POST":
        data = request.get_json() or {}
        with db_connect() as conn:
            conn.execute(
                "UPDATE guild_settings SET prefix = ?, welcome_enabled = ?, welcome_channel = ?, welcome_message = ?, mass_mention_block = ? WHERE guild_id = ?",
                (str(data.get("prefix", DEFAULT_PREFIX))[:5], 1 if data.get("welcome_enabled") else 0, data.get("welcome_channel"), data.get("welcome_message"), 1 if data.get("mass_mention_block") else 0, guild_id),
            )
        return jsonify({"status": "success"})
    return jsonify({"status": "success", "settings": dict(get_settings(guild_id))})


@app.route("/api/health")
def health():
    return jsonify({"status": "healthy", "bot_online": not bot.is_closed()})


@app.route("/api/leaderboard/<int:guild_id>")
@login_required
def api_leaderboard(guild_id):
    limit = min(request.args.get("limit", 50, type=int), 100)
    with db_connect() as conn:
        rows = conn.execute("SELECT user_id, level, xp FROM user_levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?", (guild_id, limit)).fetchall()
    return jsonify({"status": "success", "leaderboard": [{"user_id": row[0], "level": row[1], "xp": row[2]} for row in rows]})


@app.route("/api/level/<int:guild_id>/<int:user_id>")
@login_required
def api_user_level(guild_id, user_id):
    with db_connect() as conn:
        row = conn.execute("SELECT xp, level FROM user_levels WHERE user_id = ? AND guild_id = ?", (user_id, guild_id)).fetchone()
    if not row:
        return jsonify({"status": "success", "level": 1, "xp": 0, "xp_needed": 100})
    xp_for_next = row[1] * 100
    return jsonify({"status": "success", "level": row[1], "xp": row[0], "xp_needed": xp_for_next})



@app.route("/api/setup_levels/<int:guild_id>", methods=["POST"])
@login_required
@app.route("/api/setup_levels/<int:guild_id>", methods=["POST"])
@login_required
def api_setup_levels(guild_id):
    guild = bot.get_guild(guild_id)
    if not guild:
        return jsonify({"status": "error"}), 404
    try:
        levels = {5: "gif", 7: "sticker", 10: "emoji", 15: "attachment"}
        created = 0
        for level, perm in levels.items():
            role_future = asyncio.run_coroutine_threadsafe(
                guild.create_role(name=f"Level {level}", reason="Auto-created by bot"),
                bot.loop
            ).result(timeout=10)
            with db_connect() as conn:
                conn.execute(
                    f"INSERT OR REPLACE INTO level_roles (guild_id, level, role_id, {perm}_perm) VALUES (?, ?, ?, 1)",
                    (guild_id, level, role_future.id),
                )
            created += 1
        add_dashboard_log(guild_id, f"Created {created} level tier roles", "INFO")
        return jsonify({"status": "success", "created": created})
    except Exception as e:
        add_dashboard_log(guild_id, f"Setup levels failed: {str(e)[:100]}", "ERROR")
        return jsonify({"status": "error", "message": str(e)[:100]}), 500


def run_flask():
    app.run(host=os.getenv("DASHBOARD_HOST", "0.0.0.0"), port=int(os.getenv("DASHBOARD_PORT", "5000")), debug=False)


if __name__ == "__main__":
    if not DISCORD_TOKEN:
        raise SystemExit("DISCORD_TOKEN not set")
    if not OWNER_IDS:
        raise SystemExit("OWNER_ID not set")
    threading.Thread(target=run_flask, daemon=True).start()
    print("Starting bot and dashboard on port 5000")
    bot.run(DISCORD_TOKEN)
