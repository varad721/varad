#!/bin/bash
# Discord Bot startup (Node.js) — local or Nexcloud/Pterodactyl

echo ""
echo "Advanced Discord Bot (Node.js)"
echo ""

if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js 18+ is required"
  exit 1
fi

echo "Node: $(node --version)"
echo ""

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp ".env.example" ".env"
    echo "Created .env from .env.example — add your DISCORD_TOKEN before starting."
  else
    echo "ERROR: .env file missing"
    exit 1
  fi
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting bot + dashboard..."
node index.js
