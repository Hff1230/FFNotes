@echo off
chcp 65001 >nul
title 掼蛋服务器 - 普通模式

echo.
echo ╔══════════════════════════════════════════════╗
echo ║         🃏 掼蛋服务器 - 普通模式 🃏           ║
echo ╠══════════════════════════════════════════════╣
echo ║  修改代码后需要手动重启服务器                  ║
echo ║  按 Ctrl+C 可停止服务器                       ║
echo ╚══════════════════════════════════════════════╝
echo.

:: 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [提示] 首次运行，正在安装依赖...
    call npm install
    echo.
)

echo [启动] 正在启动服务器...
echo.

call npm start
