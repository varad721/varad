with open('bot.py', 'r') as f:
    lines = f.readlines()

# Find the line with "def run_flask():"
insert_pos = -1
for i, line in enumerate(lines):
    if 'def run_flask():' in line:
        insert_pos = i
        break

if insert_pos > 0:
    new_code = '''
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


'''
    lines.insert(insert_pos, new_code)
    
    with open('bot.py', 'w') as f:
        f.writelines(lines)
    
    print("Successfully added setup_levels endpoint")
else:
    print("Could not find run_flask function")
