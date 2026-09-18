# 倩女幽魂手游（com.netease.l10）实测记录

只记录**真正验证过**的部分，未验证的列在末尾。

## 设备与坐标空间（已实测）

- 真机 HUAWEI nova 6：`ro.product.model=WLZ-AL10`（内部型号）、`ro.product.marketname=nova 6`（市场名）、
  `ro.build.display.id=WLZ-AL10 4.2.0.121(C00E121R3P3)`（HarmonyOS 4.2，Android 12 基座）。
  adb（adb-device-control 捆绑 v35.0.1）直连即 `device`，**无需 hdc**（DevEco 的 hdc 只对 OpenHarmony 设备有用）。
- `wm size`：`Physical size: 1080x2400` + `Override size: 720x1600`；density 480 / 320。
- 游戏**横屏**：`dumpsys window displays` → `base=720x1600 ... cur=1600x720`、`mRotation=ROTATION_90`、
  `mAppBounds=Rect(90, 0 - 1600, 720)`（左侧 90px 挖孔区，游戏仍整屏绘制）。
- 横屏下 `screencap` 输出 **1600x720**（PNG IHDR 实测），uiautomator `root rotation=1`、node 最大 x=1510。
  → 三者同一坐标空间：**截图像素直接当 tap 坐标**，不要按 1080x2400 缩放。
- uiautomator 对该游戏几乎无用：dump 只有 6 个 node、`text` 全空。

## 启动与更新流程（已实测）

1. `adbctl.py --serial <S> launch com.netease.l10`（monkey 免 activity + LAUNCHER category）→ 成功。
2. 加载图（左下「修复客户端」、右下版本号 `3.73.9300.0`）→ 底部「正在下载更新(769.6MB/1486.4MB)」，实测 ~5.5MB/s（65s 涨 367MB）。
3. 客户端更新完成后**直接弹登录界面**，同时底部继续「正在下载重要资源…(89.9MB/1388.3MB) 4.9M/s」。
   → 两段合计约 2.9GB；4.9~5.5MB/s 下首次安装约 9 分钟。**别把「还没进游戏」当卡死**。
4. 登录界面（网易账号邮箱登录，居中白色弹窗）：邮箱会预填上次账号、**密码框为空**；
   按钮：红色「登录」居中、左下「没有账号？立即注册」、右下「忘记密码」、弹窗右上「X」关闭。
   **密码必须用户本人输入**（安全红线）—— 停手请用户输完，再接管点「登录」。

## 华为 USB 连接坑（已实测，2026-09-18）

- 设备会从 `device` **掉成 `offline`**（不是 `unauthorized`）：原因是华为把 USB 连接方式
  从「传输文件」自动回落成「仅充电」。
- 处置：下拉通知栏把 USB 连接方式**再改一次「传输文件」**，或重插线；改完别锁屏/息屏。
- 若 adb 在 `device`/`offline` 之间反复横跳，说明线材/口接触不良，换线或换口。
- 注意：他改 USB 方式时通知栏(`NotificationShade`)会留在前台，这是**他在用手机**的信号，
  此时不要抢屏操作。

## 待补（尚未验证，跑通后再补）

- 日常面板入口与各条日常任务的路径/按钮坐标；
- 自动寻路、自动战斗开关位置与「已在挂机」的判定；
- 登录后是否还有选服/选角色/公告层；
- 是否存在「一键日常」聚合入口（有则优先走它）。
