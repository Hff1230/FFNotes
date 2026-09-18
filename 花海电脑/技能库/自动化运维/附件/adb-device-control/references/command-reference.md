# adb 命令全量参考（按 adb-device-control 技能域组织）

> 来源基准：[Android Debug Bridge (adb) — Android Developers（官方）](https://developer.android.com/tools/adb)，访问日期 2026-08-14。
> 标注约定：【官】= Android 官方文档背书；【实证】= 本机实测固化（emulator-5554 / Android 9 / 雷电9 / adb 35.0.1，2026-08-14/15，证据见 `evidence/` 各目录）；【社区】= 社区验证，官方文档无此章节。
> 本技能所有 adb 调用统一经 `python ${HERMES_SKILL_DIR}/scripts/adbctl.py <子命令>`（路径解析/超时/解码已封装）；下表"原始命令"列供理解底层与手工排障用。

## 1. 设备管理（devices.py ↔ 子命令 env / devices / ls2 / connect）

| 用途 | 原始命令 | 备注 |
|---|---|---|
| 列设备（结构化） | `adb devices -l` | 【官】serial/state/model/product/transport_id |
| 指定设备执行 | `adb -s emulator-5554 <cmd>` | 【官】多设备必带 -s；单台可省 |
| 连接模拟器 | `adb connect emulator-5554` | 【实证】emulator-xxxx 由 adb server 自动发现，直连形式幂等（实际无需 connect） |
| 连接网络设备 | `adb connect 127.0.0.1:5555` | 【官】IP:port 形式；Android 11+ 无线调试需先 `adb pair IP:port CODE` |
| 查询 adb 版本 | `adb version` | 【官】本机 G:\sdk 35.0.1；雷电自带 34.0.4（禁用，见 windows-pitfalls §1） |
| USB 调试开关 | 设置 → 开发者选项 | 【官】真机需启用 USB debugging；授权弹窗"始终允许"后 state=device |

雷电实例表（非 adb）：`ldconsole list2`（GBK，十字段）→ 详见 [ldconsole-reference.md](ldconsole-reference.md)。

## 2. 输入交互（input_ops.py ↔ tap / swipe / key / text）

| 用途 | 原始命令 | 备注 |
|---|---|---|
| 点击 | `input tap <x> <y>` | 【官】坐标原点左上；越界前置校验（wm size 范围内） |
| 滑动 | `input swipe <x1> <y1> <x2> <y2> [duration_ms]` | 【官】duration 默认 300ms |
| 按键 | `input keyevent <code>` | 【官】4=back 3=home 25/24=volume 26=power…（技能内提供键名表） |
| ASCII 文本 | `input text '<s>'` | 【官】**空格必须 `%s`**；单引号 `'\''`；`& < > ; \| ( ) " ! # ~ ^ = + @ $ * \` 单引号内全字面；`%s` 替换单次不递归（`a%%sb`→`a% b`），**打不出字面 %s**【实证】；空串 no-op【实证】 |
| 中文文本 | `ldconsole action --index N --key call.input --value 文本` | 【实证】`input text` 中文 → rc=137 进程被杀；雷电走 call.input（rc=0 无输出即成功）；真机中文需 ADBKeyBoard（v1 仅文档化，见 windows-pitfalls §5）【社区】 |

## 3. 屏幕采集（capture.py ↔ screenshot / record / size）

| 用途 | 原始命令 | 备注 |
|---|---|---|
| 截图（二进制安全） | `adb -s <serial> exec-out screencap -p` | 【官+实证】**必须 exec-out**；`adb shell` 通道 LF→CRLF 损坏 PNG（Android 12+ Windows 主机，[fastlane #29548](https://github.com/fastlane/fastlane/issues/29548)【社区】）；产物校验 PNG 魔数 `\x89PNG` |
| 录屏 | `adb shell screenrecord --time-limit <N> /sdcard/x.mp4` | 【官】上限 180s（默认即最大）、无音频；结束 `exec-out cat` 拉取后清理设备端 |
| 分辨率/密度 | `wm size` / `wm density` | 【官】本机 540x960 / 240 |

## 4. 应用管理（appmgmt.py ↔ apps / install / uninstall / launch / killapp / foreground）

| 用途 | 原始命令 | 备注 |
|---|---|---|
| 列应用 | `pm list packages [-3] [-f]` | 【官】-3 仅第三方；-f 带 APK 路径 |
| 安装 | `adb install [-r] [-g] <apk>` | 【官】-r 保留数据重装、-g 授予运行时权限；APK 本地路径用 `D:/` 形式【实证】 |
| 卸载 | `pm uninstall <pkg>` | 【官】系统应用不可卸（仅 `uninstall --user 0`） |
| 启动（免 activity） | `monkey -p <pkg> -c android.intent.category.LAUNCHER 1` | 【实证】成功 rc=0 + stdout "Events injected: 1"；包不存在/无 LAUNCHER → rc=252 + "** No activities found to run, monkey aborted."（stderr "call exit callstack! status=-4" 为噪音） |
| 启动（指定组件） | `am start -n <pkg>/.<Activity>` | 【官】相对名 `.Act` 展开 `pkg/.Act`【实证】；**已在前台时 rc=0 + stderr "Warning: Activity not started, intent has been delivered to currently running top-most instance." 属成功**【实证 2026-08-15】 |
| 强停 | `am force-stop <pkg>` | 【官】立即终止，不回调生命周期 |
| 查 LAUNCHER 入口 | `cmd package resolve-activity --brief <pkg>` | 【官】最后一行即组件名 |
| 前台识别① | `dumpsys window \| grep mCurrentFocus` | 【社区】窗口焦点，含弹层/对话框/输入法覆盖 |
| 前台识别② | `dumpsys activity activities \| grep mResumedActivity` | 【社区】Activity 生命周期；两者可能不一致须同看【实证】 |

## 5. UI 元素定位（uidump.py ↔ dump / find）

| 用途 | 原始命令 | 备注 |
|---|---|---|
| 层级 dump | `uiautomator dump /sdcard/window_dump.xml` → `exec-out cat` | 【社区】默认落盘路径；用 exec-out cat 拉取（避开 pull 路径坑）；**息屏报 `ERROR: null root node returned by UiTestAutomationBridge`**【实证】 |
| 元素字段 | XML 节点属性 | 【社区】resource-id / class / text / content-desc / bounds |
| 坐标计算 | bounds `[x1,y1][x2,y2]` → center=((x1+x2)/2, (y1+y2)/2) 整数化 | 【社区】center 直接喂 `input tap` |

## 6. 排障命令（异常时手工使用）

| 用途 | 原始命令 | 备注 |
|---|---|---|
| 查看日志 | `adb logcat [-d]` | 【官】-d dump 后退出 |
| 重启 adbd（设备端） | `adb -s <serial> reboot` 或开发者选项里切 USB 调试 | 【官】**主机侧 `adb kill-server` 禁用**（双 adb 版本互踢，见 windows-pitfalls §1） |
| 文件推/拉 | `adb push <local> /sdcard/` / `adb pull` | 【官】local 路径用 `D:/` 形式 |
| 设备端 shell | `adb -s <serial> shell <cmd>` | 【官】已 root 的雷电可用任意命令 |

## 来源清单（访问日期均为 2026-08-14）

- 【官】Android Developers — Android Debug Bridge (adb)：https://developer.android.com/tools/adb
- 【官】screenrecord 命令行工具：https://developer.android.com/tools/screenrecord（并入 §3）
- 【社区】LDPlayer 英文文档 — Introduction to LDPlayer CLI：https://www.ldplayer.net/blog/introduction-to-ldplayer-command-line-interface.html
- 【社区】fastlane issue #29548（Android 12+ Windows 截图损坏）：https://github.com/fastlane/fastlane/issues/29548
- 【社区】senzhk/ADBKeyBoard（真机中文输入方案）：https://github.com/senzhk/ADBKeyBoard
- 【实证】本机证据目录 `evidence/`：A-DEV-02（设备/GBK）、A-UIO-03（输入/转义矩阵）、A-CAP-04（截图/录屏）、A-APP-05（应用/monkey）、A-UIO-06（dump/find）、A-DOC-07（19 子命令复验 + launch Warning 修复）
