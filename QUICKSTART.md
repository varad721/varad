# Quick Start (Node.js)

## 1. Get Bot Token (2 min)

1. Go to https://discord.com/developers/applications
2. Create an application → **Bot** → **Add Bot**
3. Copy the token and enable **Message Content**, **Server Members**, and **Moderation** intents

## 2. Configure `.env`

```bash
copy .env.example .env    # Windows
cp .env.example .env      # Mac/Linux
```

Fill in at minimum:

```env
DISCORD_TOKEN=your_token
APPLICATION_ID=your_app_id
OWNER_ID=your_discord_user_id
GUILD_ID=your_server_id
```

`GUILD_ID` is optional but recommended — slash commands sync instantly to that server instead of waiting up to an hour globally.

## 3. Install & Run

```bash
npm install
npm start
```

Bot and dashboard run together on one process (good for Nexcloud hosting).

---

## Nexcloud — deploy without uploading files

Use **GitHub + auto-pull**. You push from your PC once per update; Nexcloud pulls on restart.

### One-time setup

**On your PC**

1. Create a **private** repo at [github.com/new](https://github.com/new) (empty, no README)
2. In your bot folder, run:
   ```powershell
   .\deploy.ps1
   ```
   It will ask for your repo URL and push everything (`.env` stays local — never uploaded)

**On Nexcloud**

1. Use the **Node.js** egg
2. Open the **Console** and run (replace with your repo URL):
   ```bash
   cd /home/container
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
   ```
3. **Startup command** — paste this:
   ```bash
   bash scripts/nexcloud-start.sh
   ```
   Or inline:
   ```bash
   if [[ -d .git ]] && [[ "${AUTO_UPDATE:-1}" == "1" ]]; then git pull; fi; if [[ ! -d node_modules ]]; then npm install --omit=dev; fi; mkdir -p data; node index.js
   ```
4. Add **environment variables** in the panel (do not put secrets in GitHub):
   - `DISCORD_TOKEN`
   - `APPLICATION_ID`
   - `OWNER_ID`
   - `GUILD_ID` (recommended)
   - `DASHBOARD_PORT` — match your allocation port
   - `AUTO_UPDATE=1` (pulls latest code on every restart)

5. Start the server

### Every update after that

On your PC:

```powershell
.\deploy.ps1
```

Then **restart** the Nexcloud server — it pulls and runs the new code. No file uploads.

Optional: `.\deploy.ps1 -Message "added new command"`

---

## Test Commands

In Discord:

```
/help
/ping
/serverinfo
```

---

## Project Layout (JavaScript)

```
index.js              # Entry point (bot + dashboard)
src/
  bot.js              # Discord client
  config.js           # Settings from .env
  database.js         # SQLite
  security.js         # Anti-spam / link filter
  events.js           # Welcome messages, logging
  commands/           # Slash commands
dashboard/
  app.js              # Express dashboard
  views/              # EJS pages
  public/             # CSS & JS
```
