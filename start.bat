@echo off
echo.
echo Discord Bot + Dashboard
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.11+ is required.
    pause
    exit /b 1
)

if not exist ".env" (
    copy ".env.example" ".env"
    echo Created .env. Add your DISCORD_TOKEN and OWNER_ID before starting.
    pause
    exit /b 0
)

echo Installing dependencies...
python -m pip install -r requirements.txt

echo Starting bot and dashboard...
python bot.py
pause
