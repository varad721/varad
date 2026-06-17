# Deploy to Nexcloud via Git — run this on your PC after making changes.
# Usage: .\deploy.ps1
#        .\deploy.ps1 -Message "fixed music command"

param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Test-Git {
    git --version 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Git is not installed. Get it from https://git-scm.com/download/win" -ForegroundColor Red
        exit 1
    }
}

Test-Git

if (-not (Test-Path ".git")) {
    Write-Host ""
    Write-Host "First-time setup: connect this folder to GitHub" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Create a repo at https://github.com/new (private recommended)"
    Write-Host "2. Do NOT add README/license — keep it empty"
    Write-Host "3. Paste your repo URL below"
    Write-Host ""
    $repoUrl = Read-Host "GitHub repo URL (https://github.com/varad721/varad.git)"

    if (-not $repoUrl) {
        Write-Host "No URL given. Aborting." -ForegroundColor Red
        exit 1
    }

    git init
    git branch -M main
    git remote add origin $repoUrl
    Write-Host ""
    Write-Host "Repo linked. Pushing first upload..." -ForegroundColor Green
}

# Never commit secrets
if (git status --porcelain .env 2>$null | Select-String ".env") {
    Write-Host "Warning: .env has changes — it stays local (gitignored)." -ForegroundColor Yellow
}

git add -A

$status = git status --porcelain
if (-not $status) {
    Write-Host "Nothing to deploy — no file changes." -ForegroundColor Cyan
    Write-Host "Restart your Nexcloud server if you only changed panel env vars."
    exit 0
}

if (-not $Message) {
    $Message = "deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

git commit -m $Message

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main 2>$null
if ($LASTEXITCODE -ne 0) {
    git push origin main
}

Write-Host ""
Write-Host "Deployed!" -ForegroundColor Green
Write-Host "Next: restart your Nexcloud server — it will pull this update automatically."
Write-Host ""
