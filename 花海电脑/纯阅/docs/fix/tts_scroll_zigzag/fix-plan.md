# 修复方案：滚动模式听书「来回滚动」（上下往复）

> 文档生成时间: 2026-10-17 18:40
> 关联问题: ISSUE-ZZ-001
> 基线: `E:\HuaweiReader` commit `5c2bf4e`（2026-10-17 17:57），版本 1.0.1(1000001)
> 验收设备: 平板模拟器 PurePad26（`hdc list targets` 实际端口，实测 5557；1920×2880@320 ⇒ 960×1440vp）
> 文档库唯一口径：`C:\FFH\FFNotes\花海电脑\纯阅\`

---

## 一、问题诊断

### 1.1 问题概述

| 属性 | 内容 |
|------|------|
| 问题ID | ISSUE-ZZ-001 |
| 报告人与时间 | 用户，2026-10-17 |
| 影响级别 | **P1**（用户明确口径：「滚动模式听书时严禁出现来回滚动问题」） |
| 影响模块 | `Reader.ets` 滚动模式跟读（`followFrontier`）＋所有写入同一 `scroller` 的路径 |
| 现象 | 平板模拟器上，**滚动模式**听书时视图上下往复（向前滚一下又退回来，反复）；用户要求「添加滚动日志排查」 |
| 当前状态 | 未修复。**根因按「待验假设」处理**，先落日志实测再改行为（见 §2.2 证据分级） |

### 1.2 问题描述

滚动模式听书的设计口径是「居中跟读、绝不回滚」（`04` 待办 #1/#2 与提交 `bc9918e` 的用户口径）。
实际在平板上出现视图上下往复，说明**至少有两个不同来源在同一时间窗内对 `this.scroller` 下令**，或**同一来源的两把尺交替算出相反的目标**。

### 1.3 代码事实（2026-10-17 只读核实，非记忆）

> 本节的每一条都用 `grep -n` 在 `entry/src/main/ets/pages/Reader.ets`（6070 行）实测过；技能笔记里过期符号已单独列出，**本方案不基于它们开工**。

**A. 跟读的驱动源（5 个，全部汇入 `followFrontier`）**

| 源 | 位置 | 目标字 |
|---|---|---|
| `seg` 段首对齐 | `1005`（`onSpeechSeg` 内 `followSpeech`） | 段首字 |
| `tick` 语速预测 | `1081`，`setInterval(…, 600)` 于 `1072` | 段首 + p×段长 |
| `start` 开听书 | `2955` | `currentSpeechOffset()` |
| `recenter` 改字号重居中 | `2114` / `2118`(+120ms) / `2123`(+350ms) | 每次重取 `currentSpeechOffset()`，且 `frc=true` **重置地板**（`1223-1224`） |
| `realC` 兜底硬跳 | `1202`（`getItemRect` 取不到时 `scrollToIndex(CENTER)`，1.2s 节流） | 当前块 |

**B. 同一个 `followFrontier` 内部有 3 套 `want` 计算式，跨拍会切换**

- 估算尺子：`centerTarget()` `1348` → `pixelOfLocal()` `1363`，得 `want`（`1175`）；
- 真实坐标：`blockRealCenterOnScreen()` → `realC`，得 `want2 = clamp(curY + dev, 0, maxScroll)`（`1178`）；
- 硬跳兜底：`scrollToIndex`（`1202`）。

`realC` 时有时无 ⇒ **两把尺交替拉**是历史已记录的「章首来回乱滚」成因（见技能 `references/scroll-follow-positioning.md`）。

**C. 听书期间「不滚」的闸只有两道，且都很弱**

- `followFrontier(1110)` 本身**不检查 `ttsPlaying`**（只检查 `chapters` / `viewport` / `userHoldUntil` / `pageMode`）；
- `userHoldUntil` 在听书时**恒为 0**：开听书 `2916` 清零，`onTouch Down` 在 `ttsOpLock()` 为真时（`5952-5960`）**刻意不写**；
- ⇒ 实际只有 ① `followFloor` 单调地板（`1239-1240` / `1261-1262`）② 死区 `CENTER_DEADZONE_FRAC=0.08`（`94`）在起「不滚」作用。

**D. 4 条移动视口的路径在听书期间完全没有闸**

| # | 位置 | 触发 | 备注 |
|---|---|---|---|
| 1 | `restoreScrollToOffset()` `2093`（`animation:false`，0 / 60 / 200ms 三次） | 改字号 `2030`（**在 `2034` 的 tts 早退之前无条件执行**）、整窗真实底校正 `2241`、`onAreaChange` 可视高变化 `5891` | 与 `recenterNow` 的三次 `followFrontier` 叠加，一次改字号最多 **6 次下令** |
| 2 | `settleChapterScroll()` `4819`（300ms 后 `scrollTo(0 或 maxScroll)`） | `gotoChapter` `4878`（含**听书自动续章**） | 只判 `pageMode`，不判 `ttsPlaying` |
| 3 | `gotoChapter()` `4854` 立即 `scrollTo(0)` | 目录/按钮/`onSpeechDone` 自动续章 | 同上 |
| 4 | `smoothScrollStep()` `3850` / `startAuto()` `3827` | 自动滚动（topBar `5014`、`5445`、空格键 `3926`） | 无 `ttsPlaying` 判断，与跟读共用 `scroller` |

**E. 换章会主动打开「允许回滚」窗口**

`buildBlocks` 在 `4223` 置 `followFloor = -1`（换章重建窗口必然走这条路）；紧接着 `gotoChapter:4854` 归零、`settleChapterScroll:4819` 300ms 后再归零，同时 `onSpeechSeg` 的 `seg` 跟读已在居中 ⇒ **章首「归零 → 居中 → 再归零」**是典型的上下往复。

**F. 其它结构事实（与本次相关）**

- 滚动模式容器：`List({ scroller: this.scroller })` `5742` + `LazyForEach` `5771/5821`，`cachedCount` `5856`（`cacheBoost` 时 48）；
- 听书时 `enableScrollInteraction(!ttsOpLock())` `5904`（用户手势已锁，程序化滚动不受影响）；
- `onScrollIndex` `5924`、`onScrollStop` `5917`（内含 `maybeShiftWindow()`）、`onReachEnd` `5937`、`onAreaChange` `5861`（改 vh ⇒ `measureBlocks` + `rebuildPages` + `restoreScrollToOffset` + `settleLabelSoon`）；
- `realMaxScroll`（`388` 声明 / `438` 读取）**全文件无赋值**，恒等于走 `maxScroll` 分支 —— 是「真实上限夹取」被禁路径的**空壳**，谁给它赋值就会复发 34/37 卡死（03 §J.2-1）。

**G. 已确认不存在（技能笔记过期，禁止按它们开工）**

`rulerBias`、`forceCenterOnStart`、`CENTER_BIAS_FRAC`、`FOOTER_H`、`scrollEdge`、`scrollBy` —— 全仓 0 命中（`ets/ts/py/md`）。

### 1.4 复现路径（平板模拟器，待日志确认具体命中哪条）

1. `hdc list targets` 认设备（按分辨率认实例：平板 1920×2880）；
2. 装当前自用版包 → 打开一本书 → 切**滚动模式**；
3. 点「开始朗读」（面板自动收起 + 进全屏）；
4. 观察视图是否上下往复；至少跨一次章（自动续章）；
5. 期间做一次改字号（A+/A−），再做一次「开听书 → 停播 → 再开」；
6. `hdc … file recv …/files/tts_b.txt` 与 `tts_diag.txt` 取日志。

### 1.5 根因假设与证据分级（**先量再改**）

| 编号 | 假设 | 证据等级 | 判定方法（日志/动作） |
|---|---|---|---|
| R1 | 多源争抢同一 `scroller`：`restoreScrollToOffset` / `settleChapterScroll` / `gotoChapter` / `smoothScrollStep` 在听书期间仍下令，与 `followFrontier` 打架 | **高**（代码事实已核实「无闸」，但是否造成可见往复需实测） | 新日志 `cmd=` 字段：同一 1.5s 窗口内出现 ≥2 个不同 `cmd` 源即命中 |
| R2 | 两把尺交替：`realC` 可用性逐拍变化 ⇒ `want` 在估算/真实之间跳，方向反转 | **高** | 新日志 `wantSrc=est\|real\|idx` + `zigzag` 行 |
| R3 | 换章链：`followFloor=-1`(`4223`) + `scrollTo(0)`(`4854`) + 300ms `settle`(`4819`) 与 `seg` 居中交错 | **中** | `zigzag` 行里 `phase=chapter`（换章 1.5s 内） |
| R4 | 开听书收面板/进全屏 ⇒ `onAreaChange` 改 vh ⇒ `restoreScrollToOffset` ×3 与 `recenter`/`start` 抢 | **中** | `zigzag` 行里 `phase=vh`（可视高变化 1.5s 内） |
| R5 | 改字号：`restoreScrollToOffset`（`2030`，先于 tts 早退）×3 + `recenter` ×3 | **中** | `zigzag` 行里 `phase=font` |
| R6 | `maybeShiftWindow`(4597) 的 `scrollToIndex` 在听书 `onScrollStop` 时触发 | **低** | `center-idx` / `scroll-idx` 与 `zigzag` 同窗；需先核实滚动模式是否已 return |
| R7 | 自动滚动 `smoothScrollStep` 被误触（媒体键/空格） | **低** | `cmd=auto` 出现于 tts 期 |

> ❗**不允许把上表任何一条当结论写进交付说明**。FIX-001 的唯一目的是把「哪条命中」变成日志数字。

### 1.6 取证结果（2026-10-17 18:38–19:13，平板 PurePad26 / 日志版包 md5 `7dd2c84d…`）

> 设备 `127.0.0.1:5557`（1920×2880 实测认设备）；累计听书 **≈35 分钟 / 3 个会话 / 4 次跨章**（《剑来》1309 章 + 一本 6 章测试书）。

| 指标 | 实测 | 判读 |
|---|---|---|
| `zigzag` 行数 | **0**（两文件各 0） | 阈值 0.25×band≈343px，实际最大单步回退 0px（唯一「回落」是换章 `5681→0`，被 `phase=chapter` 记为合法重摆） |
| `inScreen=1` 比例 | 98.3% / 99.3% / **99.8%** | 高亮全程在屏内（`hrelPx/band` 中位 0.52，10–90 分位 0.45–0.57） |
| `scrollcmd.src` | tick 70 / **idx 10** / chapter 1 / settle 1 / auto 0 / restore 0 | 三会话 `idx` 合计 **72 次** |
| ❗关键异常 | 章末 `src=idx` 10 条**全部 `from=5681` 不变**，`to` 6140→6223 递增；同段 `wantSrc` 在 `real` 与 `idx` 间切 **10 次** | **两把尺交替的实证**（R2 命中）：取不到 `getItemRect` 的拍硬跳 `scrollToIndex(CENTER)`，下一拍真实坐标再修正 |
| 换章链 | `chapter: 5681→0` 紧接 `settle: want=0 from=0 to=0` | **R1 局部命中**：换章后多一条无用的 `settle` 归零 |
| 地板 | `floor-raise 5539->5681 want=5539 real=752`；`no-back` **12 次** | 单调地板在起作用（拦住真实回滚），保留不改 |
| `scrollsettle` | `t=300` 全部 `over=-8/-9`；`t=700` 全部 `over=0` | 滚动动画 300ms 未走完属正常，不构成抖动 |

**结论（如实）**：用户报的「来回滚动」**在本次模拟器条件下未复现**；但 `idx` 反复下令与换章多余 `settle` 是**确定性缺陷**，且正是「估算尺 ↔ 真实坐标」交替的直接证据 —— 在「估算 `maxScroll` 偏大/偏小」的章上就会变成肉眼可见的往复。⇒ FIX-002/003 按 R1/R2 落地，FIX-004/005 作结构性保险。

**未覆盖的条件**（用户侧才能给）：书源抓取书 vs 本地书；是否恰在章末；听书中改字号（模拟器上 `Reader.ets:5222 ttsBlocked` 锁了设置入口，该路径**无法在听书中复现**，是本轮最大的条件缺口）。

### 1.7 修复后复测（2026-10-17 19:20–19:46）

> 设备：平板模拟器 `5557`（1920×2880）；包：`release/_wip/entry-default-signed-zigzag-release.hap`（md5 `aa6681484abeea6114ad7196bcacf2d9`，1,372,286 B）；代码 HEAD `144ac0f`。三场连续听书，无人工干预滚动。

| 场次 | 书 | 时长 | 跨章方式 | 起止 `curY` | `zigzag` | `inScreen=1` |
|---|---|---|---|---|---|---|
| S1 | 《剑来》 | 6 min | 自然跨章 | 单调前进、全程无回退拍 | 0 | 99.45% |
| S2 | 长章节测试书 | 12 min | 自然跨章 | 单调前进、全程无回退拍 | 0 | 99.72% |
| S2C | 长章节测试书 | 3 min | 目录跳章 | 单调前进、全程无回退拍 | 0 | 100% |

**四道闸生效证据（逐字取自日志）**

- `scrollcmd.src` 全场只出现 **tick / seg / chapter** 三种来源 —— 单源闸成立：听书滚动期除 `followFrontier` 外无人下令。
- `settle` 只 **1 条**，且 `why=blocked`（被单源闸拦下、**未执行**）—— 换章后不再有 R1 那种多余的归零 `settle`。
- `idx` 下令 **72 次 → 0 次**（改前 35 分钟 72 次章末 `scrollToIndex(CENTER)` 硬跳，复测三场 0 次）—— 目标源粘滞生效，不再退回 `idx` 尺。
- `restore=0`、`auto=0`（未触发自动滚动回摆，未触发位置恢复重摆）。
- `zigzag=0` / `zigzag-guard=0` / `frozen=0` —— 抖动看门狗零告警（未被喂到，也说明上游没产生回退）。
- `inScreen=1` 99.45% / 99.72% / 100%，`curY` 单调前进 —— 可视高补居中达标（dev 参照 7.6% band）。

**副作用与观察项**

- `src-hold` 占 **35~36%** 的 tick 拍（181 / 354 / 90 行），即约 1/3 的拍（每拍 600ms）被粘滞闸挡住不滚；连续 hold **≤2 拍**（≤1.2s）。理论上有被感知为「走一停」的风险，但高亮屏内比例已达 99.45%+，本轮判为可接受，真机需听感确认。
- S2 换章后 **+611ms** 出现过一次 **98px** 的 tick 主路纠正 —— 属跟读自身的位置追赶，**不是** `settle`，不构成往复（单步 98px < 阈值 0.25×band）。
- `src-hold` 行里 `want` 可能超出 `maxScroll`：属日志噪音（值本身未被采用），期间 1 条 `settle` 因 `why=blocked` 未执行。

**未覆盖**

- **书源抓取书**（本轮三场均本地书）。
- **听书中改字号**：模拟器 `Reader.ets:5222` 的 `ttsBlocked` 锁了设置入口，该路径在本环境无法复现，需真机验证。

**交付物**

- 代码：`11919cc`（单源闸）→ `fdd842f`（目标源粘滞）→ `a87d890`（可视高补居中）→ `144ac0f`（抖动看门狗，HEAD）；取证日志前置提交 `dfdfb68`（判据化日志）。
- 包：`release/_wip/entry-default-signed-zigzag-release.hap`，md5 `aa6681484abeea6114ad7196bcacf2d9`，1,372,286 B（已装平板模拟器 5557 验收）。
- 门禁：`reader_center` 57/57、`reader_pos` 150/150、`diag_log` UT-313~321 GREEN；反向对照 RED（撤掉单源闸后 `idx` 复现）。

### 1.8 第二轮：手机复现 + 真正根因（2026-10-17 21:30–22:20，包 `16d4dc13…`）

**可复现条件（手机 1256×2760，连跑两遍数字一致）**：滚动模式 + 字号 **36**（内容超一屏）+ **停止朗读后 ≤1s 再开**。

| 现场 | 日志 | 目视 |
|---|---|---|
| 复播首拍回拉 400px | `center curY=1218 dev=-400 want=818 real=-39` → `scrollcmd src=tick from=1218 to=818 exec=1` | 第 4/4 页 → 重启后第 2/4 页 |
| 换章后二次回顶 | `curY=917 dev=-1172 want=0 real=-811 clamped=1` → `to=0` | 先停在中部再跳回章首 |

**同时暴露一个量具错误（必须先修量具）**：`logScrollCmd` 把 `to` 恒记成 `Math.round(want)`，于是 `why=src-hold|blocked|frozen`（代码已 `return`、根本没下发）的行也带着目标值 ⇒ 旧日志里 113 次「`seg 113→51`」全是假回退（`curY` 序列零下降）。修法：未执行行 `to=-1` + `exec=0`，`zigzag` 阈值 0.343→`0.08×band` 且日志直接打印 `thr=`。

**新增根因**
- **R8**：开听书 `toggleSpeech()` 无条件 `followFloor=-1`（「首次定位完全自由」）⇒ 首拍可往回拉一屏，地板来不及拦。
- **R9**：`realC` 落在屏幕外（`-39`/`-811`）时未判无效，仍按 `dev=realC−band/2` 算目标 ⇒ 大幅上移。

**FIX-ZZ-007**：地板改为 `y0 − 一行`；`src=start` 首拍最多回退一行（`start-clamp`）；`realC` 越出 `[-band/2, 1.5band]` 判无效（`real-invalid`）；换章窗口内最多回退一屏（`chapter-hold`）。
**复验**：手机非换章回退 5→2（均换章合法）、目视 3/4→3/4；平板字号 36 停 0.5s 复播两轮 **真回退 0 / zigzag 0 / inScreen 93.8%~97.6%**。

### 1.9 第三轮：换章漂移与最终收口（2026-10-17 22:20–22:55，包 `eacecb66…`）

**最后一个真凶**：换章 `scrollTo(0)` 后 `LazyForEach` 换数据源会让 **List 自己漂移**（手机 489~551px、平板 427~1131px，无人下令）；而 `settleChapterScroll` 被 FIX-ZZ-002 **整条闸掉**，合法补正一起被关 ⇒ 1.8s 后才由跟读按真实坐标拉回章首（目视「新章内容顶屏、标题滚出、无高亮 → 再跳回」）。

**FIX-ZZ-008**：换章/改字号/可视高变化时 `resetScrollTrail` 清采样（消假 zigzag）；换章 3s 内 `shouldFreeze` 不触发（防误冻）；换章 3s 内 `realC` 无效不退估算（`chapter-nowait`，防「先滚过去再拉回」）。
**FIX-ZZ-009**：`settleChapterScroll` 闸改为**换章 3s 内放行**；`gotoChapter` 排 150/600ms 两次 `chapter-pin` 钉位；假 `zigzag` 判据加「真实位移 ≥2px」门槛。

| 指标 | 第二轮 | 最终 |
|---|---|---|
| 非换章回退（手机章末） | 2（551→0、489→0） | **0** |
| `zigzag`（手机） | 8 | **0** |
| 假 `zigzag`（平板） | 3 | **0** |
| `zigzag-guard` / `frozen` | 偶发误冻 | **0 / 0** |
| `chapter-pin` | — | 每换章 2 条，`t=600 got=0` 全钉住 |
| 换章漂移寿命 | 1.8s（可见） | **≈120ms**（150ms 钉位顶回；1010 帧连拍抓不到） |

**交付物**：commit 链 `dfdfb68 → 11919cc → fdd842f → a87d890 → 144ac0f → cababdd → ec4a670 → d442e32 → d81ec2e`（9 个，逐条可单独回退）；包 `release/_wip/entry-default-signed-zigzag-final-release.hap`，md5 `eacecb667c71c30081bedec7fd9de42d`，1,376,729 B；门禁 `reader_center` 57/57、`reader_pos` 150/150、`diag_log` UT-313~325 GREEN 且反向对照 RED。

**未覆盖 / 新增观察项**
- 未覆盖：**书源抓取书**；**听书中改字号**（`Reader.ets:5222 ttsBlocked`，模拟器无法在听书态打开设置）；真机（本轮全部在手机/平板模拟器）。
- 观察项 A（非本单）：章末 `maxScroll` 偏小使跟读 `to` 超界被 List 夹住、高亮短暂出屏（平板 R1 换章前 ~28s 内 11 条 `inScreen=0`）。
- 观察项 B（非本单）：停止朗读后点击间隔 0.3s，但 `phase=start` 记在 +2.17s，复播会从本章开头重读（未定性）。

---

## 二、修复方案

### 2.1 方案对比

| 维度 | 方案A：只调参数（死区/地板阈值） | 方案B：单源闸 + 目标源粘滞 + 抖动看门狗（推荐） | 方案C：整体重写跟读（换成 Scroll + 自己算偏移） |
|---|---|---|---|
| 描述 | 加大死区、收紧地板 | 听书滚动期间只允许一个滚动下令者；`realC` 缺失时保持上一拍目标不退回估算；看门狗检测往复并冻结 800ms | 放弃 List 懒加载，改单 Scroll |
| 优点 | 改动最小 | 从结构上兑现「严禁来回滚」，每条闸都有日志可证 | 彻底摆脱 `getItemRect` 估算 |
| 缺点 | 抖动源头仍在，只是变缓；改一处另一个源仍会顶 | 仍需逐条核实闸的覆盖面 | 640MB 内存目标、章切换、页表、高亮全链路重做，风险极高 |
| 风险 | 低（但可能无效） | 中（闸写错会让高亮不跟随） | 高 |
| 工作量 | 0.5 天 | 1.5~2 天（含模拟器取证） | 2 周+ |

### 2.2 推荐方案：**B**

理由：问题是「谁在动视口」，不是「阈值不合适」。历史已证（03 §J）调参/补偿层（偏置、预留、揭示、尺子偏置）全部回退过，且越叠越坏；而「听书期间只允许一个滚动下令者」是本项目早已定案的「一个目标原则」（03 §C.5.1）在**代码层**的落实 —— 之前只落实了驱动源统一，没落实**执行权**统一。

### 2.3 技术实现（四条闸 + 一层看门狗）

**FIX-001 判据化滚动日志（零行为改动，先上）**

新增统一日志（沿用现有通道，不新增文件）：
- `diagB`（`tts_b.txt`，无节流）：
  - `scrollcmd|src=<seg|tick|start|recenter|restore|settle|chapter|auto|idx>|why=<only|relayout|chapter|vhchange|font|user>|want=|from=|to=|wantSrc=<est|real|idx>|floor=|tts=<0|1>|mode=<page|scroll>`
  - `zigzag|n=<次数>|span=<ms>|d1=|d2=|y=|last=|phase=<none|chapter|vh|font|start>|src1=|src2=`
- `dlog`（`tts_diag.txt`，节流 1000ms）：`scrollsettle src=<…> t=<300ms/700ms> want= got= over=<got-want>`

判据定义（必须写进门禁断言）：
- `zigzag`：同一 `phase` 内相邻两次**实际滚动位移**方向相反，且各自 `|Δy| ≥ 0.25×band` ⇒ 记一条；`phase` 由 `换章 / 可视高变化 / 改字号 / 开听书` 各打一个 1500ms 窗口标记。
- 恢复口径：`scrollcmd` 的 `src` 在一个 `span` 内出现 ≥2 个不同值 ⇒ R1 命中。

**FIX-002 单源闸（核心）**

在 `Reader.ets` 新增一个私有判定 `ttsScrollSole()`（返回 `this.ttsPlaying && !this.pageMode`），并在下列入口开头 `return`（各自带日志 `scrollcmd src=… why=blocked`）：
1. `restoreScrollToOffset()` `2078` 首行；
2. `schedulePlace()` `495` / `finishPlace()` `535` / `placeScrollByOffset()` `2394` 调用点 / `verifyScrollPlace()` `2418`（四条落位收敛链，历史已记录会与跟读抢）；
3. `settleChapterScroll()` `4815` 首行（换章由跟读自己居中）；
4. `smoothScrollStep()` `3850` / `startAuto()` `3827`（听书时禁止自动滚动）；
5. `maybeShiftWindow()` 的 `scrollToIndex` `4597`（先核实滚动模式是否已 return，若未 return 则加闸）。

**唯一例外（合法重摆，必须保留）**：`gotoChapter` 的 `4854 scrollTo(0)` 保留 —— 换章是一次性合法重摆；但要求它在 `ttsPlaying` 时**只执行一次**，并由 `buildBlocks:4223` 重置 `followFloor`（现有行为），`settleChapterScroll` 被 FIX-002 关掉后不再二次归零。

**FIX-003 目标源粘滞（治两把尺交替）**

在 `followFrontier` 内：
- 新增 `lastWantSrc: 'est' | 'real' | 'idx'`；
- 本拍 `realC !== null` ⇒ 用 `real`，并记 `lastWantSrc='real'`；
- 本拍 `realC === null` 且上一拍是 `real` ⇒ **本拍不滚**（`followNote('src-hold')` + `scrollcmd src=tick why=src-hold`），不退回估算 `want`；
- 连续 3 拍 `realC === null` 才允许退回估算（并记 `wantSrc=est`）；
- `scrollToIndex` 兜底 `1202` 条件收紧：仅在「连续 4 拍取不到 realC」且「估算判定离屏 ≥1.5 倍死区」时触发，且**听书滚动模式下每段最多 1 次**。

**FIX-004 排序冲突（换章窗口内不重复下令）**

- 换章时 `buildBlocks:4223` 重置地板后，`followFrontier` 首拍之前**抑制其它源**（由 FIX-002 天然覆盖）；
- `onAreaChange`（`5861`）在 `ttsPlaying` 时：
  - 仍执行 `measureBlocks()` + `rebuildPages()` + `settleLabelSoon()`（尺子/页码必须重算）；
  - **不调用** `restoreScrollToOffset()`（FIX-002 已闸），改在 200ms 后补一次 `followFrontier(this.currentSpeechOffset(), 'recenter')` 让跟读自己居中。

**FIX-005 抖动看门狗（兜底，兑现「严禁」）**

在 `followFrontier` 计算出 `want2` 之后、真正 `scrollTo` 之前：
- 维护 `yTrail: number[]`（`{t, y}`，窗口 3000ms，最多 12 条，只记**实际** `currentY()` 采样，由 tick 驱动的采样点写入）；
- 若检测到方向反转（与 `zigzag` 同判据）且 `phase=none`（无合法重摆）且 `src` 两次不同 ⇒ 进入 `followFrozenUntil = now + 800ms`：**不滚**，仅 `dlog('zigzag-guard freeze=800ms …')`；
- 冻结期内 `followFrontier` 只更新目标不执行；`phase` 窗口内（换章/改字号/可视高变/开听书 1500ms）**不触发**看门狗（合法重摆允许一次）。

> 看门狗是「最后一道」，不是主修法。落地顺序必须在 FIX-002/003 之后，且**单独提交**，便于回退。

### 2.4 风险评估

**直接影响**
- `Reader.ets` 单文件近 6 处入口加闸 + `followFrontier` 内部加粘滞/看门狗；滚动模式听书行为改变。
- 翻页模式（`pageMode=true`）**不受影响**（所有闸都以 `!pageMode` 为前提）。

**副作用（必须逐条验收）**
1. 高亮不跟随 / 跟丢：若闸写错（例如把 `followFrontier` 自己也闸掉），高亮会停在原位 ⇒ 判据：`center|` 行仍每拍出现、`hz` 高亮在屏内比例 > 95%；
2. 章末「下一章」滚不出来：`settleChapterScroll` 被闸后，章末按钮依赖跟读目标本身到 `maxScroll`（`centerTarget` 上界 `maxScroll+band`）⇒ 判据：章末 `dumpLayout` 里「下一章」节点仍在；
3. 改字号后高亮离屏：`restoreScrollToOffset` 被闸，改由 `recenter` ×3 居中 ⇒ 判据：改字号后 350ms 内 `center|src=recenter` 出现且 `dev` 收敛到死区内；
4. 开听书瞬间视图掉回章首：`onAreaChange` 被闸后需 200ms 补一次 `recenter` ⇒ 判据：开听书 1s 内 `curY` 不低于 `want` 的 0.9 倍；
5. 自动滚动失效（非听书）：闸只对 `ttsPlaying` 生效 ⇒ 判据：非听书时「自动滚动」仍工作（模拟器点一次确认）。

**红线（沿用既有，不得违反）**
- 不用真实上限夹取（`realMaxScroll` 不许赋值）；
- 不往计时模型叠补偿（`BookSpeaker` 不动）；
- 不重建 `CENTER_BIAS_FRAC` / `FOOTER_H` / `forceCenterOnStart` / `rulerBias`；
- `followFloor` 仍是**下界**（只进不退），不得改成上界夹取；
- 听书期间不引入新的「定时器 + 目标」对。

**回退方案**
- 每个 FIX 单独 commit（`FIX-ZZ-00x: …`），单条回退：`git checkout <上一 commit> -- entry/src/main/ets/pages/Reader.ets tools/<对应门禁>`；
- 全量回退点：`git branch backup-before-zigzag 5c2bf4e`；
- 出包前留 `release/_wip/*.bak`。

---

## 三、Agent 任务拆分

### 3.1 批次规划（**单文件串行，不开并行**）

> 本轮所有任务都改 `entry/src/main/ets/pages/Reader.ets` 同一个文件 ⇒ 同文件不得并发（上一轮踩过「两子 Agent 同时写同一文件互相覆盖」）。**并发数 1**。
> FIX-001 是阻断闸：**日志未上、未取到一次真实抖动日志之前，不允许开工 FIX-002 起的任何行为改动**。

```
Batch 1   FIX-001 判据化日志（零行为）  ← 必须先落
              ↓
Batch 1b  FIX-000 模拟器取证（拉 tts_b.txt，判定 R1~R7 命中项）
              ↓
Batch 2   FIX-002 单源闸  →  FIX-003 目标源粘滞  →  FIX-004 排序冲突/可视高
              ↓
Batch 3   FIX-005 抖动看门狗（独立提交）
              ↓
Batch 4   FIX-006 门禁补齐（reader_center_selftest / diag_log_reset_selftest）
              ↓
Batch 5   FIX-007 平板模拟器复测 + 出包（自用版 release）+ 装机 + 取证
```

| 任务ID | 任务名称 | 依赖 | 风险 | 交付物 |
|---|---|---|---|---|
| FIX-ZZ-001 | 判据化滚动日志 | 无 | 低 | `Reader.ets` 日志 + `diag_log_reset_selftest.py` 新增 UT-313~315 |
| FIX-ZZ-000 | 平板模拟器取证 | 001 | 低 | 抖动日志片段（`tts_b.txt` / `tts_diag.txt`）+ 命中项清单 |
| FIX-ZZ-002 | 单源闸 | 000 | 中 | `Reader.ets` 4 处闸 + 日志 |
| FIX-ZZ-003 | 目标源粘滞 | 002 | 中 | `followFrontier` 粘滞 + `wantSrc` |
| FIX-ZZ-004 | 换章/可视高排序 | 003 | 中 | `onAreaChange` 分支 + 200ms recenter |
| FIX-ZZ-005 | 抖动看门狗 | 003 | 中 | 冻结 800ms + `zigzag-guard` 日志 |
| FIX-ZZ-006 | 门禁补齐 | 002~005 | 低 | 门禁 GREEN + 反向对照 RED |
| FIX-ZZ-007 | 模拟器复测 + 出包 | 006 | 中 | 验收数字 + `hap` + md5 |

### 3.2 任务卡

#### Agent任务: FIX-ZZ-001 判据化滚动日志（零行为改动）

**基本信息**
- 任务ID: FIX-ZZ-001
- 问题级别: 取证（阻断闸）
- 影响模块: `Reader.ets`（日志）＋ `tools/diag_log_reset_selftest.py`（门禁）
- 依赖任务: 无
- 预计风险: 低（**不得改变任何滚动行为**）

**问题描述**
现有日志能回答「目标是多少」，不能回答「**谁下的令**」「**下令后实际落在哪**」「**相邻两拍是否反向**」。用户报的「来回滚动」恰恰需要这三样。

**修复方案**
按 §2.3 FIX-001 的三类日志实现；`phase` 标记在 `gotoChapter` / `onAreaChange` / `onFontMetricsChanged` / 开听书 四处各打 1500ms 窗口。所有日志只在 `TTS_DIAG` 开启时写，节流沿用现有 `*LogAt` 字段风格。

**输入**
- `entry/src/main/ets/pages/Reader.ets`（`441 scrollToY`、`1268` 主路、`1202` 兜底、`2093`、`4819`、`4854`、`3850`、`5861`、`2753 diagB`）
- `tools/diag_log_reset_selftest.py`（现有 UT-301~312 写法）

**输出**
- `Reader.ets`：新增日志（不改任何控制流）
- `tools/diag_log_reset_selftest.py`：UT-313 `scrollcmd` 存在、UT-314 `zigzag` 判据函数存在、UT-315 `phase` 四处标记存在
- 验证报告：两门禁 GREEN

**执行步骤**
1. `git branch backup-before-zigzag 5c2bf4e`（留回退点）
2. 实现 3 类日志 + `phase` 标记（**纯增加**，不改 if/return）
3. 补门禁 3 条
4. 跑 `python tools/diag_log_reset_selftest.py` → GREEN；`python tools/reader_center_selftest.py` → 57/57 不变
5. `node hvigorw.js assembleHap … buildMode=release`（自用版，debug 不用于真机）
6. commit `FIX-ZZ-001: 判据化滚动日志（scrollcmd/zigzag/settle + phase 标记，零行为改动）`

**验证标准**
- [ ] 原有 57 项居中门禁全绿（无回归）
- [ ] `diag_log_reset_selftest.py` GREEN，新增 3 条断言可被反向对照打红
- [ ] `git diff` 里**没有**任何 `return`/`if` 条件被改写（只新增行）
- [ ] 编译通过（自用版 + `check_both.py` 两包）

#### Agent任务: FIX-ZZ-000 平板模拟器取证

**输入**：FIX-ZZ-001 的 hap；`scripts/drv.py`；PurePad26
**执行步骤**
1. `hdc list targets` 认设备（按 1920×2880 认平板），每条命令显式 `-t`
2. 装包（看安装输出**倒数第二行** `msg:install bundle successfully`）→ `aa force-stop` → 重开
3. 打开书 → 滚动模式 → 开朗读 → 观察 ≥90s、跨 1 章 → 改一次字号 → 停播再开
4. 截图 2 张（关键：往复发生的一刻）
5. `file recv` 两个日志到 scratch（**本地路径用反斜杠绝对路径**；不落项目目录）
**输出**：`zigzag` 行清单 + `scrollcmd` 同窗 `src` 分布 + 命中 R 编号
**验证标准**
- [ ] 至少一条 `zigzag` 行（若 90s 内无，说明该现象非必现 ⇒ 延长到跨 3 章 + 复跑一次，仍无则如实上报「本轮未复现」）
- [ ] 结论只写「命中/未命中」，不写修复结论

#### Agent任务: FIX-ZZ-002 单源闸

**方案**：见 §2.3 FIX-002 五条闸 + 唯一例外。
**执行步骤**：逐条加闸并各写一条 `scrollcmd … why=blocked` 日志 → 编译 → 模拟器开听书确认「仍然居中」（不能因闸而停住）→ commit。
**验证标准**
- [ ] 听书滚动模式：`scrollcmd` 只出现 `src=seg|tick|start|recenter|chapter`（无 `restore|settle|auto|idx`）
- [ ] 高亮 `inScreen=1` 比例 > 95%
- [ ] 非听书：手动滚动、自动滚动、改字号、换章全部正常
- [ ] 章末「下一章」节点仍在 `dumpLayout`

#### Agent任务: FIX-ZZ-003 目标源粘滞
**验证标准**：`wantSrc` 序列里 `real→est` 的切换只允许发生在连续 3 拍 missing 之后；期间 `no-back` / `src-hold` 计数可见；`zigzag` 行归零。

#### Agent任务: FIX-ZZ-004 换章/可视高排序
**验证标准**：换章窗口 1.5s 内 `scrollcmd` 只有 `chapter` + 跟读两类；开听书 1s 内 `curY` 不低于目标 0.9 倍；无二次归零。

#### Agent任务: FIX-ZZ-005 抖动看门狗
**验证标准**：注入式验证（测试用连续两个相反目标）能触发 `zigzag-guard`，且冻结 800ms 后恢复跟随；正常听书 90s 内 `zigzag-guard` = 0 次。

#### Agent任务: FIX-ZZ-006 门禁补齐
- [ ] `python tools/reader_center_selftest.py`：当前码 GREEN 57/57；旧码（`git show 5c2bf4e:entry/src/main/ets/pages/Reader.ets`）RED
- [ ] `python tools/diag_log_reset_selftest.py`：GREEN，UT-313~315 在旧码上 RED
- [ ] `python tools/reader_pos_selftest.py` 150 项无新增失败
- [ ] `python tools/check_both.py` 两包构建通过、上架版源码还原 ✓

#### Agent任务: FIX-ZZ-007 模拟器复测 + 出包
- [ ] **同一路径**复测（滚动模式听书跨 2 章 + 改字号 + 停复播），`zigzag` 行 = 0
- [ ] 截图：高亮居中（2 张，含状态栏）
- [ ] 自用版 release hap（md5 当场取、当场记）、`check_both.py` 两包
- [ ] 归档 `release/<版本>/`，文档三处 md5 对齐

---

## 四、实施计划

| 阶段 | 任务 | 产出 | 门禁 |
|---|---|---|---|
| 阶段1 | FIX-ZZ-001 + 000 | 日志 + 抖动取证 | `diag_log_reset_selftest` / `reader_center_selftest` |
| 阶段2 | FIX-ZZ-002 → 003 → 004 | 单源 + 粘滞 + 排序 | 同上 + 模拟器 |
| 阶段3 | FIX-ZZ-005 | 看门狗 | 注入式验证 |
| 阶段4 | FIX-ZZ-006 | 门禁全绿 + 反向对照 RED | `check_both.py` |
| 阶段5 | FIX-ZZ-007 | 包 + 验收数字 | 装机复测 |

### 4.2 发布计划
- 修完先出**自用版 release**给平板模拟器验收，通过后再谈是否升版号（当前 1.0.1 已送审，**本轮修复默认不升版本号**，除非用户要求重出）。
- 交付口径：装模拟器 + 截图 + 日志数字，**不接受「看起来好了」**。

---

## 五、技术来源与内部依据

> 📚 **内部唯一口径**
> - `03-纯阅关键约定与踩坑.md` §C.5.1「一个目标原则」、§J（回退记录）、§J.2-1（禁止真实上限夹取）
> - `04-纯阅待办与验收.md` §二 阅读进度判据④（滚动全程位置单调）、#1/#2/#7/#9/#25
> - `docs/fix/tts_scroll_center_footer/fix-plan.md` §五（口径裁定 + 红线 6 条）
> - `docs/fix/tablet_portrait/test-strategy.md:52`（IT-02：无回滚 followFloor）
> - 技能 `pure-reader-dev-workflow` → `references/scroll-follow-positioning.md`（两把尺交替 = 章首来回乱滚成因）、`references/real-device-diagnosis.md`（日志字段判读）、`references/emulator-env.md`（平板实例）
>
> 📚 **代码事实**（2026-10-17 实测，`Reader.ets` 6070 行）
> - 跟读主路 `1268`、兜底 `1202`、地板 `1223-1242` / `1261-1262`、tick `1072`、5 个驱动源 `1005/1081/2955/2114-2123`
> - 4 条无闸滚动路径：`2093`、`4819`、`4854`、`3850`
> - 换章重置地板 `4223`；`realMaxScroll` 空壳 `388/438`
> - `followFloor` 单调地板的**唯一权威记载**目前在提交 `bc9918e` 的信息里，文档库尚无字段口径 ⇒ 本单收口时应把「绝不回滚/允许 recenter 重摆」写进 `03`/`04`（见 §六 遗留）
>
> 📚 **ArkUI 行为**：`List.scrollTo` 目标越界由组件自身夹取（既有案头口径，见 `03` §J.2-1「算过头无害，夹小了才会卡死」）—— 本方案不新增任何上界夹取。

---

## 六、遗留与文档同步（收口时必做）

1. 把 `followFloor` 的字段口径（下界、只进不退、换章/改字号合法重置）写进 `03-纯阅关键约定与踩坑.md`，并在 `04` 判据里加一条「滚动模式听书全程 `y` 单调非降（换章/改字号窗口除外）」；
2. 修 `03` §J 与 `tts_scroll_center_footer` 之间 3 处口径不一致：① 章尾最后 3 句钉底（`scroll-follow-positioning.md:43` vs 03 §J）；② `tts_b.txt` 与 `tts_diag.txt` 的分工说明（`tablet_portrait/test-strategy.md:52` 写错文件）；③ `04:249`「#1/#2 结案」vs `04:222-223`「未解决」；
3. 本单结案后，`04` #1 的验收判据改为「`zigzag` 行 = 0 且跨 2 章无回滚」。
