with open('bot.py') as f:
    lines = f.readlines()

# Find the line with "def api_setup_levels"
for i, line in enumerate(lines):
    if 'def api_setup_levels' in line:
        # Check if the decorator is there
        if i > 0 and '@app.route' not in lines[i-1]:
            # Insert the decorator
            decorator = '''@app.route("/api/setup_levels/<int:guild_id>", methods=["POST"])
@login_required
'''
            lines.insert(i, decorator)
            print(f"Added decorator at line {i}")
        break

with open('bot.py', 'w') as f:
    f.writelines(lines)

print("Fixed setup_levels decorator")
