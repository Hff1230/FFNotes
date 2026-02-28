# 小学数学口算快速出题器 - Electron桌面版

## 📁 项目结构

```
math-practice-app/
├── package.json      # 项目配置文件
├── main.js           # Electron主进程
├── preload.js        # 预加载脚本
├── index.html        # 应用主页面（原HTML文件）
├── icon.ico          # 应用图标（需自行添加）
└── dist/             # 打包输出目录（打包后生成）
```

---

## 🚀 快速开始

### 前置要求

1. **安装 Node.js**（推荐 v18 或更高版本）
   - 下载地址：https://nodejs.org/
   - 选择 LTS 版本下载安装

2. **验证安装**
   ```bash
   node -v
   npm -v
   ```

### 安装步骤

1. **打开命令提示符/终端**，进入项目目录：
   ```bash
   cd "AI库/小游戏/math-practice-app"
   ```

2. **安装依赖**：
   ```bash
   npm install
   ```

3. **运行应用**（开发模式）：
   ```bash
   npm start
   ```

---

## 📦 打包成 EXE

### 方法一：打包成安装程序（推荐）

```bash
npm run build
```

这将在 `dist/` 目录下生成：
- `小学数学口算出题器 Setup 1.2.7.exe` - 安装程序

### 方法二：打包成便携版（免安装）

```bash
npm run build
```

生成的便携版文件：
- `小学数学口算出题器-1.2.7-Portable.exe` - 可直接运行，无需安装

### 方法三：仅打包（测试用）

```bash
npm run pack
```

---

## ⚙️ 打包配置说明

### package.json 关键配置

```json
{
  "build": {
    "appId": "com.aiku.math-practice",
    "productName": "小学数学口算出题器",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### 输出格式说明

| 格式 | 说明 | 适用场景 |
|------|------|----------|
| **nsis** | 安装程序 | 正式分发，需要安装 |
| **portable** | 便携版 | 免安装，直接运行 |
| **dir** | 目录 | 开发测试用 |

---

## 🎨 添加应用图标

1. 准备一个 **256x256** 或更大的 PNG 图片
2. 转换为 ICO 格式（可使用在线工具）：
   - https://convertio.co/png-ico/
   - https://www.icoconverter.com/
3. 将转换后的 `icon.ico` 放在项目根目录

**或者**暂时跳过图标，打包时会使用默认图标。

---

## 🔧 常见问题

### Q1: npm install 很慢？

使用国内镜像：
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### Q2: 打包失败？

1. 确保网络畅通（需要下载 Electron 二进制文件）
2. 尝试设置代理：
   ```bash
   set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
   npm run build
   ```

### Q3: 运行时白屏？

检查 `index.html` 是否存在于项目目录中。

### Q4: 想要修改窗口大小？

编辑 `main.js` 中的 `BrowserWindow` 配置：
```javascript
mainWindow = new BrowserWindow({
    width: 1000,    // 宽度
    height: 750,    // 高度
    minWidth: 800,  // 最小宽度
    minHeight: 600  // 最小高度
});
```

---

## 📝 可用命令

| 命令                  | 说明           |
| ------------------- | ------------ |
| `npm start`         | 开发模式运行       |
| `npm run build`     | 打包成安装程序和便携版  |
| `npm run build:dir` | 仅打包目录（测试用）   |
| `npm run pack`      | 预打包（不生成安装程序） |

---

## 🎯 打包后的使用

### 安装版
1. 双击 `小学数学口算出题器 Setup 1.2.7.exe`
2. 选择安装位置
3. 安装完成后桌面和开始菜单会生成快捷方式

### 便携版
1. 双击 `小学数学口算出题器-1.2.7-Portable.exe`
2. 直接运行，无需安装
3. 可复制到任意位置使用

---

## 📌 注意事项

1. **首次打包**：需要下载 Electron，可能需要较长时间
2. **杀毒软件**：部分杀毒软件可能误报，添加信任即可
3. **文件大小**：打包后约 80-120MB（包含 Chromium 内核）
4. **系统要求**：Windows 7 及以上版本

---

## 📊 版本信息

- **应用版本**: v1.2.7
- **Electron**: v28.0.0
- **electron-builder**: v24.9.1

---

*创建日期：2026年2月*
*作者：AI库*
