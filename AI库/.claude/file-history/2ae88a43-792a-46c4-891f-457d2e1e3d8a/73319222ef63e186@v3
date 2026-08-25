@echo off
chcp 65001 > nul
echo.
echo Majiang Server (Auto-restart mode)
echo ===================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting server (auto-restart mode)...
echo Tip: Server will auto-restart when code changes
echo.
call npm run dev

pause
