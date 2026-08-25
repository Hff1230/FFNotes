@echo off
chcp 65001 > nul
echo.
echo Majiang Server
echo ==============
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting server...
node majiang-server.js

pause
