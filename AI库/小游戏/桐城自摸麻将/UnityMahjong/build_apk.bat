@echo off
chcp 65001 >nul
echo ========================================
echo   桐城自摸麻将 - Unity APK 构建
echo ========================================
echo.

set UNITY_PATH=C:\Program Files\Unity 2022.3.62f1\Editor\Unity.exe
set PROJECT_PATH=F:\HFF\Obsidian\FFNotes\AI库\小游戏\桐城自摸麻将\UnityMahjong

if not exist "%UNITY_PATH%" (
    echo [错误] 未找到 Unity 可执行文件
    echo 请修改 build_apk.bat 中的 UNITY_PATH 变量
    pause
    exit /b 1
)

echo [1/3] 检查 Unity...
if exist "%UNITY_PATH%" (
    echo Unity 已找到
) else (
    echo [错误] Unity 路径不正确
    pause
    exit /b 1
)

echo [2/3] 构建 APK (这可能需要几分钟)...
echo.
"%UNITY_PATH%" -projectPath "%PROJECT_PATH%" -executeMethod BuildScript.BuildAndroid -buildTarget Android -logFile "%PROJECT_PATH%\build.log" -batchmode -quit

if %errorlevel% equ 0 (
    echo.
    echo [3/3] 构建成功!
    echo APK 位置: %PROJECT_PATH%\build\app-debug.apk
    echo.
    echo [可选] 安装到手机:
    echo adb install %PROJECT_PATH%\build\app-debug.apk
) else (
    echo.
    echo [错误] 构建失败!
    echo 查看 %PROJECT_PATH%\build.log 了解详情
)

pause