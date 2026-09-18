# ldconsole 命令参考（雷电模拟器 LDPlayer 9）

> 来源：[雷电官方论坛命令行整理贴](https://www.ldmnq.com/forum/30.html)、[雷电9 adb 连接官方教程](https://help.ldmnq.com/docs/LD9adbserver)（官方），访问日期 2026-08-14；[LDPlayer 英文文档](https://www.ldplayer.net/blog/introduction-to-ldplayer-command-line-interface.html)（官方英文）。
> 本机基准（C11 实证）：`ldconsole.exe` 位于 `D:\soft\leidian\LDPlayer9\`（同目录 `dnconsole.exe` 等价别名）；技能经 `adb_env.resolve_ldconsole()` 解析（env `LDCONSOLE_PATH` → 常见位置扫描）。

## 1. GBK 契约（所有 ldconsole 输出）

- ldconsole 输出为 **GBK 编码**（实证字节 `0\xc0\xd7...`，UTF-8 严格解码必炸）【实证】
- 调用方式：`subprocess.run([列表参数], capture_output=True)` 拿 bytes → `.decode('gbk')`（失败回退 `errors='replace'` 并标注原始字节）
- `action --key call.input` 传中文**无需编码处理**（CreateProcessW 宽字符通道，rc=0 无输出即成功）【实证】

## 2. 命令表

### 2.1 实例管理（v1 文档收录，技能未封装为子命令）

| 用途 | 命令 |
|---|---|
| 启动实例 | `ldconsole launch --index 0`（或 `--name 雷电模拟器`） |
| 关闭实例 | `ldconsole quit --index 0` |
| 修改配置 | `ldconsole modify --index 0 --resolution 540,960,240 [--cpu 1 --memory 2048 ...]` |
| 新建/复制/删除 | `ldconsole copy --index 0`；`ldconsole remove --index 0`（慎用） |
| 备份/还原 | `ldconsole backup --index 0 --file <p>`；`ldconsole restore --index 0 --file <p>` |
| 排序/重命名 | `ldconsole sortWnd`；`ldconsole rename --index 0 --title 新标题` |

### 2.2 实例列举（技能 `ls2` 子命令已封装）

```
ldconsole list    → 每行一个实例标题
ldconsole list2   → 十字段逗号分隔（GBK）:
  index, 标题, 顶层HWND, 绑定HWND, 是否运行(1/0), VM进程PID, 前端进程PID, 宽, 高, DPI
```

本机实测输出（2026-08-14，A-DEV-02 证据 02-ls2.txt）：
`index=0 title=雷电模拟器 running=1 540x960 dpi=240 pid_vm=37160 pid_fe=32280 hwnd_top=395272 hwnd_bind=589926`
字段与 `wm size`/`wm density` 交叉验证吻合；标题含逗号时字段数 >10，多余字段并回标题（解析器已容错）。

### 2.3 action 指令表（`ldconsole action --index N --key K [--value V]`）

| --key | --value | 效果 | 实测 |
|---|---|---|---|
| `call.input` | 文本（可中文） | 向实例注入文本（等价键盘输入） | ✅ rc=0 无输出，字段立即出现"你好世界"【实证 2026-08-14】 |
| `call.reboot` | 无 | 重启实例 | 未实测（文档收录） |
| `call.launchapp` | `--value 包名` | 启动应用 | 未实测 |
| `call.quitapp` | `--value 包名` | 关闭应用 | 未实测 |
| `call.back` / `call.home` / `call.menu` | 无 | 导航键 | 未实测（v1 用 adb keyevent 等价实现） |
| `call.shake` / `call.locate` | 坐标 | 摇一摇/虚拟定位 | 未实测 |
| `call.resize` | 宽,高,dpi | 改分辨率 | 未实测 |

> 注意：官方论坛帖中 action 的文本参数名是 `--value`（非 `--text`）；无参运行 `ldconsole action` 可打印 usage（权威形态以 usage 为准）【实证】。

### 2.4 adb 包装

```
ldconsole adb --index 0 --command "devices"     # 包装 adb 命令作用于实例
ldconsole adb --index 0 --command "shell wm size"
```

**本技能不用此包装**：技能钉死 `G:\sdk\...\platform-tools\adb.exe`（35.0.1）直连 serial，避免 ldconsole 内嵌 adb（34.0.4）版本互踢（见 [windows-pitfalls.md](windows-pitfalls.md) §1）。

## 3. 端口规则（C3）

- 实例 index `i` → adb serial `emulator-(5554 + 2*i)`（i=0→5554, 1→5556, 2→5558, 5→5564）【官方教程背书 + 实证 index_to_serial 换算全对】
- emulator-xxxx 形式由 adb server **自动发现**，无需 `adb connect`（connect 幂等无害）
- 兜底：`adb connect 127.0.0.1:(5555+2*i)`（非官方，仅在直连发现失败时尝试）
- 反查：serial → index = `(端口号 - 5554) / 2`（技能内 `serial_to_index`，非雷电 serial 返回 None → 中文输入自动降级报错并提示 ADBKeyBoard）

## 4. 未实测项声明（如实标注）

§2.1 实例配置类与 §2.3 中标注"未实测"的 action 指令**未在本机验证**（v1 范围外，仅文档收录）；已实测项：list2 解析（A-DEV-02）、call.input 中文（A-UIO-03 证据 14_call_input_chinese.png）、端口换算纯函数（A-DEV-02 04-pure-functions.txt）。
