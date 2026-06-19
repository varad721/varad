with open('bot.py') as f:
    lines = f.readlines()

# Remove the duplicate @login_required before api_setup_levels
new_lines = []
skip_next = False

for i, line in enumerate(lines):
    if skip_next:
        skip_next = False
        continue
    
    # If this is @login_required and next line is @app.route for setup_levels
    if line.strip() == '@login_required' and i + 1 < len(lines):
        if '@app.route("/api/setup_levels' in lines[i+1]:
            # Skip this @login_required as it's the duplicate
            continue
    
    new_lines.append(line)

with open('bot.py', 'w') as f:
    f.writelines(new_lines)

print('Fixed duplicate decorator')
