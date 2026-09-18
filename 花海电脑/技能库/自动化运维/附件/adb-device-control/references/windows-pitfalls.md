# Windows 环境坑全录（双 adb / GBK / 路径 / offline-unauthorized + 实测事实全文）

> 本机环境：Windows 10 / git-bash (MSYS) / Python 3.11.7 / G:\sdk adb 35.0.1 / 雷电 LDPlayer 9（自带 adb 34.0.4，`D:\soft\leidian\LDPlayer9\`）。
> 所有"【实证】"条目均于 2026-08-14/15 在 emulator-5554（Android 9, 540x960, 240dpi）实测，证据：`evidence/A-DEV-02 ~ A-DOC-07` 各 REPORT。

## §1 双 adb 版本冲突（最危险坑）

**现象**：本机存在两个 adb —— `G:\sdk\android-sdk\platform-tools\adb.exe`（35.0.1）与雷电自带 `D:\soft\leidian\LDPlayer9\adb.exe`（34.0.4）。client 与 server 版本不一致时 adb server 会被反复互踢（设备列表闪断、`adb devices` 瞬时空）。

**规则（技能已固化，人工操作同样适用）**：
1. **钉死单一 adb**：全程只用单一 adb。**本技能已捆绑同版本 adb（`scripts/tools/adb.exe`，35.0.1，含 `AdbWinApi.dll`/`AdbWinUsbApi.dll`），优先使用捆绑副本以彻底规避冲突**。技能 `adb_env.resolve_adb()` 解析顺序：捆绑 `scripts/tools/adb.exe`（命中打 `(bundled)` 标识）→ env `ADB_PATH` → `ANDROID_HOME\platform-tools` → PATH → 常见位置扫描；发现与雷电版本不同时打印警告（stderr 的 `[adb_env] 提示:` 行为预期输出，非错误）。
2. **严禁执行雷电目录 adb.exe**。
3. **严禁 `adb kill-server`（含自动化脚本）**：重启 server 会触发与雷电 adb 的再次竞争；只允许作为提示文本输出给用户。设备端恢复用 `adb -s <serial> reboot` 或重启模拟器实例。

## §2 GBK 乱码（ldconsole 输出契约）

- ldconsole 全部输出为 **GBK**：必须 bytes → `.decode('gbk')`；UTF-8 严格解码直接 UnicodeDecodeError（实证原始字节 `0\xc0\xd7...`）【实证】
- 解码失败容错：回退 `errors='replace'` 并在输出标注原始字节（技能 devices.py 已实现）
- 反向：向 ldconsole `action --key call.input --value 中文` 传参**无需编码处理**（CreateProcessW 宽字符）【实证】
- adb shell 输出为 UTF-8（Android 端），与 ldconsole 相反，勿混用解码方式

## §3 路径转换（git-bash / MSYS）

- git-bash 下 `/d/foo.apk` 形式**原生 Windows exe 不认**（adb/aapt/keytool 均报"找不到"）【实证：aapt 报 `Asset package include '\g\sdk\...' not found`，2026-08-15】
- 统一用 `D:/foo.apk`（正斜杠 + 盘符）形式——Windows API 接受，bash 引号内不转义
- 技能内所有本地路径（screenshot/record/install/dump 落盘）已自动归一化：`\` → `/`、`/d/…` → `D:/…`、相对 → 绝对
- Python 侧读写 UTF-8 BOM 文件：`open(p,'rb').read().decode('utf-8-sig')`（契约 C9）

## §4 offline / unauthorized 恢复流程

| 状态 | 含义 | 恢复 |
|---|---|---|
| `device` | 正常 | — |
| `offline` | adb server 认为设备未响应 | ① 拔插 USB / 重启模拟器实例（`ldconsole quit --index N` + `launch`）② 仍不行：开发者选项里"撤销 USB 调试授权"后重授权 ③ **勿 kill-server**（§1） |
| `unauthorized` | 设备端未信任本机 RSA 密钥 | 设备屏幕上点"允许 USB 调试"（勾选始终允许）；屏幕锁定时先解锁；雷电默认已信任 |
| 列表为空 | server 竞争或 adbd 未起 | 先 `adb devices` 多刷两次；确认未误跑雷电 adb（§1）；无线调试走 `adb pair` |

## §5 真机中文输入（ADBKeyBoard 手动方案，v1 不自动安装）

1. 下载 [senzhk/ADBKeyBoard](https://github.com/senzhk/ADBKeyBoard)（访问 2026-08-14）的 ADBKeyboard.apk 并 `adb install -r`
2. 设备上切换默认输入法为 ADB KeyBoard
3. 注入：`adb shell am broadcast -a ADB_INPUT_TEXT --es msg '你好'`（ASCII 仍走 `input text`）
4. 用毕切回原输入法。技能 v1：非雷电 serial 的中文输入会报错并打印本方案提示。

## §6 十条实测事实全文（SKILL.md Pitfalls 的细节版）

1. **ldconsole GBK / list2 十字段 / 端口规则**：list2 十字段逗号分隔（index,标题,HWND×2,运行,PID×2,宽,高,DPI）；标题 GBK 中文；index i → emulator-(5554+2i)；标题含逗号时字段 >10 需并回标题。【A-DEV-02】
2. **中文输入**：雷电 `ldconsole action --index N --key call.input --value 文本` rc=0 立即生效；`input text 中文` → **rc=137**（java.lang.Exception: call killProcess，input 进程自尽），字段不变。【A-UIO-03】
3. **input text 转义矩阵**：空格→`%s`（**一次性、从左到右、不递归**：`a%%sb`→`a% b`；**无法打出字面 `%s`**）；单引号用 `'\''`（`'it'\''s'`→it's）；`& < > ; | ( ) " ! # ~ ^ = + @ $ *` 单引号包裹内**全字面**（`'a b&c<d>e'` 一次通过）；孤立 `%` 无特殊含义；空串为 no-op（rc=0）；反斜杠单引号内字面不翻倍（`'a\b'`→恰 1 个 `\`）。裸空格/裸 `&`（未加引号）被设备端 shell 拆参 → "Invalid arguments for command: text"。【A-UIO-03 08/09/12 矩阵 JSON】
4. **monkey 免 activity 启动**：成功 rc=0 + stdout 含 "Events injected: 1"；包不存在/无 LAUNCHER Activity → **rc=252** + stdout 标志行 "** No activities found to run, monkey aborted."（stderr "call exit callstack! status=-4" 为 monkey 内部噪音，不影响判定）。【A-APP-05】
5. **截图必须 exec-out screencap -p**（bytes 直落盘 + PNG 魔数 `\x89PNG` 校验；`adb shell` 通道 LF→CRLF 损坏 PNG，Android 12+ Windows 已证）；**录屏 ≤180s 无音频**；**息屏时** screenrecord 与 uiautomator dump 同报 `ERROR: null root node returned by UiTestAutomationBridge` → 先唤醒屏幕。【A-CAP-04】
6. **前台识别双信号**：`mCurrentFocus`（窗口焦点，含弹层/对话框/输入法覆盖）与 `mResumedActivity`（Activity 生命周期）**可能不一致**，须同时取并比对（技能 `foreground` 双取 + 差异标注）。【A-APP-05，社区方法非官方章节】
7. **双 adb 冲突**：G:\sdk 35.0.1 vs 雷电 34.0.4，必须钉死单一 adb；**禁 kill-server 自动化**（详见 §1）。【本地实证】
8. **LDPlayer9 硬键盘模式**：即使焦点在 EditText（`focused=true`、`mIsInputViewShown=true`）软键盘也**不渲染**（截图复核无键盘 UI）→ 验证输入要看 dump 的 text 属性，不要等键盘出现。【A-UIO-03】
9. **git-bash 路径**：`/d/` 前缀 adb 等原生 exe 不认 → 用 `D:/` 形式（技能内 `normalize_local_path` 已实现；§3 有 aapt 实证）。【A-CAP-04/A-DOC-07】
10. **launch 组件与前台 Warning**：相对 activity 名 `.Act` 自动展开 `pkg/.Act`（含 FQCN/短名分支）；`pm install-existing com.android.settings` 可旁证安装路径；应用已在前台时 `am start` rc=0 + stderr "Warning: Activity not started, intent has been delivered to currently running top-most instance." **属成功**（语义"已在目标界面"），仅 rc!=0 才失败——技能 CLI 以 ok:true + warning 字段呈现（A-DOC-07 修复，实测 2026-08-15 双场景：前台重复 launch ok:true+warning；force-stop 后冷启动 ok:true）。【A-APP-05/fix_case3 + A-DOC-07】

## 附：adb_env 版本探测瞬时 v0 现象

并发繁忙时 `adb version` 输出解析偶发失败，警告行显示 "adb v0"（实为解析回退值），命令本身 exit=0 不受影响；非缺陷，重跑即恢复。【A-DOC-07 quickref-runs.txt 备注①】
