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
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node -v
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    npm config set registry https://registry.npmmirror.com
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

:menu
echo.
echo ========================================
echo   Select option:
echo ========================================
echo   1. Run app (dev mode)
echo   2. Build installer (.exe)
echo   3. Build portable
echo   4. Reinstall dependencies
echo   5. Clean and reinstall
echo   0. Exit
echo ========================================
echo.

set /p choice="Enter option (0-5): "

if "%choice%"=="1" goto run
if "%choice%"=="2" goto build_setup
if "%choice%"=="3" goto build_portable
if "%choice%"=="4" goto reinstall
if "%choice%"=="5" goto clean_install
if "%choice%"=="0" goto end
echo Invalid option
goto menu

:run
echo Starting app...
call npm start
goto end

:build_setup
echo Building installer...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed
    pause
    goto menu
)
echo Build complete!
if exist "dist" explorer dist
goto end

:build_portable
echo Building portable...
call npx electron-builder --win portable
if %errorlevel% neq 0 (
    echo Build failed
    pause
    goto menu
)
echo Build complete!
if exist "dist" explorer dist
goto end

:reinstall
call npm install
echo Done
goto menu

:clean_install
if exist "node_modules" rmdir /s /q node_modules
if exist "package-lock.json" del package-lock.json
call npm install
echo Done
goto menu

:end
echo Goodbye!
pause
