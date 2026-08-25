# 桐城自摸麻将 - APK 构建脚本
# 右键 "使用 PowerShell 运行"

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "   桐城自摸麻将 - APK 构建脚本" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$ANDROID_HOME = "C:\Users\hufeifei.JOY\Android\Sdk"
$sdkmanager = "$ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat"

# 检查 sdkmanager 是否存在
if (-not (Test-Path $sdkmanager)) {
    Write-Host "[错误] 未找到 sdkmanager" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装 Android SDK 命令行工具:" -ForegroundColor Yellow
    Write-Host "1. 下载: https://developer.android.com/studio#command-tools" -ForegroundColor White
    Write-Host "2. 解压到: $ANDROID_HOME\" -ForegroundColor White
    Write-Host "3. 重命名 cmdline-tools\bin 为 latest" -ForegroundColor White
    Write-Host "4. 确保路径为: $sdkmanager" -ForegroundColor White
    Write-Host ""
    Write-Host "按任意键退出..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "[1/3] 安装 Android SDK 组件..." -ForegroundColor Yellow
& $sdkmanager --install "platforms;android-34" "build-tools;34.0.0" --accept-license

Write-Host "[2/3] 构建 APK..." -ForegroundColor Yellow
Push-Location $PSScriptRoot

if (Test-Path "gradlew.bat") {
    & .\gradlew.bat assembleDebug
} else {
    & gradle assembleDebug
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "[3/3] 构建成功!" -ForegroundColor Green
    Write-Host "APK 位置: app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[可选] 安装到手机:" -ForegroundColor Yellow
    Write-Host "adb install app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
} else {
    Write-Host "[错误] 构建失败! 请检查上方错误信息" -ForegroundColor Red
}

Pop-Location
Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
