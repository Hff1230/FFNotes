@echo off
chcp 65001 >nul
echo ================================
echo   八十分游戏服务器
echo ================================
echo.
echo 正在启动服务器...
echo.

cd /d "%~dp0"

node 80-server.js

if %errorlevel% neq 0 (
    echo.
    echo 启动失败！请确保已安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
)
