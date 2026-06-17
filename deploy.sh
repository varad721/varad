#!/bin/bash
# Deploy to Nexcloud via Git — run on Mac/Linux after making changes.
# Usage: ./deploy.sh
#        ./deploy.sh "fixed music command"

set -e
cd "$(dirname "$0")"

if ! command -v git &>/dev/null; then
  echo "Git is not installed."
  exit 1
fi

if [[ ! -d .git ]]; then
  echo ""
  echo "First-time setup: connect this folder to GitHub"
  echo ""
  echo "1. Create a repo at https://github.com/new (private recommended)"
  echo "2. Do NOT add README/license — keep it empty"
  echo ""
  read -rp "GitHub repo URL: " repo_url
  if [[ -z "$repo_url" ]]; then
    echo "No URL given. Aborting."
    exit 1
  fi
  git init
  git branch -M main
  git remote add origin "$repo_url"
fi

git add -A

if [[ -z "$(git status --porcelain)" ]]; then
  echo "Nothing to deploy — no file changes."
  echo "Restart your Nexcloud server if you only changed panel env vars."
  exit 0
fi

msg="${1:-deploy $(date '+%Y-%m-%d %H:%M')}"
git commit -m "$msg"

echo "Pushing to GitHub..."
git push -u origin main 2>/dev/null || git push origin main

echo ""
echo "Deployed! Restart your Nexcloud server to pull the update."
