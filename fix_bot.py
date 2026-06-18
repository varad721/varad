import re

with open('bot.py', 'r') as f:
    content = f.read()

# Fix 1: Remove updated_at from query
content = content.replace(
    'conn.execute("UPDATE user_levels SET xp = ?, level = ?, updated_at = ? WHERE user_id = ? AND guild_id = ?", (current_xp, new_level, datetime.utcnow().isoformat(), user_id, guild_id))',
    'conn.execute("UPDATE user_levels SET xp = ?, level = ? WHERE user_id = ? AND guild_id = ?", (current_xp, new_level, user_id, guild_id))'
)

with open('bot.py', 'w') as f:
    f.write(content)

print("Fixed bot.py")
