@echo off
REM Discord Bot startup (Node.js) — Windows

echo.
echo Advanced Discord Bot (Node.js)
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js 18+ is required. Install from https://nodejs.org/
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo Created .env — add your DISCORD_TOKEN before starting.
    ) else (
        echo ERROR: .env file missing
        pause
        exit /b 1
    )
)

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

echo Starting bot + dashboard...
node index.js
pause
