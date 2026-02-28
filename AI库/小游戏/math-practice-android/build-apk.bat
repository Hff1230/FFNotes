@echo off
chcp 65001 >nul
echo ========================================
echo   小学数学口算快速出题器 - APK打包工具
echo ========================================
echo.

:: 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

echo [信息] Node.js 版本：
node -v
echo.

:: 检查Java
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [警告] 未检测到 Java JDK
    echo 请安装 JDK 17: https://adoptium.net/
    echo 并配置 JAVA_HOME 环境变量
    echo.
)

:: 检查ANDROID_HOME
if "%ANDROID_HOME%"=="" (
    echo [警告] 未检测到 ANDROID_HOME 环境变量
    echo 请安装 Android Studio: https://developer.android.com/studio
    echo 并配置 ANDROID_HOME 环境变量
    echo.
)

:: 检查node_modules
if not exist "node_modules" (
    echo [信息] 首次运行，正在安装依赖...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
)

echo ========================================
echo   请选择操作：
echo ========================================
echo   1. 初始化Android项目（首次运行）
echo   2. 同步Web资源
echo   3. 打开Android Studio
echo   4. 在设备/模拟器上运行
echo   5. 完整流程（初始化+同步+打开）
echo   6. 查看帮助
echo   7. 退出
echo ========================================
echo.

set /p choice="请输入选项 (1-7): "

if "%choice%"=="1" (
    echo.
    echo [信息] 正在添加Android平台...
    if exist "android" (
        echo [警告] android目录已存在，跳过创建
    ) else (
        call npx cap add android
    )
    echo.
    echo [完成] Android平台已添加
) else if "%choice%"=="2" (
    echo.
    echo [信息] 正在同步Web资源...
    call npx cap sync
    echo.
    echo [完成] 资源同步完成
) else if "%choice%"=="3" (
    echo.
    echo [信息] 正在打开Android Studio...
    call npx cap open android
) else if "%choice%"=="4" (
    echo.
    echo [信息] 正在启动应用...
    call npx cap run android
) else if "%choice%"=="5" (
    echo.
    echo [步骤1] 添加Android平台...
    if not exist "android" (
        call npx cap add android
    )
    echo.
    echo [步骤2] 同步Web资源...
    call npx cap sync
    echo.
    echo [步骤3] 打开Android Studio...
    echo [提示] 在Android Studio中构建APK:
    echo        Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
    echo.
    call npx cap open android
) else if "%choice%"=="6" (
    echo.
    echo ========================================
    echo   帮助信息
    echo ========================================
    echo.
    echo 前置要求：
    echo   1. Node.js (v16+)
    echo   2. Java JDK 17
    echo   3. Android Studio + Android SDK
    echo.
    echo 构建APK步骤：
    echo   1. 运行选项5完成初始化
    echo   2. 在Android Studio中等待Gradle同步
    echo   3. 菜单: Build -^> Build APK(s)
    echo   4. APK位置: android/app/build/outputs/apk/debug/
    echo.
    echo APK输出文件: app-debug.apk
    echo.
) else if "%choice%"=="7" (
    exit /b 0
) else (
    echo [错误] 无效选项
)

echo.
pause
