# 小学数学口算快速出题器 - Android APK版

## 📁 项目结构

```
math-practice-android/
├── package.json              # 项目配置
├── capacitor.config.json     # Capacitor配置
├── www/                      # Web资源目录
│   ├── index.html            # 应用主页面
│   └── mobile.css            # 移动端适配样式
├── android/                  # Android原生项目（运行cap add后生成）
├── icon/                     # 图标资源目录
└── README.md                 # 本文件
```

---

## 🚀 快速开始

### 前置要求

1. **Node.js** (v16+)
   - 下载：https://nodejs.org/

2. **Java JDK 17**
   - 下载：https://adoptium.net/
   - 配置环境变量 `JAVA_HOME`

3. **Android Studio**
   - 下载：https://developer.android.com/studio
   - 安装时选择 Android SDK
   - 配置环境变量 `ANDROID_HOME`

4. **Gradle** (通常Android Studio会自动安装)

### 环境变量配置

**Windows (系统环境变量)**：
```
JAVA_HOME=C:\Program Files\Java\jdk-17
ANDROID_HOME=C:\Users\用户名\AppData\Local\Android\Sdk
Path添加: %ANDROID_HOME%\platform-tools
Path添加: %ANDROID_HOME%\tools
```

验证环境：
```bash
java -version
echo %ANDROID_HOME%
```

---

## 📦 打包步骤

### 步骤1：安装依赖

```bash
cd "AI库/小游戏/math-practice-android"
npm install
```

### 步骤2：添加Android平台

```bash
npx cap add android
```

这将在项目中创建 `android/` 目录。

### 步骤3：同步Web资源

```bash
npx cap sync
```

### 步骤4：用Android Studio打开项目

```bash
npx cap open android
```

### 步骤5：在Android Studio中构建APK

1. 等待Gradle同步完成
2. 菜单：**Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. 等待构建完成
4. 点击右下角通知中的 **locate** 找到APK文件

APK输出路径：`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔧 一键打包脚本

### build-apk.bat (Windows)

双击运行 `build-apk.bat`，按提示操作。

---

## 🎨 应用图标设置

### 图标尺寸要求

| 密度 | 尺寸 | 目录 |
|------|------|------|
| mdpi | 48×48 | mipmap-mdpi |
| hdpi | 72×72 | mipmap-hdpi |
| xhdpi | 96×96 | mipmap-xhdpi |
| xxhdpi | 144×144 | mipmap-xxhdpi |
| xxxhdpi | 192×192 | mipmap-xxxhdpi |

### 设置步骤

1. 准备一张 **512×512** 的PNG图标
2. 使用在线工具生成各尺寸图标：
   - https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
   - https://www.appicon.co/
3. 下载后解压，替换 `android/app/src/main/res/mipmap-*` 目录下的图标

### 启动画面

1. 准备一张 **2732×2732** 的PNG图片
2. 放入 `android/app/src/main/res/drawable-*/` 目录
3. 命名为 `splash.png`

---

## ⚙️ 应用信息配置

编辑 `android/app/src/main/AndroidManifest.xml`：

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.aiku.mathpractice">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="小学数学口算出题器"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="小学数学口算出题器"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 📱 测试APK

### 方法1：模拟器

1. Android Studio → Tools → Device Manager
2. 创建虚拟设备（推荐 Pixel 4, API 33）
3. 运行：`npx cap run android`

### 方法2：真机

1. 手机开启 **开发者选项** 和 **USB调试**
2. 连接电脑
3. 运行：`npx cap run android`

或直接安装APK：
```bash
adb install app-debug.apk
```

---

## 🔐 发布到应用商店

### 生成签名APK

1. **创建密钥库**：
   ```bash
   keytool -genkey -v -keystore math-practice.keystore -alias math-practice -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **在 android/app/build.gradle 中配置**：
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('../../math-practice.keystore')
               storePassword '你的密码'
               keyAlias 'math-practice'
               keyPassword '你的密码'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled false
           }
       }
   }
   ```

3. **构建发布版**：
   Android Studio → Build → Generate Signed Bundle / APK

---

## 📋 可用命令

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npx cap add android` | 添加Android平台 |
| `npx cap sync` | 同步Web资源到原生项目 |
| `npx cap open android` | 打开Android Studio |
| `npx cap run android` | 在设备/模拟器上运行 |
| `npx cap copy android` | 仅复制Web资源 |

---

## ⚠️ 常见问题

### Q1: Gradle下载慢？

修改 `android/build.gradle`，添加国内镜像：
```gradle
allprojects {
    repositories {
        maven { url 'https://maven.aliyun.com/repository/google' }
        maven { url 'https://maven.aliyun.com/repository/public' }
        google()
        mavenCentral()
    }
}
```

### Q2: SDK未找到？

检查环境变量 `ANDROID_HOME` 是否正确指向SDK目录。

### Q3: 白屏？

1. 检查 `www/index.html` 是否存在
2. 运行 `npx cap sync` 重新同步
3. 检查控制台错误（Android Studio Logcat）

### Q4: 想修改应用名称？

编辑 `android/app/src/main/res/values/strings.xml`：
```xml
<string name="app_name">小学数学口算出题器</string>
<string name="title_activity_main">小学数学口算出题器</string>
```

### Q5: 想修改版本号？

编辑 `android/app/build.gradle`：
```gradle
android {
    defaultConfig {
        versionCode 127
        versionName "1.2.7"
    }
}
```

---

## 📊 文件大小估算

- **Debug APK**: 约 5-8 MB
- **Release APK**: 约 4-6 MB

---

## 📝 系统要求

- **最低Android版本**: Android 5.0 (API 21)
- **目标Android版本**: Android 14 (API 34)

可在 `android/app/build.gradle` 中修改：
```gradle
android {
    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 34
    }
}
```

---

## 📂 项目文件

| 文件 | 说明 |
|------|------|
| `package.json` | Node.js项目配置 |
| `capacitor.config.json` | Capacitor配置 |
| `www/index.html` | 应用主页面 |
| `www/mobile.css` | 移动端适配样式 |
| `build-apk.bat` | Windows打包脚本 |

---

*创建日期：2026年2月*
*作者：AI库*
*版本：v1.2.7*
