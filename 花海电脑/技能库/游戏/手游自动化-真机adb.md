---
title: 手游自动化-真机adb
分类: 游戏
来源技能: mobile-game-automation
来源路径: C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\mobile-game-automation\SKILL.md
同步时间: 2026-09-18 18:08
tags: [技能库, 游戏, adb, android, game-automation, anti-detection, 拟人输入]
---

> [!info] 由 Hermes 技能自动导出（只读镜像）
> 源文件：`C:\Users\hufeifei.JOY\AppData\Local\hermes\skills\tools\mobile-game-automation\SKILL.md`
> 最后同步：2026-09-18 18:08　|　导出工具：`花海电脑/_工具/sync_skills.py`
> 改笔记不会改技能；要改内容请改源 SKILL.md 后重跑导出。

## 技能说明

PC 端 adb 驱动手游日常与挂机：拟人输入、横屏坐标、防检测、抢怪档节奏

# mobile-game-automation

把「在用户手机上跑手游日常」这类任务做成受控流程：**先定安全边界 → 再校准坐标 → 然后截图驱动 + 拟人输入逐步推进**。

底层 adb 原语（env/devices/screenshot/dump/tap/包管理/launch/killapp）一律走 `adb-device-control` 技能自带的 `adbctl.py`；本技能只写**游戏自动化特有**的东西：拟人节奏、横屏坐标空间、长流程电源/下载处理、安全红线。

> 支持文件（2026-09-18 已落盘）：
> - `scripts/human_input.py` — 拟人输入层（`check|size|tap|tapn|swipe|hold|key|shot|pause`）
> - `references/netease-l10-qiannvyouhun.md` — 倩女幽魂实测记录（坐标空间/启动流程/USB 坑）
> - `references/vision-layer-and-anticheat.md` — 运行时判别器实测标定 + 四通道反作弊分析（2026-09-18）
>
> 文末「附录 A/B」是上面两文件的**内联副本**，内容一致，留作离线参考。
>
> **落盘坑**：`skill_manage(action='write_file')` 解析不了本 profile 的技能名（报
> `Skill ... not found in active profile`），`write_file`/`patch` 也必须用
> **绝对路径** `C:/Users/hufeifei.JOY/AppData/Local/hermes/skills/tools/mobile-game-automation/...` 才生效。

## When to Use

- 用户要求「帮我在手机（真机/模拟器）上把某个手游的日常/签到/挂机/任务做完」
- 需要长时间在真机上模拟真人点击/滑动（挂机、自动寻路、循环领奖、重复刷本）
- 需要判断「游戏是卡死了还是在下载/加载」「这个界面该点哪里」

不适用：项目内游戏开发调试（Unity/Godot 见对应引擎技能）、纯 adb 系统操作（见 adb-device-control）。

## 用户硬性偏好（默认遵守，不必再问）

- **必须拟人**。用户会明确追加「注意模拟真人操作」。固定坐标、恒定间隔、`input tap` 式瞬时点击都属易识别的机器特征 → 一律走附录 A 的输入层。
- **进度必须主动报**。长耗时环节（下载/挂机/跑图）要报「在等什么、已等多久、还剩多少、下一步」，给实测数字（MB/s、剩余 MB、预计分钟）。闷着轮询后突然冒结果不可接受。
- **证据说话**：结论附截图/日志/数字，不用形容词。
- **阻塞在用户身上立刻说**：「需要你自己输密码」「请把游戏保持前台」——不要让流程静默卡住。

## 安全红线（不可越界）

1. **永不代填账号 / 密码 / 短信验证码**。到登录界面一律停手，请用户自己输入；用户回「填好了」后再接管点「登录」。
2. **白名单按钮**：日常 / 任务 / 自动寻路 / 自动战斗 / 领取 / 确定 / 继续 / 关闭 / 返回 / 背包查看。
3. **黑名单（绝不点）**：充值、商城、购买、元宝/仙玉/点券兑换、开礼包、礼包消耗、分解/炼化/销毁、摆摊/交易/寄售、删除角色、实名认证、加好友或给他人发消息。凡可能**花钱或不可逆**的按钮，遇到就停下问用户。
4. **不盲点**：每进入新界面先截图判读，再决定点哪；不确定的按钮宁可不点。
5. **风险如实说、不夸张**：脚本违反多数手游 ToS，网易等厂商有反外挂检测。开工前说明「我会尽量拟人，但封号风险由账号承担」，然后按用户决定执行。
6. 改手机设置（常亮/免打扰/超时）前告知用户，并说明跑完可恢复。
7. **【用户 2026-09-18 明确指令】福利 / 商城 / 易市（集市）相关界面：遇到就「直接关闭」，不深入探索、不采集内部按钮。**
   - 原因：这几类面板内部混着月卡/礼包/购买/回收入口，探索风险高于收益，且日常任务链路不需要它们。
   - 处置：打开仅用于确认「它是福利/商城/易市类」→ `find_bright.py <图> 0 140` 找 ✕ → 点掉 → `cmp.py` 确认回到已知界面。
   - 同理适用：任何发现含「元宝/仙玉/点券/购买/充值/月卡/礼包」字样的面板。
8. **【用户 2026-09-18】HUD 上的「状态开关」类按钮，点一次后必须点第二次还原。**
   已踩：「挂机」按钮点一下就把用户正在进行的自动战斗关掉了
   （标签「挂机中·」→「挂机」），随后再点一次还原并验证。
   → 采集任何**会改变游戏状态**的按钮（挂机/自动战斗/跟随/坐骑）都要还原。
9. **【用户 2026-09-18】「下一订单」界面：看到就直接关闭**（与福利/商城/易市同类处置）。
   `find_bright.py <图> 80 180 200 12` 可精确定位其 ✕（实测边界 x1097-1134/y100-139，中心 (1119,120)）。
10. **【用户 2026-09-18 核心要求】界面识别是为「图色识别」做准备的 —— 不要每次都读图（AI 视觉）。**
    - 运行时必须零 token，所以**建图期就要把"看图"降级为"程序读"**。
    - **首选 `scripts/ocr_panel.py <图> [ymin] [ymax] [conf]`**：本地 RapidOCR 一次性提取该屏
      **全部文字 + 精确坐标框**（实测 24 条文字 2.9s、置信度 >0.98、**零 token**），
      结果存 `<图>.ocr.json` 供程序化引用。→ 元素定位从此不靠目测、不靠 AI。
    - 高对比图标/✕ 用 `scripts/find_bright.py`；小控件状态变化用 `scripts/diff_region.py`；
      多元素一次读数用 `scripts/grid_overlay.py`（画坐标网格）。
    - **AI 视觉只在两种情况下用**：① 新界面**首次**语义定性（这屏是干什么的，只用一次）
      ② OCR 完全读不出时（如纯图标面板）。**绝不用它反复量坐标。**

## Procedure

0. **定范围**：确认游戏名/包名、要做哪些日常；把无法全自动的部分（组队、限时活动、真人对抗）提前说明。
1. **设备发现**：`adbctl.py env` / `devices`（**多设备在线必须 `--serial`**）；记下 model、系统版本、是否手机在前台。华为机 `ro.product.model` 是内部型号（WLZ-AL10），市场名在 `ro.product.marketname`。
2. **坐标校准**（关键）：`python scripts/human_input.py check`（附录 A）—— 由 `SurfaceOrientation` + `wm size` 推算当前坐标空间，并解析最新截图的 PNG IHDR 尺寸做对比，一致才继续。
3. **启动游戏**：`adbctl.py launch <pkg>`（monkey 免 activity）→ **等**（首启可能几 GB 下载，见 Pitfalls 2）。等待期间反复截图读进度数字，给用户 ETA。
4. **过登录/公告/选服选角**：逐张截图判读；涉及密码/验证码 → 停手叫用户。
5. **主循环 = 截图 → 判读 → 一个拟人动作 → 再截图核对**。一步只做一个动作，动作后必须截图确认界面确实变了；没变就换坐标/换策略，**不要连点**。
6. **长挂机/自动战斗**：优先用游戏内置的自动寻路/自动战斗，脚本只负责点「自动/继续/确定」并定期确认没被弹窗卡住。巡检间隔 30~60s，别高频截图（占带宽、也像机器）。
7. **收尾**：关自动战斗、恢复改过的设置（`svc power stayon false`、超时、免打扰），汇报「完成了哪些、哪些没做、为什么」。

## Pitfalls

1. **坐标空间 = 当前旋转，不是 Physical**。华为/多数机 `wm size` 输出 `Physical size: 1080x2400` + `Override size: 720x1600`；游戏横屏后 `dumpsys window displays` 是 `cur=1600x720`，`screencap` 出的 PNG 也是 1600x720（IHDR 实测），uiautomator dump 的 `root rotation=1`。三者同一空间 → **截图像素直接当点击坐标**；按 Physical 缩放会整体偏移。判断旋转：`adb shell dumpsys input | grep SurfaceOrientation`（1/3=横屏，0/2=竖屏）。注意刘海侧 app bounds 可能从 x=90 起，但游戏常整屏绘制 —— 以截图像素为准。
2. **首启是「两段下载」，且登录框会先弹出来**。倩女幽魂实测：先客户端更新（约 1.5GB）→ 完成后进登录界面，同时底部继续「正在下载重要资源…(x MB / 1388.3MB) 4.9M/s」。别把「一直没进游戏」当卡死：读进度条数字、算 ETA、报给用户；下载与点击互不干扰，可以先登录再等下载。
3. **uiautomator 对 Unity/Cocos 游戏几乎无节点**。实测某游戏 dump 只有 6 个 node、`text` 全空 → 定位只能靠**截图 + 视觉判读**，别指望 `dump`/`find --text`。
4. **息屏即采集失败**。息屏时 screencap/uiautomator 报 `ERROR: null root node returned by UiTestAutomationBridge`。长跑前：`input keyevent KEYCODE_WAKEUP` + `svc power stayon true`（= `stay_on_while_plugged_in 7`，插线常亮）+ `settings put system screen_off_timeout 1800000`。
5. **别在用户自己上手时操作**。他试玩/按 Play 期间的 tap 会与他抢屏、互相打断；要操作前先确认他没在用手机。
6. **来电/通知会打断长流程**。建议用户临时开免打扰 —— 先问再开。
7. **拟人节奏不是可选项**。固定 1.0s 间隔 + 同像素重复点击最像脚本；用对数正态间隔（中位 ~0.5s，偶发 1.2~3.5s 走神停顿）+ ±5~12px 坐标抖动 + 滑动拆 4 段带弧变速，见附录 A。
8. **不确定就停**。游戏弹窗常常「点了就消耗/就购买」——任何新弹窗先读文字再决定。
9. **华为机 USB 会从 `device` 掉成 `offline`**（不是 `unauthorized`）：USB 连接方式自动回落「仅充电」。处置：重插/换线/换口（**很多线只有充电芯，没有数据芯**）；开「仅充电模式下允许 ADB 调试」有帮助但不保证根治。`adb reconnect` 可用，但救不回物理链路问题。
10. **HarmonyOS 4.2 没有原生「无线调试」开关**（华为官方支持页确认，适用版本含 HarmonyOS 4.2）：无线 adb 必须**先 USB 连一次**再 `adb tcpip 5555` → `adb connect <IP>:5555`。**线是绕不过的第一步。** 另外 `adb kill-server` 字样会触发本机 hardline 阻断，多用行命令会被判为超长 payload 整条拒掉——拆成短命令。
11. **华为自 2018 年停止 bootloader 解锁 → 基本不能 root**：uinput 真触摸注入 / Magisk 方案对该机不可用；手机端注入只能走无障碍 `dispatchGesture`（`deviceId=-1`，且 `getEnabledAccessibilityServiceList()` 会被游戏直接读取）。
12. **界面识别禁止用全屏 aHash/dHash**（实测类间距离仅 3，完全不可用）。用①比色（采样点须落在纯色块深处：**11x11 平坦约束**，离边缘≥5px；**容差按实测类内漂移定，真机 5~10 就够 —— 勿用 35**，~2ms）②cv2 `matchTemplate`（1/1 全分辨率 24ms，阈值 0.70~0.85，**唯一能给坐标**）。OCR 必须 `use_det=False` 才够快（**9ms vs 1001ms**）且必须设**置信度阈值 ≥0.9**。**屏幕亮度不影响截图像素**（实测：差 250 级亮度，变化像素仅 0.0006%）。详见 `references/vision-layer-and-anticheat.md`。
13. **⚠️ 判断「注入是否生效」禁止用「焦点窗口是否变化」——会产生假阴性（已踩过）。**
   - **反例（实测）**：`input swipe` 下拉通知栏 → 焦点窗口始终是游戏，看起来"没生效"；
     但 logcat 里 `NavigationBarPolicy`/`InsetsPolicy` 明确显示事件**被正常接收处理**
     （`showTransient`→`hideTransient`）。原因是华为开了**手势导航**，
     `onFling::Gest_Navigation_Enable, return!` 把该 fling 交给了导航手势，状态栏只闪一下。
     → **焦点没变 ≠ 事件没到。** keyevent 会改焦点，触摸不一定。
   - **正确验法（唯一可信）：`截图A → 执行动作 → 截图B → 逐像素比对`**
     判定阈值：**变化>40 的像素占比 > 1%** 即认为画面确实变了。
     实测一次有效点击 = 变化>8 的 10.73% / 变化>40 的 3.70%。
     脚本参考：`E:/AiDemos/QnyhAuto/scripts/probe_tap.py`。
   - **华为「USB 调试（安全设置）」是否为触摸注入的必需前置 —— 未证实。**
     先前"必须开否则触摸被静默丢弃"的结论**基于上面那个无效的焦点法，已作废**。
     实测（该开关状态未确认）注入生效。→ **遇到"点不动"，先做像素比对确认事件是否到达，
     再查坐标/时机/目标是否响应，不要先归因于此开关。**
   - 另注：`adb kill-server` 字样会触发本机 hardline 阻断；多行长命令也会被判为超长 payload
     整条拒掉——**拆成短命令**。
14. **坐标必须全分辨率量，禁止目测缩略图（已踩，代价 ~20 轮试错）。**
   从 800x360 缩略图目测的坐标，**y 方向系统误差可达 50px**。实测：「是否要退出游戏」的
   「取消」按钮真实位置是 **x 580-718 / y 408-448（中心 649,428）**，而我目测成 (659,**378**)。
   后果：大目标（250x50 的「进入游戏」、175x200 的角色卡）能容忍误差，所以"看起来能点"；
   小目标（✕ 30x24、取消 138x40）全被打飞，于是表现出"某些按钮怎么点都没反应"的假象。
   - **工具**：`scripts/crop_zoom.py <图> x0 y0 x1 y1 [倍数] [输出]` —— 全分辨率裁剪放大后读数
   - **高对比元素（白色 ✕、亮色按钮）用程序检测更可靠**：
     `scripts/find_bright.py <图> y0 y1 [阈值=190] [最小面积=15]` —— 近白连通块 → 精确边界+中心
     （实测一次就精确命中 ✕：`边界 x1350-1380 y35-59 (30x24) 中心 (1364,48)`）
   - ⚠️ **不要把目测"外接矩形的角"当点击点**：✕ 是斜十字，四角基本是空的
   - ⚠️ `cv2.imread` 读不了中文路径 → 用 `np.frombuffer(open(p,'rb').read(), np.uint8)` + `cv2.imdecode`
15. **界面切换后不能立刻点。** Unity 按钮在界面刚出现时可能尚未进入可交互状态。
   实测**同一个 ✕**：界面刚出现时连点 8 次（含边界内坐标）全部 **0.00%**；放置几分钟后再点，
   **97.47% 一次生效**。→ **动作前先等动画稳定（≥1.5~2s）并截图确认已稳定**。
16. **"点击是否生效"的判据必须扣掉本底动效。**
   判据用 `截图A → 动作 → 截图B → 变化>40 的像素 > 1%`，但**先测该界面 1.5s 内的本底动效占比**：
   实测启动页的水面/花瓣会让 **3.7%** 像素变化，被我误判成"点击生效了"（其实没点中）。
   只有**明显超过本底**才算真生效；两者接近时改看"结果是否符合预期"（如目标界面是否出现）。
   游戏内 HUD 的本底动效约 **1.0~1.6%**，回到同一屏时差异应落在这个量级。
17. **🚨 新面板内部禁止盲点 —— 会点进充值页（已踩）。**
   实测：把「福利」面板里的「特权月卡」入口 (1331,121) 误当成 ✕ 点下去 →
   **直接打开了「特权月卡 68元购买 / 超值月卡 30元购买」充值页**。
   福利/活动类面板内部**混着月卡、礼包、充值入口**，坐标量错一个就可能踩到付费按钮。
   **规则**：进任何新面板后，
   ① 先截图分清「哪些位置是充值/购买入口」（标注出来，永不触碰）
   ② **只点量准的 ✕** 与**已确认用途的白名单按钮**（日常/任务/领取/确定/关闭/返回/背包）
   ③ 找不到 ✕ 时**宁可不点**，宁可让用户手动关，也不要盲试坐标
   ④ 面板 ✕ 位置**每个界面都不同**（活动面板 (1364,48)、福利面板无公开 ✕、
      月卡页 (1350,56)），用 `find_bright.py <图> 0 140` 扫顶部区域**程序化找 ✕** 最可靠
18. **小 UI 状态变化必须用「限定区域比对」，全屏比对会被本底动效淹没（已踩）。**
   实测：点「挂机」开关 → **全屏**变化仅 **1.29%**（落在 HUD 本底 1.0~1.6% 内）→ 误判"没反应"；
   把比对**限定到按钮区 (1420,280)-(1520,390)** 后 → 变化 **10.44%** vs 本底 **1.31%** → **8 倍，确认生效**。
   工具：`scripts/diff_region.py <图A> <图B> [x0 y0 x1 y1]`
   → 验证任何**小控件**的点击生效，都要先框出它的区域再比。
19. **⭐ 倩女幽魂「挂机」的判定与前置条件（用户提供的领域知识，2026-09-18，权威）**
   - **点完「挂机」后，屏幕中央会出现「挂机中」字样** —— 这才是自动战斗**真正生效**的指示。
     按钮自身标签（「挂机中·」/「挂机」）只反映**开关状态**，**不代表真的在打怪**。
     （已实测验证这一点：按钮标签是「挂机中·」时，屏幕中央并无「挂机中」→ 实际未生效。）
   - **前置条件：若角色处于「跟随」状态，必须先「取消跟随」才会进入挂机。**
     → 自动化顺序必须是：**先取消跟随 → 再开挂机 → 确认中央出现「挂机中」**。
     `.q` 的 `开始挂机` 里有 `点挂机×2 → 取消跟随`，**顺序要按本规则修正**。
   - 判定挂机是否生效：**读屏幕中央的「挂机中」**（比色/OCR 均可），不要只读按钮标签。
   - 相关坐标：挂机按钮 **(1468,333)**；队伍面板「取消跟随」≈ **(1200,644)**、「召唤跟随」≈ (1030,644)。

## 视觉层算法选型（2026-09-18 实测，脚本 `QnyhAuto/scripts/bench_tolerance.py`）

**结论：用 cv2 `TM_CCOEFF_NORMED` + 信息量门限；不要引入大漠插件。**

| 算法 | 判别准确率（180 次判定 / 12 种真实扰动） | 裕度（正确最低 − 错误最高） |
|---|---|---|
| 多点比色（拿文字当模板） | 无效（平坦点 0 个） | — |
| **cv2 归一化互相关** | **180/180 = 100%** | **+0.797 ✅** |
| 大漠式 FindPic（逐通道绝对差 + 比例） | 36/180 = 20%（delta 32/64/96 → 20.6/13.9/15.0%） | −0.287 ❌ |

- **大漠为什么追不上**：归一化互相关对**线性光照变化天生免疫**（减均值除标准差）；
  绝对差法不免疫，只能放宽容差，一放宽纯色区就虚高 → 出现「正确最低分 0.478 < 错误最高分 0.764」，
  单阈值分不开。且大漠默认 sim=0.9 比正确最低分还高，**默认参数下根本判不出**。
- **⚠️ `TM_CCOEFF_NORMED` 有纯色虚高陷阱**（已踩）：搜索区接近纯色（低方差）时相关系数虚高，
  实测别的界面模板在本界面纯色区拿到 **0.998**。**必须加信息量门限**：匹配处局部灰度 std < 10 即作废。
- **大漠插件在本机的真实状态**：`HKCR\dm.dmsoft\CLSID` 存在但 64 位/32 位视图**都无 `InprocServer32`**
  = 空壳残留（dm.dll 不在）；且本机三个 Python **全是 64 位**，无法加载 32 位 COM。
  要用须另装 32 位 Python + `regsvr32 dm.dll`（免费版仅 3.1233，含广告/功能受限，新版付费）。
- **大漠换不掉检测面**：它是 PC 侧视觉工具，点击仍走 adb。`getSource()=SOURCE_UNKNOWN`、
  `getDeviceId()=0`、`pressure=1.0` 等通道特征与视觉工具无关，游戏无需权限即可读。

## 建图（真实截图 → screens.json）

- **素材筛选**：只有 1600×720 全屏原生截图能建图；裁剪/放大图（`crop_*`/`*_3x`/`ocr_*`）尺寸不符须剔除。
- **全量 OCR 索引是地基**：`scripts/ocr_all.py` 对全部全屏图跑本地 OCR（~1.7s/张，149 张 137s，**零 token**），
  产出 `<图>.ocr.json`（含每条文字精确框 + 置信度）。
- **界面分组必须用 OCR 文本核对**（已踩）：`hud_00_a/b/01/02` 文件名像 HUD，OCR 显示内容是
  「九久同心」活动页 → 分组一错，后面「跨状态选点」全废。
- **判别 ROI 自动生成**：从建图期全屏 OCR 的精确框外扩 8px 固化成 ROI；
  运行时改用 `use_det=False` 只读该 ROI → **9ms，而不是全屏 1.5s**。
- **比色选点必须用 Fisher 判别准则（between/within），不要用「11×11 局部平坦约束」**（已踩）：
  实测在游戏 HUD 场景图上，要求某像素在所有样本图上局部 std < 1.5 时**满足率 0.000%**
  （flat p50 = 44.6 —— HUD 处处是建筑/NPC 细节，约束不可满足）。
  Fisher 比实测选出 16 点，类内最差 1.000 / 类间最好 0.438 → **裕度 +0.562 @ tol=6**。
- **容差取小不取大**：真机界面 1.2s 内仅 0.04% 像素变化（几乎静止）→ tol=6 裕度最大。
  旧版 tol=35 是拿「合成亮度扰动」标的，而**亮度对截图像素无影响**（实测），该值已作废。

20. **⭐ 判界面以「图色比对」为准，OCR 关键词会跨界面误配（2026-09-18 实机踩坑）。**
   - 实测：当前屏实为「大神福利/每日签到」面板，但 OCR 关键词判别把它判成 `hud`
     —— 因为面板左下角有「大神福利」(328,665)，子串匹配到了 HUD 的「福利」，
     偏移 **-877,+600** 也照样被接受。
   - **正确做法**：`cmp.py` 与已知界面截图逐像素比对 —— 实测与 `verify_welfare.png` 差异
     **0.37%** 一次锁定同一屏，而同期 `hud_final2.png` 是 **84.26%**，判据极清晰。
     **图色是「位置+像素」双重锁定，OCR 只是语义，同名文字跨界面会互相污染。**
   - 已修：全屏降级加 `DRIFT_MAX=300`（曼哈顿距离上限），关键词命中位置偏离建图位置过远即拒绝。
   - 判别优先级建议：**图色（比色/模板/cmp）> OCR 关键词**；OCR 只用于语义兜底。

21. **🚨 福利面板无 ✕，而「最像 ✕ 的位置」就是充值陷阱 —— 永不点它。**
   - 用 5 个已确认面板的 ✕ 当模板搜该屏：活动面板 ✕ 最高仅 **0.855**（且落在 (1453,583) 非典型位置）；
     背包 / 任务 / 队伍 ✕ 模板的最高分**全部落在 (1331,121)**。
   - (1331,121) = **「特权月卡」入口** —— 实测点下去直接打开「68元购买 / 30元购买」充值页。
   - 全屏白色连通块扫描（1346 个）**无一呈 ✕ 形状**。
   - **结论**：该面板无可用 ✕。**不要用「模板匹配硬找 ✕」这类方法关它** —— 高亮的充值入口
     会稳定拿到最高分，必然误点。宁可停下来问用户。

## Verification

```bash
CTL=C:/Users/<user>/AppData/Local/hermes/skills/tools/adb-device-control/scripts/adbctl.py
python "$CTL" env                                 # adb 版本 + 在线设备
python "$CTL" --serial <S> devices                # state=device
python scripts/human_input.py check               # 坐标空间 vs 截图尺寸（必须 OK）
python scripts/human_input.py shot D:/tmp/x.png   # 再用视觉读图判读界面
```

操作闭环：操作 → 截图 → 确认界面变化 → 再下一步。若 `check` 报不一致，先别点：以截图尺寸为准，并在一个**可逆的开关类 UI**（如展开/收起面板）上做一次探针点击确认落点，再继续。

## 附录 A — `scripts/human_input.py`（拟人输入层，零第三方依赖）

存成 `<skill_dir>/scripts/human_input.py` 后即可 `python human_input.py check|size|tap|tapn|swipe|hold|key|shot|pause`。环境变量 `PHONE`=目标 serial（多设备必填）、`ADB`=adb 路径（默认自动解析到 adb-device-control 捆绑的 adb.exe）。

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""拟人化 adb 输入层 —— 以接近真人的方式驱动游戏。

为什么不用 `adb shell input tap`：
  input tap 的 DOWN/UP 事件时间戳完全重合、坐标毫无抖动、循环间隔恒定 —— 这是游戏
  反外挂最易识别的机器特征。本层改用「零距离 swipe」制造带按下时长的真实 DOWN→UP，
  并给坐标 / 按下时长 / 动作间隔 / 滑轨弧度全部加随机化。
"""
import math, os, random, re, struct, subprocess, sys, tempfile, time

BUNDLED = os.path.join(os.path.expanduser("~"), "AppData", "Local", "hermes", "skills",
                       "tools", "adb-device-control", "scripts", "tools", "adb.exe")


def _resolve_adb():
    for c in (os.environ.get("ADB"), BUNDLED, "adb"):
        if not c:
            continue
        if c == "adb" or os.path.exists(c):
            try:
                subprocess.run([c, "version"], capture_output=True, timeout=20)
                return c
            except Exception:
                continue
    raise SystemExit("[human_input] 找不到可用 adb：设 $ADB 或确认 adb-device-control 技能已装")


def _resolve_serial():
    s = os.environ.get("PHONE")
    if s:
        return s
    out = subprocess.run([ADB, "devices"], capture_output=True,
                         timeout=30).stdout.decode("utf-8", "ignore")
    ds = [l.split()[0] for l in out.splitlines() if "\tdevice" in l]
    if len(ds) == 1:
        return ds[0]
    raise SystemExit("[human_input] 在线设备 %d 台，请用 PHONE=<serial> 指定" % len(ds))


ADB = _resolve_adb()
S = _resolve_serial()


def _run(args, timeout=60):
    return subprocess.run([ADB, "-s", S] + args, capture_output=True, timeout=timeout)


def _txt(args, timeout=60):
    return _run(args, timeout).stdout.decode("utf-8", "ignore")


_SCREEN = None


def probe(refresh=False):
    """返回 (W, H, rotation)：坐标空间 = 当前旋转后的显示尺寸。

    `wm size` 在华为等机上给 Physical + Override 两个值（1080x2400 / 720x1600），
    真正可用的是「旋转后的尺寸」；旋转角取 `dumpsys input` 的 SurfaceOrientation
    (0/2=竖屏, 1/3=横屏)。横屏游戏下 screencap 的 PNG 尺寸与之相同 → 截图像素即 tap 坐标。
    """
    global _SCREEN
    if _SCREEN is not None and not refresh:
        return _SCREEN
    o = _txt(["shell", "dumpsys", "input"])
    m = re.search(r"SurfaceOrientation:\s*(\d)", o)
    rot = int(m.group(1)) if m else 0
    o2 = _txt(["shell", "wm", "size"])
    m2 = (re.search(r"Override size:\s*(\d+)x(\d+)", o2)
          or re.search(r"Physical size:\s*(\d+)x(\d+)", o2))
    if not m2:
        raise SystemExit("[human_input] 解析不到屏幕尺寸: %r" % o2[:200])
    w, h = int(m2.group(1)), int(m2.group(2))
    if rot % 2 == 1:
        w, h = h, w
    _SCREEN = (w, h, rot)
    return _SCREEN


def _png_size(path):
    with open(path, "rb") as f:
        d = f.read(33)
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit("[human_input] %s 不是合法 PNG（息屏或截图中断？）" % path)
    return struct.unpack(">II", d[16:24])


def check():
    """核心自检：坐标空间 (W,H) 必须 == 截图 PNG 尺寸，否则点击会整体偏移。"""
    w, h, rot = probe(refresh=True)
    out = os.path.join(tempfile.gettempdir(), "_hi_check.png")
    shot(out)
    sw, sh = _png_size(out)
    ok = (w, h) == (sw, sh)
    print("SurfaceOrientation=%d -> 坐标空间 %dx%d ; 截图 %dx%d -> %s"
          % (rot, w, h, sw, sh,
             "OK 1:1（截图像素直接当 tap 坐标）" if ok
             else "不一致！以截图 %dx%d 为准，勿按 wm size 的 Physical 缩放" % (sw, sh)))
    return 0 if ok else 1


def _lognorm(lo, hi, mu):
    x = random.lognormvariate(math.log(mu), 0.55)
    return max(lo, min(hi, x))


def human_gap(extra=0.0):
    """两次动作之间的自然间隔；偶发「走神」长停顿，避免恒定节拍。"""
    t = _lognorm(0.25, 1.6, 0.55)
    if random.random() < 0.12:
        t += random.uniform(1.2, 3.5)
    t += extra
    time.sleep(t)
    return t


def _clamp(v, hi):
    return max(2, min(hi - 2, int(round(v))))


def tap(x, y, dur=None, jit=9, gap=True):
    """拟人点击：坐标抖动 + 随机按住 45~130ms（零距离 swipe 制造真实 DOWN→UP）。"""
    w, h, _ = probe()
    x = _clamp(x + random.uniform(-jit, jit), w)
    y = _clamp(y + random.uniform(-jit, jit * 0.7), h)
    d = dur if dur else random.randint(45, 130)
    _run(["shell", "input", "swipe", str(x), str(y), str(x), str(y), str(d)])
    if gap:
        human_gap()
    return x, y, d


def tapn(x, y, n=2, jit=11, gap=True):
    out = []
    for i in range(n):
        out.append(tap(x, y, jit=jit, gap=False, dur=random.randint(50, 140)))
        if gap and i != n - 1:
            human_gap(extra=random.uniform(0.15, 0.6))
    return out


def _ease(i, n):
    """变速权重：首段慢、中段快、尾段略慢（接近人手）。"""
    t = i / max(1, n - 1)
    return 0.55 + 0.9 * math.sin(math.pi * t) ** 0.7


def swipe(x1, y1, x2, y2, dur=None, seg=4, jit=6, gap=True):
    """拟人滑动：拆多段、带轻微侧向弧度、分段变速 —— 不描完美直线。"""
    w, h, _ = probe()
    total = dur if dur else random.randint(220, 480)
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / L, dx / L
    bow = random.uniform(-0.045, 0.045) * L
    pts = [(x1, y1)]
    for i in range(1, seg + 1):
        t = i / seg
        pts.append((x1 + dx * t + nx * bow * math.sin(math.pi * t) + random.uniform(-jit, jit),
                    y1 + dy * t + ny * bow * math.sin(math.pi * t) + random.uniform(-jit, jit)))
    wsum = sum(_ease(i, seg + 1) for i in range(seg))
    for i in range(seg):
        sd = max(30, int(total * _ease(i, seg + 1) / wsum))
        _run(["shell", "input", "swipe",
              str(_clamp(pts[i][0], w)), str(_clamp(pts[i][1], h)),
              str(_clamp(pts[i + 1][0], w)), str(_clamp(pts[i + 1][1], h)), str(sd)])
        time.sleep(min(0.02, sd / 5000.0))
    if gap:
        human_gap()
    return pts


def hold(x, y, ms=800, jit=6, gap=True):
    w, h, _ = probe()
    x = _clamp(x + random.uniform(-jit, jit), w)
    y = _clamp(y + random.uniform(-jit, jit), h)
    _run(["shell", "input", "swipe", str(x), str(y), str(x), str(y), str(int(ms))])
    if gap:
        human_gap()
    return x, y


def key(k, gap=True):
    _run(["shell", "input", "keyevent", k])
    if gap:
        human_gap()


def shot(out, gap=False):
    """截图：先落 /sdcard 再 pull（二进制安全，避免 shell 通道 LF→CRLF 损坏 PNG）。"""
    d = os.path.dirname(os.path.abspath(out))
    if d:
        os.makedirs(d, exist_ok=True)
    _run(["shell", "screencap", "-p", "/sdcard/_hi.png"])
    _run(["pull", "/sdcard/_hi.png", out], timeout=120)
    if not os.path.exists(out) or os.path.getsize(out) < 1000:
        raise SystemExit("[human_input] 截图失败（息屏？先 `key KEYCODE_WAKEUP`）")
    if gap:
        human_gap()
    return out


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        sys.exit(0)
    c = a[0]
    if c == "check":
        sys.exit(check())
    elif c == "size":
        print("%dx%d rotation=%d" % probe(refresh=True))
    elif c == "tap":
        print(tap(int(a[1]), int(a[2]), dur=(int(a[3]) if len(a) > 3 else None)))
    elif c == "tapn":
        print(tapn(int(a[1]), int(a[2]), int(a[3]) if len(a) > 3 else 2))
    elif c == "swipe":
        print(swipe(int(a[1]), int(a[2]), int(a[3]), int(a[4])))
    elif c == "hold":
        print(hold(int(a[1]), int(a[2]), int(a[3]) if len(a) > 3 else 800))
    elif c == "key":
        key(a[1])
    elif c == "shot":
        print(shot(a[1]))
    elif c == "pause":
        time.sleep(float(a[1]) if len(a) > 1 else human_gap())
        print("ok")
    else:
        print(__doc__)
```

## 附录 B — 倩女幽魂手游（`com.netease.l10`）实测记录（目标文件名 `references/netease-l10-qiannvyouhun.md`）

只记录**真正验证过**的部分，未验证的列在末尾。

**设备与坐标空间（已实测）**
- 真机 HUAWEI nova 6：`ro.product.model=WLZ-AL10`（内部型号）、`ro.product.marketname=nova 6`（市场名）、
  `ro.build.display.id=WLZ-AL10 4.2.0.121(C00E121R3P3)`（HarmonyOS 4.2，Android 12 基座）。
  adb（adb-device-control 捆绑 v35.0.1）直连即 `device`，**无需 hdc**（DevEco 的 hdc 只对 OpenHarmony 设备有用）。
- `wm size`：`Physical size: 1080x2400` + `Override size: 720x1600`；density 480 / 320。
- 游戏**横屏**：`dumpsys window displays` → `base=720x1600 ... cur=1600x720`、`mRotation=ROTATION_90`、
  `mAppBounds=Rect(90, 0 - 1600, 720)`（左侧 90px 挖孔区，游戏仍整屏绘制）。
- 横屏下 `screencap` 输出 **1600x720**（PNG IHDR 实测），uiautomator `root rotation=1`、node 最大 x=1510。
  → 三者同一坐标空间：**截图像素直接当 tap 坐标**，不要按 1080x2400 缩放。
- uiautomator 对该游戏几乎无用：dump 只有 6 个 node、`text` 全空。

**启动与更新流程（已实测）**
1. `adbctl.py --serial <S> launch com.netease.l10`（monkey 免 activity + LAUNCHER category）→ 成功。
2. 加载图（左下「修复客户端」、右下版本号 `3.73.9300.0`）→ 底部「正在下载更新(769.6MB/1486.4MB)」，实测 ~5.5MB/s（65s 涨 367MB）。
3. 客户端更新完成后**直接弹登录界面**，同时底部继续「正在下载重要资源…(89.9MB/1388.3MB) 4.9M/s」。
   → 两段合计约 2.9GB；4.9~5.5MB/s 下首次安装约 9 分钟。**别把「还没进游戏」当卡死**。
4. 登录界面（网易账号邮箱登录，居中白色弹窗）：邮箱会预填上次账号、**密码框为空**；
   按钮：红色「登录」居中、左下「没有账号？立即注册」、右下「忘记密码」、弹窗右上「X」关闭。
   **密码必须用户本人输入**（安全红线）—— 停手请用户输完，再接管点「登录」。

**待补（尚未验证，跑通后再补）**：日常面板入口与各条日常任务的路径/按钮坐标；自动寻路、自动战斗开关位置与「已在挂机」的判定；登录后是否还有选服/选角色/公告层；是否存在「一键日常」聚合入口（有则优先走它）。
