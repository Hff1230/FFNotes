# 应用图标资源

## 📱 应用图标 (App Icon)

### 尺寸要求

| 密度 | 尺寸 | 放置目录 |
|------|------|----------|
| mdpi | 48×48 px | `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` |
| hdpi | 72×72 px | `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` |
| xhdpi | 96×96 px | `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` |
| xxhdpi | 144×144 px | `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` |
| xxxhdpi | 192×192 px | `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` |

### 圆形图标

| 密度 | 尺寸 | 放置目录 |
|------|------|----------|
| mdpi | 48×48 px | `mipmap-mdpi/ic_launcher_round.png` |
| hdpi | 72×72 px | `mipmap-hdpi/ic_launcher_round.png` |
| xhdpi | 96×96 px | `mipmap-xhdpi/ic_launcher_round.png` |
| xxhdpi | 144×144 px | `mipmap-xxhdpi/ic_launcher_round.png` |
| xxxhdpi | 192×192 px | `mipmap-xxxhdpi/ic_launcher_round.png` |

## 🎬 启动画面 (Splash Screen)

### 尺寸要求

| 密度 | 尺寸 | 放置目录 |
|------|------|----------|
| ldpi | 240×320 px | `drawable-ldpi/splash.png` |
| mdpi | 320×480 px | `drawable-mdpi/splash.png` |
| hdpi | 480×800 px | `drawable-hdpi/splash.png` |
| xhdpi | 720×1280 px | `drawable-xhdpi/splash.png` |
| xxhdpi | 1080×1920 px | `drawable-xxhdpi/splash.png` |
| xxxhdpi | 2160×3840 px | `drawable-xxxhdpi/splash.png` |

---

## 🛠️ 在线工具

### 图标生成工具

1. **Android Asset Studio** (官方推荐)
   - https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
   - 上传一张图片，自动生成所有尺寸

2. **App Icon Generator**
   - https://www.appicon.co/
   - 同时生成iOS和Android图标

3. **MakeAppIcon**
   - https://makeappicon.com/
   - AI辅助生成

### 启动画面工具

1. **Capacitor Splash Screen Generator**
   - https://capacitorjs.com/docs/guides/splash-screens-and-icons

2. **Android Asset Studio - Launcher Icon**
   - 可用于创建带文字的启动画面

---

## 📝 图标设计建议

1. **简洁明了**：图标内容简单，识别度高
2. **颜色鲜明**：使用与教育/数学相关的颜色（如绿色、蓝色）
3. **避免文字**：除非是品牌名，否则避免在图标上放文字
4. **适配圆形**：考虑图标在圆形遮罩下的效果
5. **测试不同背景**：在深色和浅色背景下都检查效果

---

## 🎨 推荐图标主题

- 📐 三角板/直尺
- ✏️ 铅笔/笔
- 📝 练习本/纸张
- 🔢 数字符号
- 📊 计算器
- 🧮 算盘

---

## 📋 使用步骤

1. 准备一张 **512×512** 或 **1024×1024** 的高清PNG图片
2. 使用在线工具生成各尺寸图标
3. 下载并解压
4. 将文件复制到对应的 `mipmap-*` 目录
5. 重新构建APK

---

*注意：图标文件名必须与AndroidManifest.xml中的引用一致*
