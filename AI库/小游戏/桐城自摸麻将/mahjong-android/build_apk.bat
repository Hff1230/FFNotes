@echo off
echo ========================================
echo   桐城自摸麻将 - APK 构建脚本
echo ========================================
echo.

REM 设置环境变量
set ANDROID_HOME=C:\Users\hufeifei.JOY\Android\Sdk
set PATH=%PATH%;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools

REM 检查 sdkmanager 是否存在
if not exist "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" (
    echo [错误] 未找到 sdkmanager.bat
    echo 请先安装 Android SDK 命令行工具:
    echo 1. 下载: https://developer.android.com/studio#command-tools
    echo 2. 解压到: %ANDROID_HOME%\
    echo 3. 重命名 cmdline-tools\bin 为 latest
    pause
    exit /b 1
)

REM 安装必需的 SDK 组件
echo [1/3] 安装 Android SDK 组件...
sdkmanager --install "platforms;android-34" "build-tools;34.0.0" /y

REM 构建 APK
echo [2/3] 构建 APK...
cd /d "%~dp0"
if exist gradlew.bat (
    gradlew.bat assembleDebug
) else (
    gradle assembleDebug
)

if %errorlevel% equ 0 (
    echo [3/3] 构建成功!
    echo APK 位置: app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo [可选] 安装到手机:
    echo adb install app\build\outputs\apk\debug\app-debug.apk
) else (
    echo [错误] 构建失败!
)

pause
