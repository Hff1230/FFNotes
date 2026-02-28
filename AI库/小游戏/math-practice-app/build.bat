@echo off
:: 设置代码页为UTF-8
chcp 65001 >nul 2>&1

:: 获取脚本所在目录并切换
cd /d "%~dp0"

echo.
echo ========================================
echo   小学数学口算快速出题器 - 打包工具
echo   当前目录: %cd%
echo ========================================
echo.

:: 检查Node.js
echo [检查] Node.js 环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js
    echo.
    echo 请先安装 Node.js:
    echo 下载地址: https://nodejs.org/
    echo 选择 LTS 版本下载安装
    echo.
    pause
    exit /b 1
)

node -v
npm -v
echo.

:: 检查必要文件
echo [检查] 项目文件...
if not exist "package.json" (
    echo [错误] 未找到 package.json
    echo 当前目录: %cd%
    pause
    exit /b 1
)
if not exist "main.js" (
    echo [错误] 未找到 main.js
    pause
    exit /b 1
)
if not exist "index.html" (
    echo [错误] 未找到 index.html
    pause
    exit /b 1
)
echo [OK] 项目文件完整
echo.

:: 安装依赖
if not exist "node_modules" (
    echo [安装] 首次运行，正在安装依赖...
    echo 这可能需要几分钟，请耐心等待...
    echo.

    :: 设置国内镜像加速
    npm config set registry https://registry.npmmirror.com

    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 依赖安装失败
        echo.
        echo 可能的解决方案:
        echo 1. 检查网络连接
        echo 2. 以管理员身份运行
        echo 3. 手动执行: npm install
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [完成] 依赖安装成功
    echo.
)

:menu
echo ========================================
echo   请选择操作:
echo ========================================
echo   1. 运行应用 (开发模式)
echo   2. 打包成安装程序 (.exe 安装包)
echo   3. 打包成便携版 (免安装)
echo   4. 重新安装依赖
echo   5. 清理并重新安装
echo   0. 退出
echo ========================================
echo.

set /p choice="请输入选项 (0-5): "

if "%choice%"=="1" goto run
if "%choice%"=="2" goto build_setup
if "%choice%"=="3" goto build_portable
if "%choice%"=="4" goto reinstall
if "%choice%"=="5" goto clean_install
if "%choice%"=="0" goto end
echo [错误] 无效选项，请重新选择
echo.
goto menu

:run
echo.
echo [启动] 正在启动应用...
echo.
call npm start
goto end

:build_setup
echo.
echo [打包] 正在打包安装程序...
echo 这可能需要几分钟，请耐心等待...
echo.
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包失败
    pause
    goto menu
)
echo.
echo [完成] 打包成功！
echo.
if exist "dist" (
    explorer dist
) else (
    echo [警告] 未找到 dist 目录
)
goto end

:build_portable
echo.
echo [打包] 正在打包便携版...
echo.
call npx electron-builder --win portable
if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包失败
    pause
    goto menu
)
echo.
echo [完成] 打包成功！
echo.
if exist "dist" (
    explorer dist
)
goto end

:reinstall
echo.
echo [安装] 正在重新安装依赖...
call npm install
echo [完成]
echo.
goto menu

:clean_install
echo.
echo [清理] 正在清理旧文件...
if exist "node_modules" rmdir /s /q node_modules
if exist "package-lock.json" del package-lock.json
echo [安装] 正在重新安装依赖...
call npm install
echo [完成]
echo.
goto menu

:end
echo.
echo 感谢使用！
pause
