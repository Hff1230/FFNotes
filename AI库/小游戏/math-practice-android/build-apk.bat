@echo off
cd /d "%~dp0"

echo.
echo ========================================
echo   Math Practice - APK Build Tool
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
echo   1. Init Android project
echo   2. Sync web files
echo   3. Open Android Studio
echo   4. Run on device
echo   5. Full build (init+sync+open)
echo   0. Exit
echo ========================================
echo.

set /p c="Choose (0-5): "

if "%c%"=="1" goto init
if "%c%"=="2" goto sync
if "%c%"=="3" goto open
if "%c%"=="4" goto run
if "%c%"=="5" goto full
if "%c%"=="0" goto end
goto menu

:init
if exist "android" (
    echo Android folder already exists
) else (
    call npx cap add android
)
goto menu

:sync
call npx cap sync
goto menu

:open
call npx cap open android
goto end

:run
call npx cap run android
goto end

:full
if not exist "android" call npx cap add android
call npx cap sync
echo.
echo Build APK in Android Studio:
echo   Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
echo.
call npx cap open android
goto end

:end
pause
