---
title: adb设备控制
分类: 自动化运维
来源技能: adb-device-control
来源路径: C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\adb-device-control\SKILL.md
同步时间: 2026-09-18 18:08
tags: [技能库, 自动化运维]
---

> [!info] 由 Hermes 技能自动导出（只读镜像）
> 源文件：`C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\adb-device-control\SKILL.md`
> 最后同步：2026-09-18 18:08　|　导出工具：`花海电脑/_工具/sync_skills.py`
> 改笔记不会改技能；要改内容请改源 SKILL.md 后重跑导出。

## 技能说明

单一 CLI（19 子命令）操作 Android 真机与雷电模拟器：设备发现、输入交互、截图录屏、应用管理、UI 元素定位

# adb-device-control

通过单一 CLI `python ${HERMES_SKILL_DIR}/scripts/adbctl.py <子命令>` 操作 Android 真机与雷电模拟器（LDPlayer 9），纯 Python 3.11 标准库、零第三方依赖。能力域：设备发现、输入交互（tap/swipe/key/文本，含雷电中文）、屏幕采集（截图/录屏/分辨率）、应用管理（列举/安装/卸载/启动/强停/前台识别）、UI 元素定位（uiautomator dump + find → 坐标）。

**调用形态（契约，勿绕过）**：
- 一律 `python ${HERMES_SKILL_DIR}/scripts/adbctl.py ...`（Windows 无 shebang，不依赖 cwd）
- 多设备在线时 `--serial emulator-5554` 置于子命令**之前**；单台可省略
- 破坏性操作（install/uninstall/killapp）执行前 CLI 会先打印目标 serial+pkg

## When to Use

- 需要在 Android 真机/雷电模拟器上自动化：点击、滑动、按键、输入文本（含中文）
- 采集屏幕状态：截图、录屏、查分辨率/密度、读取 UI 层级 XML、按条件定位元素坐标
- 应用生命周期：安装/卸载 APK、启动（免 activity）、强停、识别当前前台应用
- 雷电多实例管理：列实例表（list2）、端口换算（index i → emulator-5554+2i）
- adb 排障：设备 offline/unauthorized、版本冲突、GBK 乱码（见 references/windows-pitfalls.md）

不适用（v1 边界）：ADBKeyBoard 自动安装（真机中文仅文档化手动方案）、uiautomator2/scrcpy 等第三方依赖、ldconsole 实例配置类操作（modify/backup，仅文档收录命令表）。

## Quick Reference

> 以下 19 条全部于 2026-08-15 在本机在线模拟器（emulator-5554 / Android 9 / 雷电9）逐条真实执行通过，执行记录：`evidence/A-DOC-07/quickref-runs.txt`（路径相对技能仓库证据目录）。`CTL` 为 `python ${HERMES_SKILL_DIR}/scripts/adbctl.py` 的缩写。

**adb 来源（分发必需）**：技能自带 `scripts/tools/` 三件套 —— `adb.exe`（v35.0.1-11580240）、`AdbWinApi.dll`、`AdbWinUsbApi.dll`。Hub/URL 安装只复制「SKILL.md + 正文中显式点名的支持文件」，此三个文件必须点名、**缺一不可**（缺 DLL 的 adb.exe 无法启动，技能会自动回退 env/PATH/扫描）。`adb_env.resolve_adb()` 解析顺序：捆绑 `scripts/tools/adb.exe`（三件套齐全即首选，命中向 stderr 打 `(bundled)` 标识）→ env `ADB_PATH` → `ANDROID_HOME\platform-tools` → PATH → 常见位置扫描（含雷电兜底+警告）。

设备管理：
```bash
python ${HERMES_SKILL_DIR}/scripts/adbctl.py env                    # adb 路径+版本(捆绑命中标 bundled) / ldconsole / 在线设备
python ${HERMES_SKILL_DIR}/scripts/adbctl.py devices                # adb 设备列表（结构化）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py ls2                    # 雷电实例表（GBK→dict，含中文标题）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py connect emulator-5554  # 连接（emulator-xxxx 直连幂等）
```

输入交互：
```bash
python ${HERMES_SKILL_DIR}/scripts/adbctl.py tap 270 96                     # 点击坐标
python ${HERMES_SKILL_DIR}/scripts/adbctl.py swipe 270 500 270 200 300      # 滑动 x1 y1 x2 y2 [ms]
python ${HERMES_SKILL_DIR}/scripts/adbctl.py key back                        # back/home/menu/power/volumeup/... 或 keyevent 码
python ${HERMES_SKILL_DIR}/scripts/adbctl.py text "hello world"              # ASCII（空格自动 %s 转义）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py text "你好世界"                  # 雷电中文（自动走 ldconsole call.input）
```

屏幕采集：
```bash
python ${HERMES_SKILL_DIR}/scripts/adbctl.py screenshot D:/tmp/shot.png     # 截图（exec-out 二进制安全）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py record D:/tmp/rec.mp4 3        # 录屏 N 秒（≤180，无音频）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py size                           # 分辨率/密度（540x960 / 240）
```

应用管理：
```bash
python ${HERMES_SKILL_DIR}/scripts/adbctl.py apps                     # 第三方应用（-a 全部 -p 带 APK 路径）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py install D:/path/app.apk  # 安装（-r 重装 -g 授权）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py uninstall com.example.app
python ${HERMES_SKILL_DIR}/scripts/adbctl.py launch com.android.settings          # 启动（monkey 免 activity）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py launch com.android.settings .Settings # 指定 Activity（am start）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py killapp com.android.settings          # 强停
python ${HERMES_SKILL_DIR}/scripts/adbctl.py foreground               # 前台识别（focus+resumed 双信号）
```

UI 定位：
```bash
python ${HERMES_SKILL_DIR}/scripts/adbctl.py dump D:/tmp/ui.xml      # 层级 XML 落盘（可选参数）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py find --text 设置         # 子串匹配，JSON 输出含 center 坐标
python ${HERMES_SKILL_DIR}/scripts/adbctl.py find --rid android:id/title --cls TextView
```

多设备：`python ${HERMES_SKILL_DIR}/scripts/adbctl.py --serial emulator-5556 tap 270 96`（--serial 在子命令前）

## Procedure

典型流：**设备发现 →（可选 UI 定位）→ 输入操作 → 采集验证**。以"打开设置搜索项"为例：

1. **发现设备**：`adbctl.py env` 确认 adb/ldconsole 与在线设备；`devices` 看结构化列表；雷电多实例用 `ls2`（含 index/分辨率/运行状态）。
2. **（可选）UI 定位**：`dump D:/tmp/ui.xml` 取当前窗口层级；`find --text 关键词`（或 --rid/--desc/--cls 组合）拿 JSON，`center` 字段直接是可点坐标。
3. **输入操作**：`tap <center_x> <center_y>` 点击；`text "..."` 输入（ASCII 自动 %s 转义；中文在雷电自动走 call.input，非雷电会报错并给 ADBKeyBoard 提示）；`swipe` 滑动 / `key back` 返回。
4. **采集验证**：`screenshot` 前后对比（PNG 魔数自动校验）；`dump`+`find` 验证目标控件状态（如输入框 text 属性）；`foreground` 双信号确认目标应用确实在前台。

注意：坐标先验来自 `dump`/`find` 或 `size`（540x960 越界会被前置校验拒绝）；文字输入后软键盘不一定可见（雷电硬键盘模式），验证输入结果要**看 dump 的 text 属性**而非找键盘。

## Pitfalls

> 精要版；完整分析、证据与恢复流程见 `references/windows-pitfalls.md`。

1. **双 adb 版本冲突**：技能自带 tools/adb.exe（35.0.1）vs 雷电自带 adb（34.0.4），互踢 server。技能已钉死单一 adb：优先用技能自带 `scripts/tools/adb.exe`（35.0.1），无则回退 env `ADB_PATH`/`ANDROID_HOME`/PATH/常见位置扫描（`adb_env` 自动解析）；**任何情况下禁手工/自动化 `adb kill-server`**，也不要直接跑雷电目录 adb.exe。
2. **ldconsole 输出 GBK**：`list2` 中文标题必须 GBK 解码（UTF-8 必炸）；技能内已处理，自写脚本调 ldconsole 时须 bytes→`decode('gbk')`。
3. **雷电端口规则**：实例 index i → `emulator-(5554+2*i)`；`connect` 对 emulator-xxxx 直连形式幂等（adb 自动发现）。
4. **中文输入**：`input text` 中文 → 进程被杀 rc=137；雷电中文一律 `ldconsole action --index N --key call.input --value 文本`（rc=0 无输出即成功）。
5. **input text 转义**：空格→`%s`（单次、不递归，**打不出字面 %s**）；单引号 `'\''`；`& < > ; | ( ) " ! # ~ ^ = + @ $ * \` 单引号包裹内全字面；空串为 no-op。
6. **monkey 启动判定**：成功 rc=0 + "Events injected"；包不存在/无 LAUNCHER → rc=252 + "No activities found to run, monkey aborted."。
7. **截图必须 exec-out**：`adb shell screencap` 通道 LF→CRLF 会损坏 PNG；技能已用 exec-out + PNG 魔数校验，损坏即报错不静默。
8. **录屏**：≤180s、无音频；**息屏时 screenrecord/uiautomator dump 报 `ERROR: null root node returned by UiTestAutomationBridge`** —— 先唤醒屏幕再采集。
9. **前台识别双信号**：mCurrentFocus（窗口焦点，含弹层/输入法）≠ mResumedActivity（Activity 生命周期），可能不一致，须同时看（`foreground` 已双取并标注差异）。
10. **git-bash 路径**：`/d/...` 前缀 adb/aapt 等原生 exe 不认 → 统一 `D:/` 形式（技能内 screenshot/record/install/dump 路径已自动归一化）。
11. **launch 相对 Activity**：`.Act` 会自动展开为 `pkg/.Act`（am start -n 组件形态）；应用已在前台时 am start 返回 rc=0 + Warning，属**成功**（CLI 以 ok:true + warning 字段呈现）。
12. **雷电硬键盘模式**：焦点在 EditText 也不渲染软键盘（`mIsInputViewShown=true` 但无键盘 UI）→ 验证输入看 dump 的 text，别等键盘出现。

## Verification

每次会话首次使用前建议自检：

```bash
python ${HERMES_SKILL_DIR}/scripts/adbctl.py env         # adb 路径+版本 35.0.1（捆绑命中含 (bundled) 标识）+ ldconsole 路径 + 在线设备
python ${HERMES_SKILL_DIR}/scripts/adbctl.py devices     # 目标设备在线（state=device）
python ${HERMES_SKILL_DIR}/scripts/adbctl.py size        # 分辨率/密度正常返回
```

操作闭环验证（输入是否生效）：

```bash
python ${HERMES_SKILL_DIR}/scripts/adbctl.py screenshot D:/tmp/before.png   # 操作前
python ${HERMES_SKILL_DIR}/scripts/adbctl.py tap 270 96                     # 操作
python ${HERMES_SKILL_DIR}/scripts/adbctl.py screenshot D:/tmp/after.png    # 操作后对比
python ${HERMES_SKILL_DIR}/scripts/adbctl.py foreground                     # 前台确认
```

异常处置速查（详见 `references/windows-pitfalls.md` §4）：
- 设备 offline/unauthorized → 按恢复流程处理，勿 kill-server
- 截图/录屏/dump 报 null root node → 屏幕已息屏，先 `key power` 唤醒
- 中文输入失败且非雷电设备 → ADBKeyBoard 手动方案（references/windows-pitfalls.md §5）

## References

- `references/command-reference.md` — adb 命令全量参考（按本技能域组织，官方/非官方标注 + 来源链接）
- `references/ldconsole-reference.md` — ldconsole 命令表（launch/quit/modify/action 指令表/adb 包装）、端口规则、GBK 契约
- `references/windows-pitfalls.md` — Windows 双 adb 冲突 / GBK 乱码 / 路径转换 / offline-unauthorized 恢复 + 12 条实测事实全文
