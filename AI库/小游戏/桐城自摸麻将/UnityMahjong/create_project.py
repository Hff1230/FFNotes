import os
import json
import shutil

# 项目路径
PROJECT_DIR = r"F:\HFF\Obsidian\FFNotes\AI库\小游戏\桐城自摸麻将\UnityMahjong"
ASSETS_DIR = os.path.join(PROJECT_DIR, "Assets")
STREAMING_DIR = os.path.join(ASSETS_DIR, "StreamingAssets", "game")
SCRIPTS_DIR = os.path.join(ASSETS_DIR, "Scripts")

# 1. 复制游戏文件到 StreamingAssets
print("正在复制游戏文件...")
game_files_dir = r"F:\HFF\Obsidian\FFNotes\AI库\小游戏\桐城自摸麻将"
shutil.copy(os.path.join(game_files_dir, "majiang-lan.html"),
            os.path.join(STREAMING_DIR, "index.html"))
src_images = os.path.join(game_files_dir, "Images")
dst_images = os.path.join(STREAMING_DIR, "Images")
if os.path.exists(dst_images):
    shutil.rmtree(dst_images)
shutil.copytree(src_images, dst_images)
print("游戏文件复制完成!")

# 2. 创建 Unity 项目配置文件
print("创建 Unity 项目配置...")

# ProjectSettings
settings_dir = os.path.join(PROJECT_DIR, "ProjectSettings")
os.makedirs(settings_dir, exist_ok=True)

# ProjectSettings.asset
project_settings = {
    "m_ObjectHideFlags": 2,
    "Configuration": {
        "cloudProjectId": "",
        "cname": "",
        "username": "",
        "version": "1.0.0"
    },
    "EditorSettings": {
        "m_ExternalVersionControlSupport": "Visible Meta Files",
        "m_SpriteManager": "Default"
    },
    "TagManager": {
        "tags": []
    },
    "ProjectVersion": {
        "m_Version": "1",
        "m_EditorVersion": "2022.3.62f1"
    }
}

# 3. 创建 AndroidManifest.xml (Unity 会生成，但我们提供自定义)
android_dir = os.path.join(ASSETS_DIR, "Plugins", "Android")
os.makedirs(android_dir, exist_ok=True)

android_manifest = """<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.mahjong"
    android:versionCode="1"
    android:versionName="1.0">
    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />
    <uses-feature android:glEsVersion="0x00020000" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <application
        android:icon="@drawable/app_icon"
        android:label="@string/app_name"
        android:debuggable="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        <activity android:name=".UnityPlayerNativeActivity"
            android:label="@string/app_name"
            android:configChanges="fontScale|keyboard|keyboardHidden|locale|mnc|mcc|navigation|orientation|screenLayout|screenSize|smallestScreenSize|uiMode|touchscreen"
            android:launchMode="singleTask">
            <meta-data android:name="unityplayer.ForwardNativeEventsToDalvik" android:value="true" />
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
    <supports-screens
        android:smallScreens="true"
        android:normalScreens="true"
        android:largeScreens="true"
        android:xlargeScreens="true"
        android:anyDensity="true" />
</manifest>
"""

with open(os.path.join(android_dir, "AndroidManifest.xml"), "w", encoding="utf-8") as f:
    f.write(android_manifest)
print("AndroidManifest.xml 创建完成!")

# 4. 创建 build_apk.py - Unity 命令行构建脚本
build_script = r"""
import sys
import os
import subprocess

unity_path = r"C:\Program Files\Unity 2022.3.62f1\Editor\Unity.exe"
project_dir = r"F:\HFF\Obsidian\FFNotes\AI库\小游戏\桐城自摸麻将\UnityMahjong"
output_apk = os.path.join(project_dir, "build", "app-debug.apk")

print("=" * 60)
print("  Unity Mahjong - APK 构建脚本")
print("=" * 60)
print()

# 检查 Unity 是否存在
if not os.path.exists(unity_path):
    print(f"[错误] 未找到 Unity: {unity_path}")
    sys.exit(1)

print(f"Unity 路径: {unity_path}")
print(f"项目路径: {project_dir}")
print()

# 执行 Unity 构建命令
cmd = [
    unity_path,
    "-projectPath", project_dir,
    "-executeMethod", "BuildScript.BuildAndroid",
    "-buildTarget", "Android",
    "-logFile", os.path.join(project_dir, "build.log"),
    "-batchmode",
    "-quit"
]

print("开始构建 APK...")
print(" " + " ".join(cmd))
print()

try:
    result = subprocess.run(cmd, check=True, capture_output=True, text=True, encoding='utf-8')
    print("[成功] APK 构建完成!")
    print(f"APK 位置: {output_apk}")
except subprocess.CalledProcessError as e:
    print(f"[错误] 构建失败: {e}")
    if e.stderr:
        print("错误信息:", e.stderr)
    sys.exit(1)
"""

# 5. 创建 BuildScript.cs - Unity 内部构建脚本
build_cs = r"""
using UnityEngine;
using UnityEditor;
using System.IO;

/// <summary>
/// 自动构建 Android APK 的脚本
/// 通过 Unity 命令行执行: -executeMethod BuildScript.BuildAndroid
/// </summary>
public class BuildScript : Editor
{
    [MenuItem("Tools/Build Android APK")]
    public static void BuildAndroid()
    {
        string buildPath = "build";
        if (!Directory.Exists(buildPath))
            Directory.CreateDirectory(buildPath);

        string apkPath = Path.Combine(buildPath, "app-debug.apk");

        // 设置 Android 构建选项
        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions
        {
            scenes = GetEnabledScenes(),
            locationPathName = apkPath,
            target = BuildTarget.Android,
            options = BuildOptions.Development
        };

        Debug.Log("开始构建 Android APK...");
        BuildResult result = BuildPipeline.BuildPlayer(buildPlayerOptions);

        if (result.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log("构建成功! APK 位置: " + apkPath);
        }
        else
        {
            Debug.LogError("构建失败: " + result.summary.totalErrors);
        }
    }

    static EditorScene[] GetEnabledScenes()
    {
        // 获取所有已启用的场景
        var scenes = new System.Collections.Generic.List<EditorScene>();
        for (int i = 0; i < EditorApplication.sceneCount; i++)
        {
            var scene = EditorApplication.GetSceneByIndex(i);
            if (!string.IsNullOrEmpty(scene.path))
            {
                scenes.Add(scene);
            }
        }
        return scenes.ToArray();
    }
}
"""

with open(os.path.join(SCRIPTS_DIR, "BuildScript.cs"), "w", encoding="utf-8") as f:
    f.write(build_cs)
print("BuildScript.cs 创建完成!")

# 6. 创建 build_apk.bat 批处理脚本
bat_lines = [
    "@echo off",
    "chcp 65001 >nul",
    "echo ========================================",
    "echo   桐城自摸麻将 - Unity APK 构建",
    "echo ========================================",
    "echo.",
    "",
    r'set UNITY_PATH=C:\Program Files\Unity 2022.3.62f1\Editor\Unity.exe',
    r'set PROJECT_PATH=F:\HFF\Obsidian\FFNotes\AI库\小游戏\桐城自摸麻将\UnityMahjong',
    "",
    'if not exist "%UNITY_PATH%" (',
    "    echo [错误] 未找到 Unity 可执行文件",
    "    echo 请修改 build_apk.bat 中的 UNITY_PATH 变量",
    "    pause",
    "    exit /b 1",
    ")",
    "",
    "echo [1/3] 检查 Unity...",
    'if exist "%UNITY_PATH%" (',
    "    echo Unity 已找到",
    ") else (",
    "    echo [错误] Unity 路径不正确",
    "    pause",
    "    exit /b 1",
    ")",
    "",
    "echo [2/3] 构建 APK (这可能需要几分钟)...",
    "echo.",
    r'"%UNITY_PATH%" -projectPath "%PROJECT_PATH%" -executeMethod BuildScript.BuildAndroid -buildTarget Android -logFile "%PROJECT_PATH%\build.log" -batchmode -quit',
    "",
    "if %errorlevel% equ 0 (",
    "    echo.",
    "    echo [3/3] 构建成功!",
    r"    echo APK 位置: %PROJECT_PATH%\build\app-debug.apk",
    "    echo.",
    "    echo [可选] 安装到手机:",
    r"    echo adb install %PROJECT_PATH%\build\app-debug.apk",
    ") else (",
    "    echo.",
    "    echo [错误] 构建失败!",
    r"    echo 查看 %PROJECT_PATH%\build.log 了解详情",
    ")",
    "",
    "pause",
]

bat_script = "\r\n".join(bat_lines)

with open(os.path.join(PROJECT_DIR, "build_apk.bat"), "w", encoding="gb2312") as f:
    f.write(bat_script)
print("build_apk.bat 创建完成!")

# 7. 创建图标
print("创建应用图标...")
icon_dir = os.path.join(ASSETS_DIR, "Resources")
os.makedirs(icon_dir, exist_ok=True)

# 创建一个简单的 XML 图标
icon_xml = """<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#2d5a3d"
        android:pathData="M0,0h108v108h-108z" />
</vector>
"""

# 在 Resources 目录下创建 icon 资源
with open(os.path.join(icon_dir, "ic_launcher.xml"), "w", encoding="utf-8") as f:
    f.write(icon_xml)

# 8. 创建 Android 原生插件配置
plugins_dir = os.path.join(ASSETS_DIR, "Plugins", "Android")
os.makedirs(plugins_dir, exist_ok=True)

# 创建 gradle 构建文件
gradle_build = """
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.0'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

apply plugin: 'com.android.application'

android {
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.example.mahjong"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
        }
        debug {
            minifyEnabled false
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}
"""

with open(os.path.join(plugins_dir, "build.gradle"), "w", encoding="utf-8") as f:
    f.write(gradle_build)

print("构建文件创建完成!")

# 完成
print("\n" + "=" * 60)
print("  项目创建完成!")
print("=" * 60)
print(f"\n项目路径: {PROJECT_DIR}")
print("\n下一步:")
print("1. 双击运行: build_apk.bat")
print("   (将使用 Unity 命令行构建 APK)")
print("2. 构建成功后，APK 位于: build\\app-debug.apk")
print("3. 安装到手机: adb install build\\app-debug.apk")
print("\n注意: 构建过程需要几分钟，请耐心等待")
"""

print("\n项目结构创建完成!")
print(f"项目路径: {PROJECT_DIR}")
print("\n目录结构:")
for root, dirs, files in os.walk(PROJECT_DIR):
    level = root.replace(PROJECT_DIR, '').count(os.sep)
    indent = ' ' * 2 * level
    print(f'{indent}{os.path.basename(root)}/')
    subindent = ' ' * 2 * (level + 1)
    for file in files[:5]:  # 只显示前5个文件
        print(f'{subindent}{file}')
"""

# 运行脚本
if __name__ == "__main__":
    main()