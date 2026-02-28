@echo off
cd /d "%~dp0"

echo.
echo ========================================
echo   Math Practice - Build Tool
echo ========================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js:
node -v
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    npm config set registry https://registry.npmmirror.com
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Install failed
        pause
        exit /b 1
    )
)

:menu
echo.
echo ========================================
echo   Options:
echo ========================================
echo   1. Run app
echo   2. Build installer
echo   3. Build portable
echo   4. Reinstall
echo   5. Clean install
echo   0. Exit
echo ========================================
echo.

set /p c="Choose (0-5): "

if "%c%"=="1" goto run
if "%c%"=="2" goto build
if "%c%"=="3" goto portable
if "%c%"=="4" goto reinstall
if "%c%"=="5" goto clean
if "%c%"=="0" goto end
goto menu

:run
call npm start
goto end

:build
call npm run build
if exist "dist" explorer dist
goto end

:portable
call npx electron-builder --win portable
if exist "dist" explorer dist
goto end

:reinstall
call npm install
goto menu

:clean
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
call npm install
goto menu

:end
pause
