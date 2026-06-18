# Docker Desktop Quick Start

## 1. Create your `.env`

Copy `.env.example` to `.env` and fill in:

```env
DISCORD_TOKEN=your_discord_bot_token
OWNER_ID=your_discord_user_id
DASHBOARD_SECRET=make_this_random
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-1.5-flash
```

Do not share `.env`.

## 2. Start the bot

```bash
docker compose up --build
```

Dashboard:

```text
http://localhost:5000
```

Login with the Discord user ID listed in `OWNER_ID`.

## 3. Stop the bot

```bash
docker compose down
```

## Notes

- Data persists in `./data/bot.db`.
- Music needs the bot role to have `Connect` and `Speak` in voice channels.
- If music works locally but not on a hosting provider, the provider is probably blocking Discord voice traffic.
- If Gemini says quota is exhausted, try a different `GEMINI_MODEL` such as `gemini-1.5-flash-8b`.
