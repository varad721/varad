with open('bot.py', 'r') as f:
    content = f.read()

# Fix latency check
content = content.replace(
    'if math.isnan(latency):',
    'if math.isnan(latency) or math.isinf(latency):'
)

content = content.replace(
    '"latency": round(latency),',
    '"latency": round(latency) if latency < 999999 else 0,'
)

with open('bot.py', 'w') as f:
    f.write(content)

print("Fixed latency issue")
