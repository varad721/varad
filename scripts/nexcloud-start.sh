#!/bin/bash
# Paste this as your Nexcloud startup command (Node.js egg).
# Or set STARTUP_CMD to run this file.

cd /home/container || exit 1

# Pull latest code from GitHub when you restart the server
if [[ -d .git ]] && [[ "${AUTO_UPDATE:-1}" == "1" ]]; then
  echo "Pulling latest code..."
  git pull origin "${GIT_BRANCH:-main}" 2>/dev/null || git pull 2>/dev/null || echo "Git pull skipped (no remote or not a repo yet)"
fi

# Install / update dependencies
if [[ ! -d node_modules ]] || [[ "${FORCE_INSTALL}" == "1" ]]; then
  echo "Installing npm packages..."
  npm install --omit=dev
fi

mkdir -p data

echo "Starting bot..."
exec node index.js
