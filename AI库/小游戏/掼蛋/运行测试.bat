@echo off
chcp 65001 > nul
title 掼蛋游戏 - 自动化测试

echo.
echo  ╔══════════════════════════════════════╗
echo  ║     🃏 掼蛋游戏 - 自动化测试 🃏      ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo 📋 正在运行测试...
echo.

npm test

echo.
echo ═════════════════════════════════════════
echo.
pause
