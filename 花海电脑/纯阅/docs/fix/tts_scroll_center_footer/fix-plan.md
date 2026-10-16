---
title: 滚动模式听书高亮居中与章末按钮可见性 —— 修复方案
项目: 纯阅
类型: 专项修复
所有者: 虾米（桌面会话）
更新: 2026-10-16
状态: 开工中（Batch 1；章首口径已拍板＝B 不插留白）
---

# 修复方案文档

> 生成时间：2026-10-16 01:05（+08:00）
> 关联问题ID：ISSUE-2026-10-16-SCROLL-TTS-CENTER
> 关联待办：`04-纯阅待办与验收.md` →「2026-10-16 夜归档」#1（居中跟读位置 ❌）、#2（章末「上一章/下一章」滚不出来 ❌）
> 关联测试策略：`test-strategy.md`（同目录）

---

## 一、问题诊断

### 1.1 问题概述

| 属性 | 内容 |
|------|------|
| 问题ID | ISSUE-2026-10-16-SCROLL-TTS-CENTER |
| 发现时间 | 2026-10-16 00:4x（用户真机反馈） |
| 影响级别 | P1（核心听书体验，非崩溃） |
| 问题状态 | 待修复（章首口径 2026-10-16 用户拍板：**B＝不插留白、不硬居中**） |
| 影响模块 | `pages/Reader.ets`（滚动跟读定位、List 章末页脚）、滚动模式 List 布局 |
| 复现环境 | 真机 Pura 70 Pro（HarmonyOS 7）／听书 + 上下滚动模式 |

### 1.2 问题描述

用户在**上下滚动模式**下听书时报告两条现象（原话）：

1. 「滚动模式下听书高亮居中异常，**一章开始和一章快结束时高亮偏移过大**」；
2. 「滚动模式下听书**章末还没看到上一章、下一章按钮就停止滚屏**，导致高亮不显示内容看不全」。

拆成 3 个可独立判定的缺陷：

| 编号 | 缺陷 | 判定方式 |
|------|------|----------|
| D1 | 章末：视图在**真实内容底部之前**停住，`下一章` 按钮进不了视口 | 章末 `uitest dumpLayout` 找不到「下一章」bounds，或截图不可见。**⚠️ 只在「估算 maxScroll 偏小」的章出现（M-001 实测 ch229 未复现，见 §1.6）** |
| D2 | 章末：最后几句的高亮**偏离视口中心**（观感「偏移过大」，内容看不全） | 章末 `center follow` 的 `dev` 偏大（M-001 实测 ch229：`dev` 恒 208~209 = 26.9%×band，> 15% 目标线）；**以截图量像素为准** |
| D3 | 章首：一章开头几句的高亮**贴屏幕上部**（最大偏离约半屏） | 同上；M-001 实测 ch230 首句 `dev = −367`（**−47%×band**），高亮中心距可视区顶仅 **21vp（≈71px）** |

### 1.3 根因分析

> 取证方式：并行只读子Agent 通读 `E:\HuaweiReader` 当前工作区（含未提交改动）+ 文档库 + 官方文档。下表代码原文均取自工作区当前行号。

**R1（主因，D1+D2）跟读目标的「上界夹取」夹在了估算出来的 `maxScroll` 上，而估算值常小于真实可滚范围**

`Reader.ets:1062-1071`（跟读目标式，**当前没有任何偏置项**）：

```ts
private centerTarget(localFrom: number, localTo: number, frontierLocal: number): number[] {
  ...
  const centerY: number = (segH <= band * CENTER_LONGSEG_FRAC) ? (yFrom + segH / 2) : this.pixelOfLocal(frontierLocal);
  const want: number = Math.round(Math.max(0, Math.min(this.maxScroll, centerY - band / 2)));   // ← R:1069 唯一夹取
  return [centerY, want];
}
```

而 `maxScroll` 完全来自估算尺子（`Reader.ets:3581-3593`）：

```ts
for (const b of this.blocks) { this.blockTops.push(top); top += Paginator.linesOf(b, width, this.fontSize) * lineH; }
this.contentHeight = top;                                    // R:3592 只累加正文块
this.maxScroll = Math.max(0, top - this.viewportHeight);     // R:3593
```

后果链：
- 真实 List 内容 = 正文块 **+** 章首「上一章」按钮 ListItem（`R:4905-4926`，`margin top8/bottom26`）**+** 章末页脚 ListItem（`R:4966-4992`，`margin top28/bottom40`）**+** List `.padding({top:16,bottom:30})`（`R:4998`）；而估算只算正文 ⇒ **估算原点与真实原点差一个常量（≈70vp）**，页脚+padding 共 **148vp** 恒不在估算内（G-001 的 `UT-004` 已把这一点钉成绿断言）。
- ❗**M-001 实测纠正：偏差方向随章变化，不能假设「估算一定偏小」**。ch229 实测：估算 `maxScroll = 26649.111`（`want` 恒 `= round(26649.111)`）而真实可滚上界 `curY = 26471` ⇒ 本章估算比真实**大 178vp**，List 自己夹到真底，**页脚按钮可见（D1 未复现）**。反过来说，只有当某章估算**偏小**时，跟读夹死在 `maxScroll` 上、视图到不了真底 ⇒ 才是 D1（历史记录 `03` §J 的估算 27567 vs 实际约 −3% 就是偏小方向的一例）。
- 因此 D1 是「逐章掷骰子」：偏差量级最大可达近一屏（≈780vp），页脚只有 148vp ⇒ **约一半章节会中招**。⇒ 修法必须对两个方向都安全：FIX-001 把上界放宽为 `maxScroll + band`（估算偏大时 List 自己夹、行为与现在完全一致；估算偏小时才真正多滚到真底）。
- 跟读被夹死时 `want` 恒等于 `maxScroll`、`curY` 恒停在同一个值 —— 这正是「被夹死」的铁证（`03` §J.2 教训 1 的同族现象）；但注意**它不等于「按钮不可见」**，是否可见要看 `curY` 有没有到 List 的真底（M-001 的 ch229 两者都命中，仍可见）。

**R2（结构性，D2）「末句真居中」所需的滚动量本身就超过内容末尾**
要 `band/2` 处出现末句，`want` 必须 ≥ `真实内容高 − band/2`，即**必须能滚到超出内容末尾**；被上界夹住后必然只能在「末尾」停住，末句落在视口下方。官方对此提供的正是**尾部留白**能力（见 §2.3）。

**R3（结构性，D3）章首首句物理上无法居中**
章首 `centerY ≈ 首块高的一半`（很小）⇒ `centerY − band/2 < 0` ⇒ `Math.max(0, …)` 夹成 0 ⇒ 首句停在内容顶部（真实 y≈70vp，只占 9% 屏高）。章首**没有任何可滚空间**，想真居中只能在内容顶部插留白（§2.3 待拍板）。这与「短章不插空白」的历史口径（`docs/plan/1.0.1-background-tts/plan.md:757` 实测 `dev=-233 want=0 curY=0 clamped=1`）一致。

**R4（次要，D2 的放大器）估算像素系 / 真实像素系混用**
`centerY`（估算）与 `currentY()`（真实）直接相减算 `dev`（`R:1037`）；`pxScale()`（`R:374`，算真实/估算比例）**存在但从未被 `centerTarget` 使用**；`realMaxScroll`（`R:342` 声明、`R:392` 唯一读取）**全仓库没有任何赋值**，是死字段。官方也承认懒加载 List 的 `currentOffset()`「内容总偏移量通过估算得到，估算结果可能会有误差」⇒ 误差随块序累积 ⇒ 章首小、章末大。
- ❗**M-001 现场证据（量级已实测）**：同一时刻 `hi diag` 报 `hrel = −641`（说高亮在视口上方 641vp），而同一 `curY` 的截图显示高亮在屏内约 **48%×band** ⇒ 两套坐标系差 **≈0.8~0.9×band**；`dev` 数字比画面观感差 **130~200vp**。⇒ **`dev`/`hrel` 只能当「趋势与对照」用，不能当绝对判据**（判据改法见 §1.5 与 `test-strategy.md` §2.2）。

**R5（❗重新定级：章末 D1/D2 的主因）末块内插值塌成一行**
`pixelOfLocal`（`R:1074-1085`）末块走 fallback：`y1 = y0 + this.fontSize * this.lineHeight`（`R:1083`）⇒ 章内**最后一块**在插值里被当成只有一行高（`y = y0 + frac × 42vp`），而该块真实高可达上千 px ⇒ **块内 `centerY` 低估最多约一个块高**（实测 ch370 末块 bounds 高 1373px ≈ 407vp）。
- **为什么它是章末症状的主因**（FIX-001 真机 A/B 实测，证据在 `scratch/fix001b/`）：章末朗读时视图停在 `want = centerY − band/2`；末块句子被低估 ⇒ `want` 偏小 ⇒ **视图停在真底之上**，页脚掉出渲染窗口。判据（`dumpLayout`）：朗读前滑到底时存在 `下一章 [1041,2455][1193,2514]`；**开朗读后同一章末该节点从布局树里消失**（`texts_06_old_ch371_after.txt` / `texts_09_new_ch371_after.txt` 均为「含『下一章』=False」），而末块 `Text` bounds 直接压到视口底 `[67,1377][1193,2750]`。
- 与 R1 的区别：R1 是**上界（夹取）**约束，只在「估算 `maxScroll` 偏小」的章触发（实测 ch370/ch371 都没触发，估算反偏大 170~350vp）；R5 是**目标值本身算小**，逐章都在起作用、且恰好作用在章末。⇒ **修 R1（FIX-001）算术生效但不足以解决症状**（A/B 已证），**修 R5（FIX-004b）才治本**。
- 离线门禁早已钉住它：`tools/reader_center_selftest.py` 的 `UT-003`（`red_echo = pixel_of_local/fallback_one_line`）改前就是红的，红源行号正是 `Reader.ets:1083`。

**R6（流程风险，必须先处理）基线不明 + 两套口径并存**
- `03-纯阅关键约定与踩坑.md` §J 写「已回退到 `7e271bc`，只保留空段跳过」，但实测：**HEAD = `e38d343`**（其后还有 `46aa1ee`、`e38d343` 两个 TTS 提交），且 `Reader.ets` 处于 `MM`（已暂存 + 未暂存改动）；`git diff 7e271bc -- Reader.ets` 仍有 **+26 行**（`endReachY` + `updatePageLabel` 章末判据，见 `R:345 / R:3569 / R:5050 / R:3647-3658`）。⇒ **开工前必须先钉死代码基线**，不能默认「工作区 = 7e271bc + 空段跳过」。
- 技能笔记（`references/scroll-follow-positioning.md` §4、§6）记的 `FOOTER_H ≈ 120vp`、「读到本章最后 3 句每 tick `scrollEdge(Edge.Bottom)`」、`CENTER_BIAS_FRAC` 三点标定、`forceCenterOnStart`、`rulerBias` —— **在当前代码里全部不存在**（`grep -rn` + `git log -S` 双双零命中）⇒ 那是**已回退的尝试的记录**，不是现行实现；文档库 §J 已明令「不要再加揭示/钉底这类补丁」。口径裁定见 §5。

### 1.4 复现步骤

1. 真机打开一本**长章**的书（如《剑来》），阅读模式切「上下滚动」。
2. 点「开始朗读」→ 面板自动收起 + 自动全屏。
3. 看章首：前 3~5 句高亮贴在屏幕上部（`center follow` 的 `dev` ≈ −250 ~ −300px，band=777）。
4. 听到本章最后 2~4 句：视图**停止上滚**，`上一章 / 下一章` 按钮与最后几行仍在屏幕外；末句高亮落在视口下方。
5. 预期：章末最后几句可见、按钮露出来、高亮尽量居中在一屏中部；实际：停早了 + 偏移大。

### 1.5 相关信息

**日志判据（滚动模式只看这一组）**

| 字段 | 位置 | 判据 |
|------|------|------|
| `center follow` 的 `dev` | `followFrontier` 内，`R:1037` 打印 | `|dev| ≤ 0.15 × band` 为合格；首个 tick 前的一大负值是「按目标滚之前」的正常值 |
| `want` / `curY` | 同上 | 出现「`want` 反复相同 + `curY` 反复停同一值 + 差 > 一行高」＝**被夹死** |
| `tts setChapter: … mode=<page|scroll>` | 开朗读时 | 必须等于点之前那个模式，全程无 `switch-in/out` |
| `BookSpeaker: seg done … type=1` | `BookSpeaker` | 段推进正常（与定位正交） |

❗**判据修正（M-001 实测后）**：`dev` / `hrel` / `hrelEnd` 都建立在「估算像素 vs 真实像素」混算之上（§1.3 R4，实测差 0.8~0.9×band）⇒ **绝对位置判定一律以「真机截图量像素」为准**，`dev` 只用于同章前后对照与趋势（收敛/不收敛、抖动/不抖动）。

### 1.6 M-001 真机基线取证结果（2026-10-16，编排者已自行复跑验伪）

- 交付物：`FIX-000-取证单.md`（本目录，368 行 / 24 KB）；原始证据：`%LOCALAPPDATA%\hermes\cache\scratch\m001\`（`m001_before.jpeg`、`m001_shot_a_ch229_end.jpeg`、`m001_shot_b_ch230_start.jpeg`、`m001_shot_c_ch229_end_manual.jpeg`、`m001_reader_lines.txt` 301 行 / 85 条 `center follow`）。
- 设备/包：`192.168.3.188:5555`；`versionName=1.0.0`、`versionCode=1000000`、`updateTime=2026-10-16 00:22:12`（`installTime=2026-10-10 19:42:19`）。**未验证代码版本对齐**（未取该包 md5、未比对 git HEAD）⇒ 基线数据对应哪次提交**不确定**。
- 日志心跳：两次校验「设备时间 = 宿主 +9s」，流全程在写；收流后行数冻结 109056。
- 当前阅读模式：**滚动模式**（三重证据 `tts setChapter … mode=scroll` / `hi diag mode=scroll` / 滚动模式专属页码胶囊文案）。
- **章首（第230章）**：`want=0 / curY=0`，`dev` 由 **−367（−47%×band）** 收敛到 −83，贴顶状态持续到章内约 100 字；`band=777vp`，正文 List bounds `[0,128][1260,2750]`（2622px ⇒ 1vp≈3.37px）。
- **章末（第229章）**：`want=26649`（`= round(maxScroll=26649.111111)`）恒定 **12.6s**、`curY` 恒定 **26471**（gap 178vp）、`dev` 恒 208~209；**「上一章」`[67,2455][219,2514]` / 「下一章」`[1041,2455][1193,2514]` 都取到 bounds 且在屏内**，再拖 3 次 `uitest uiInput swipe` 画面一像素不动（已到真底）。
- **未取到项（原样保留，不许补估）**：真实内容高/真实 maxScroll 权威值（日志无 `endReachY` 打印，grep 0 命中）；章首最差时刻截图（<2s 窗口抓不到）；标定系数；其它章节抽样（预算）。

**git 取证（2026-10-16 00:5x）**：`HEAD = e38d3434f81e6655ef4298f54296118befcd7740`；工作区脏：`MM Reader.ets`、`MM BookSpeaker.ets`（`BookSpeaker` 净回退：预取/预灌整套删除、`startTick` 100→200ms，仅保留空段跳过）；`Reader.ets` 相对 `7e271bc` 多 26 行（`endReachY` 诊断 + 章末页码判据）。

**官方行为（本轮外部核实，2026-10-16 检索）**

> 📚 **技术来源**
> - `scrollTo` 的 `yOffset` 越界规定与 `canOverScroll`：https://gitee.com/openharmony/docs/blob/master/zh-cn/application-dev/reference/apis-arkui/arkui-ts/ts-container-scroll.md#L1253
> - `Scroller.currentOffset()` 为估算 + `childrenMainSize` 是官方解药：https://gitee.com/openharmony/docs/blob/master/zh-cn/application-dev/reference/apis-arkui/arkui-ts/ts-container-scroll.md#L893
> - `scrollToIndex` / `ScrollAlign.CENTER` / `Scroller.getItemRect()`：https://gitee.com/openharmony/docs/blob/master/zh-cn/application-dev/reference/apis-arkui/arkui-ts/ts-container-scroll.md#L931 、#L1173 、#L1011
> - `contentStartOffset` / `contentEndOffset`（列表首/末留白）：https://gitee.com/openharmony/docs/blob/master/zh-cn/application-dev/reference/apis-arkui/arkui-ts/ts-container-list.md#L488 、#L524
> - `onScrollFrameBegin` **不因程序化滚动触发**（拿不到真实剩余距离）：https://gitee.com/openharmony/docs/blob/master/zh-cn/application-dev/reference/apis-arkui/arkui-ts/ts-container-list.md#L908
> - `onScrollIndex`（含 `center` 参数）/ `onScrollStop` / `onScrollEdge` 触发条件：.../ts-container-list.md#L840 、.../ts-container-scrollable-common.md#L560 、.../ts-container-scroll.md#L523

三条对本方案起决定作用的官方事实：
1. **越界被夹取是官方规定行为**（`yOffset<0` 按 0 处理；越界默认不回弹，除非 `edgeEffect=Spring` + `canOverScroll`）⇒「算过头无害」这句话有官方依据。
2. **`onScrollFrameBegin` 不能用来拿程序化滚动的剩余距离**（官方明文排除「调用除 fling 外的其他滚动控制接口」）⇒ 不要再试图用回调"学习真实上限"。
3. **官方为「末尾 item 也能居中」提供了 `contentEndOffset`**，为「对齐到任意 item 中心」提供了 `scrollToIndex(..., ScrollAlign.CENTER)`，为「拿真实渲染位置」提供了 `Scroller.getItemRect(index)` ⇒ 我们不必继续自造尺子。

---

## 二、修复方案

### 2.1 方案对比

| 维度 | 方案A：最小夹取修正 + 官方留白（推荐） | 方案B：重建"真值尺子" | 方案C：句提升为 ListItem + `scrollToIndex(CENTER)` |
|------|------|------|------|
| 描述 | ① 跟读上界夹取由 `maxScroll` 放宽为 `maxScroll + band`（有界过冲）② List 加 `contentEndOffset` 让末句/页脚能滚到中心 ③ 章首按拍板决定是否 `contentStartOffset` | 用 `Scroller.getItemRect(blockIdx)` / `childrenMainSize` 拿真实块高，替换 `measureBlocks` 的估算 | 把「句」做成等高 ListItem，用 `scrollToIndex(句序号, true, ScrollAlign.CENTER)` 让系统负责居中 |
| 优点 | 改动最小（1~2 处、每处可独立出包）；全部有官方依据；不引入反馈回路；符合「一次只改一个变量」纪律 | 一次性治掉估算误差（R4），定位精度最高 | 「居中」由系统算，理论上最干净 |
| 缺点 | 章首真居中需插留白（视觉代价）；章末仍受内容末尾物理限制（由 ② 缓解） | `childrenMainSize` 要求提供的高度与真实一致，我们**恰恰不知道真实高**；`getItemRect` 需在稳定时刻取样，容易写成反馈回路（历史上已翻车一次） | 重构正文渲染结构（高亮 Span 模型、块索引、进度锚、内存窗口全受影响），风险远超收益 |
| 风险 | 低 | 中高（尺子反馈回路是已翻车的坑） | 高 |
| 工作量 | 0.5~1 天 + 真机验 | 2~3 天 | 1 周以上 |
| 结论 | ✅ 采用 | ⏸ 仅作为 FIX-004 的**条件**分支（当测量显示残差 > 1 行高时，用静态系数定标，**不做实时反馈**） | ❌ 本轮不做 |

### 2.2 推荐方案

**方案A（分阶段、一次只改一个变量、每阶段单独出包真机验）**：

1. **FIX-001**：跟读目标的**上界夹取**从 `this.maxScroll` 放宽为 `this.maxScroll + band`（保留 `Math.max(0, …)` 下界）。
   → 直接治 D1（估算 `maxScroll` 比真实可滚范围小 ⇒ 停早 ⇒ 按钮不出现）。
   → 依据：「算过头无害（List 自己会夹），夹小了才会卡死」（`03` §J.2 教训 1 的正确方向用法）+ 官方越界夹取规定。
   → **不改** `measureBlocks`、**不改** `realMaxScroll`、**不加**页脚常量（避免重演「估 120vp + 钉底补丁」那条被回退的路）。
2. **FIX-002**：滚动模式 List 增加 `contentEndOffset`（≈ `band/2 + 页脚实测高`，常量，上限一屏內），让「末句滚到中心」在物理上可满足、页脚按钮必然进入视口。
   → 治 D2 的物理限制那一半；官方就是为这条准备的。
   → 改前先确认 `pageMode` 是否共用同一个 List，若共用则按 `pageMode` 条件设置（翻页模式不受影响）。
3. **FIX-003（已拍板＝B，2026-10-16）**：章首 **维持现状、不插留白、不硬居中**，把口径写进 `01-纯阅功能规格.md` §2.4（章首正文不足半屏时首句位于屏幕上部，屏上由「上一章」按钮占位）。**不改代码**。
   → 否决的 (a)：加 `contentStartOffset`（首句真居中，代价：章首顶部约半屏空白 + 「上一章」按钮被推下去）；与历史口径「短章不插空白」（`plan.md:757`）冲突。若日后用户改主意，再按 `contentStartOffset ≈ band/2 − 70` 单独立项。
4. **FIX-004（条件触发）**：若 M-001 真机测量显示残差 > 1 行高（≈30vp）：① 按 `03` §J.4 的测量法定标一个**静态**系数喂回 `measureBlocks`（禁止随滚动实时重算）；② 修 `pixelOfLocal` 末块 fallback（`R:1083`）改用块自身估算高 `Paginator.linesOf(...)×lineH`。
5. **FIX-005**：真机验收 + 取证单 + 回写 `04` + 出包交付（自用版 release hap，md5 三处对齐）。

### 2.3 技术实现

| 任务 | 文件:位置 | 改动 | 依据 |
|------|-----------|------|------|
| FIX-001 | `Reader.ets:1069` | `Math.min(this.maxScroll, centerY - band/2)` → `Math.min(this.maxScroll + band, centerY - band/2)` | 官方越界夹取规定；`03` §J.2 教训 1；估算 `maxScroll` 只作为「我们自己的下限估计」，过冲交给 List 夹 |
| FIX-002 | `Reader.ets:4998` 附近的滚动模式 `List` | 加 `.contentEndOffset(CONTENT_END_OFFSET)`（常量 ≈ `band/2 + 实测页脚高`，建议先取 `band/2 + 100`，真机实测后定）；`pageMode` 共用则加条件 | 官方 `contentEndOffset`：「列表滚动到末尾位置时，列表内容与列表显示区域边界保留指定距离」；注意官方约束「`contentStartOffset + contentEndOffset` 超过 List 内容区长度后两者会置 0」 |
| FIX-003a | 同上 List | `.contentStartOffset(...)` —— **已否决（2026-10-16 拍板 B）**，此行仅留档 | 同上（首留白） |
| FIX-003b | `01-纯阅功能规格.md` §2.4（文档，不改码） | 写明「章首正文不足半屏时不硬居中」 | 用户拍板 B |
| FIX-004a | `Reader.ets:3592` | `this.contentHeight = top * RULER_SCALE`，`RULER_SCALE` 为**实测定标系数**（一次算好写死，禁止运行时更新） | `03` §J.4 测量法；官方承认 `currentOffset()` 是估算 |
| FIX-004b | `Reader.ets:1083` | 末块 fallback：`y1 = y0 + lineH` → `y1 = y0 + Paginator.linesOf(this.blocks[bi], this.measWidth, this.fontSize) * lineH`（或复用一个 `blockEstH(bi)` 小函数） | 末块塌成一行的插值误差 ≤1 行高，属纯算术修正，可离线门禁 |
| G-001 | 新文件 `tools/reader_center_selftest.py` | 1:1 移植 `centerTarget / pixelOfLocal / measureBlocks` 的**纯算术**（无设备依赖），跑用例；含**反向对照**（拿 `git show HEAD:...Reader.ets` 的旧算术跑同一用例必须失败） | 照 `tools/reader_pos_selftest.py` 的移植法（该文件已移植 `Paginator` + 位置链，但**不含**居中算术） |

### 2.4 风险评估

**影响范围**
- 直接影响：滚动模式的听书跟读定位（`centerTarget` 目标值上限）、滚动模式 List 的尾部留白。
- 间接影响：章末页码判据（`R:3647-3651` 用 `atBottomPx/atBottomList`）、`onReachEnd`→`endReachY`（`R:5048-5053`）、「自动滚动换章」判据（`R:3220` 用 `this.maxScroll - 8`）。`contentEndOffset` 会**改变 `currentY()` 的可达上限**，上述判据若仍以 `maxScroll` 为准会提前/滞后触发 ⇒ FIX-002 必须同时核对这三处。
- 翻页模式：不动（改前确认 List 是否共用，共用则加 `pageMode` 条件）。

**副作用分析**
- FIX-001 的唯一副作用是「过冲时由 List 夹住」：官方语义是滚到边界后停住（不回弹），视觉上就是"顶到底"，无抖动；若真机出现异常（例如越界后动画停在中途），立即回退单行改动。
- FIX-002 会让章末**多出一段空白**（内容与显示区边界保留距离）——这正是「末句能居中」的代价；留白量取小值并真机看观感。
- 严禁引入：用 `realMaxScroll`/回调学到的真实上限做夹取；运行时重算尺子偏置；章尾「揭示/钉底」补丁；预取/计时补偿（全部是 `03` §J + 技能 §7 已判负收益的写法）。

**回滚方案（每条改动落地前先写死）**
1. 开工前先钉基线：工作区当前状态 → `git commit` 为 `fixbase/tts-scroll-center`（或 `git stash -u` 备份），记录 `HEAD` sha 与现有 hap 的 md5；另存 `Reader.ets` 副本到 `release/_bak/Reader.ets.<md5>`。
2. 每个 FIX 单独 commit；回退只需 `git checkout <fixbase> -- entry/src/main/ets/pages/Reader.ets` 并重编译重装。
3. 装机前必取 hap md5 并当场回写文档（`check_both.py` 会覆盖同一输出路径，事后补记必错）。
4. 出包门禁：动了共享文件就跑 `python tools/check_both.py`（自用版 + 上架版裁剪都要过），交付的真机包必须与门禁包同 md5。

---

## 三、Agent任务拆分

### 3.1 批次规划

> 铁律：`Reader.ets` **一次只有一个会话/Agent 改**（文档库 `05-§四`）；并发上限 2；同一批次内**同一文件不得有两个写者**。

| 批次 | 执行方式 | 任务 | 触碰文件 |
|------|----------|------|----------|
| Batch 0 | 串行（人/主会话） | 基线钉死 + `04` 登记 | git、文档库 |
| Batch 1 | 并行 2 | **M-001** 真机测量取证 ／ **G-001** 离线门禁（红） | M-001：无（只读设备）／G-001：`tools/` |
| Batch 2 | 串行 1 | **FIX-001**（+101 行改动上限，出包真机验） | `Reader.ets` |
| Batch 3 | 串行 1 | **FIX-002**（`contentEndOffset` + 三处判据核对） | `Reader.ets` |
| Batch 4 | 串行 1 | **FIX-003＝口径 B**：改 `01` 规格（**不改代码**） | 文档库 |
| Batch 5 | 串行 1 | **FIX-004b（首要，已定开工）** 末块插值改按块估算高（治 R5）；FIX-004a 暂缓 | `Reader.ets` |
| Batch 6 | 串行 1 | **FIX-005** 验收 + 取证单 + 回写 + 出包交付 | 文档库、`release/` |

### 3.2 任务依赖关系图

```
Batch 0 基线钉死（必须最先）
   ↓
Batch 1  M-001 真机测量 ─┐
         G-001 离线门禁（红）─┤（互不依赖，可并行）
   ↓                     ↓
Batch 2  FIX-001 ←── 用 M-001 的真实内容高/页脚高做判据
   ↓
Batch 3  FIX-002
   ↓
Batch 4  FIX-003（待拍板）
   ↓
Batch 5  FIX-004（仅当 M-001 残差 > 1 行高）
   ↓
Batch 6  FIX-005 验收 / 出包 / 回写
```

### 3.3 Agent任务卡

#### Agent任务: M-001 真机测量取证（先量再改）

- 任务ID: M-001 ｜ 级别: 取证（不改代码）｜ 依赖: 无 ｜ 风险: 低
- 目标：一步拿到**真实内容高**与**页脚真实高**，为 FIX-001/002/004 定数。
- 执行步骤（照 `03` §J.4）：
  1. 真机装当前基线包（记录 md5），打开长章书，切滚动模式；
  2. **停朗读**，手滑到本章最底 → **等 ≥600ms** 再读 `scroller.currentOffset().yOffset`；
  3. `真实内容高 = 该值 + viewportHeight`；`标定系数 = 真实内容高 / 估算内容高`（估算值取 `measureBlocks` 的 `contentHeight`，可加临时日志）；
  4. 用 `uitest dumpLayout` 取章末「下一章」ListItem 的 `bounds`，算页脚真实高（含 margin）；
  5. 抓一段章首/章末的 `center follow` 全量日志，算 `dev` 分布（中位数、章首前 5 条、章末最后 8 条）。
- 输出：`FIX-000-取证单.md`（数值 + 原始日志片段 + 截图 + 包 md5）。
- 验证标准：数字可复算；截图与数值一致；明确给出「残差是否 > 1 行高」。

#### Agent任务: G-001 离线门禁（红 → 绿）

- 任务ID: G-001 ｜ 级别: 优化（测试资产）｜ 依赖: 无（可与 FIX-001 并行，不碰 `Reader.ets`）｜ 风险: 低
- 输入：`Reader.ets` 的 `centerTarget`(R:1062) / `pixelOfLocal`(R:1074) / `measureBlocks`(R:3581) 三处纯算术；参考 `tools/reader_pos_selftest.py`。
- 输出：`tools/reader_center_selftest.py`（+ `reader_center_cases.json`），用法例见 `test-strategy.md` §2.1；含**反向对照**（`git show HEAD:entry/src/main/ets/pages/Reader.ets` 的旧算术必须失败/报错）。
- 验证标准：FIX-001 之前用例为**红**；FIX-001/004 之后全绿；反向对照确认门禁有牙（非恒真摆设）。

**交付记录（2026-10-16，编排者已自行复跑验伪）**
- 交付物：`tools/reader_center_selftest.py`（31,649 B，`md5=a74dd43f2a4e3a0944b2f12104d7e25b`）、`tools/reader_center_cases.json`（6,243 B，`md5=c92334e6de38dbcccab4a1c7c3491da2`）；纯标准库、纯 ASCII、`--source <path>` / `--expect-green`。
- 基线分色（**改码前**）：`TOTAL: 57 checks, 53 pass, 4 fail`；`COLOURS: UT-001=GREEN UT-002=RED UT-003=RED UT-004=GREEN UT-005=GREEN`；退出码 0（分色符合预期即 0）。
- 红的四条：`UT-002.b`（`want=3356 == maxScroll=3356`，被夹死，raw=3756.58）、`UT-003.c`（末块跨度 41.83 vs 估算 714）、`UT-003.f`（末块末尾到不了 `contentHeight`）、`UT-003.g`（换工程默认尺子 18×1.7 同样红）。
- 反向对照（编排者复跑）：`git show HEAD:…Reader.ets` 作源 → 同样 RED，行号随版本位移（1069→1067、1083→1081）⇒ 断言跟着真实代码走。
- ⚠️ 未确认项：门禁里的 `viewport=1264vp` / 尺子 `315vp / 21vp / ×2.0` 借自 `tools/reader_pos_cases.json`，本轮**未在真机复核**。

#### Agent任务: FIX-001 跟读目标上界改为有界过冲

- 任务ID: FIX-001 ｜ 级别: P1 ｜ 影响模块: 滚动跟读定位 ｜ 依赖: Batch 0 ｜ 风险: 低
- 问题描述：`R:1069` 把 `want` 夹在估算 `maxScroll` 上，章末到不了真实底 ⇒ 页脚按钮不出现、末句偏移大（§1.3 R1）。
- 修复方案：上界 `this.maxScroll` → `this.maxScroll + band`；下界 `Math.max(0, …)` 保持不变；不动 `measureBlocks`、不动 `realMaxScroll`。
  ❗**实现约束（G-001 门禁要求）**：`Reader.ets:1069` 必须写成**精确字符串** `const want: number = Math.round(Math.max(0, Math.min(this.maxScroll + band, centerY - band / 2)));` —— 门禁是按字符串抽取比对的，等价但不同写法会报 `clamp=UNKNOWN` 并仍判红；不要改门禁来迁就写法。
- 输入：`entry/src/main/ets/pages/Reader.ets`（当前工作区基线）；回退点 = Batch 0 的 commit。
- 输出：改动后的 `Reader.ets`（单提交）；release hap（当场 md5）；真机日志（`center follow` 章末序列 + `dumpLayout` 找「下一章」）；`FIX-000-取证单.md` 追加。
- 执行步骤：① commit 基线；② 改 1 行；③ `python tools/reader_center_selftest.py`（新用例转绿）；④ `node.exe hvigorw.js assembleHap … -p buildMode=release`（先 `export NODE_HOME`/`DEVECO_SDK_HOME`）；⑤ 装机（`-r -d`）+ `aa force-stop` + `aa start`；⑥ 真机复现 §1.4 → 截图 + 日志。
- 验证标准：**先挑一章「章末被夹死且按钮不可见」的章**（判据：读到章末时「下一章」bounds 取不到；M-001 的 ch229 是反例，不能拿它当验收章），修后该章「上一章/下一章」**可见**（截图 + bounds 在视口内）；章末 `want` 不再恒等于 `maxScroll`；同一章 `|dev|` 中位数不劣于改前；翻页模式无变化；`python tools/reader_center_selftest.py --expect-green` 全绿。

**交付记录（2026-10-16，编排者已自行复跑验伪）**
- 改码部分已落地：`Reader.ets:1069` → `Math.min(this.maxScroll + band, centerY - band / 2)`；`md5 前=5ab301f2cc28403e1bae0fa942c0618a`（备份留在 `release/_bak/Reader.ets.pre-fix001.5ab301f2…`）→ `md5 后=4bc53f91079fae78f84a949ba3f3df9f`；`diff 备份 vs 现文件` = **恰好 1 行**，其它夹取点（1148/1800/1815/3612）未动；**未 commit、未 add**（工作区里另有第三方会话的未提交改动）。
- 门禁（编排者复跑）：`reader_center_selftest.py --expect-green` → `57 checks / 54 pass / 3 fail`，`UT-002 红→绿`，`UT-003 仍红`；`reader_pos_selftest.py 150/150`、`jsonrule 13/13`、`shelf` ✅、`voice` ✅。
- ⚠️ **派单口径修正**：门禁的 `--expect-green` 把 `UT-003` 也算进「改后应全绿」，而 `UT-003` 的红源在 `Reader.ets:1083`（末块回退），属 **FIX-004b** ⇒ 「1069 单独出包」阶段**不应**用 `--expect-green` 收口，改判据为「`UT-002` 转绿 + 其余分色不变 + 四条既有回归全绿」。`UT-003` 未绿前**不许**动 `reader_center_cases.json` 的 `expect_now`。
- ⚠️ 已知：无参模式下门禁会报 `COLOUR-REGRESSION UT-002`（它记的基线是「改前颜色」）—— 这是 FIX-001 落地后的**正常现象**，等 FIX-004b 也落地、且反向对照复跑过之后再更新基线。
- **真机 A/B 结果**（`FIX-001-真机取证.md`；编排者已看实物截图 + 布局转储核对，不是只听自述）：① 修复的算术**确证生效** —— 旧包 `want` 被夹在 `maxScroll=26649`，新包原样通过 `26679`；② **用户可见症状在两包上都复现、未见可分辨差异**（章末开朗读后「下一章」从布局树消失；ch371 上新旧包 `want/curY/max` **逐字相同**）；③ 新包 +16s 后按钮重新可见、页码回到 `36/36`（旧包该章已 auto-advance，未取到对照 ⇒ 不能声称旧包不会恢复）。
- **处置结论**：FIX-001 **保留**（算术正确、无回归；对「估算 `maxScroll` 偏小」的章仍有效），但**它不是本症状的解药** —— 解药是 **FIX-004b（R5）**。新包已装到用户真机（自用版，`updateTime=2026-10-16 01:17:42`，书架「书源」入口在）。

#### Agent任务: FIX-002 List 尾部留白（`contentEndOffset`）—— **已决定不做（2026-10-16 用户实听确认）**

- **决定：不做。** 用户真机实听后反馈「**句末高亮现在就很好**」⇒ FIX-001（`:1069` 上界）＋ FIX-004b（`:1083` 末块插值）两条已把症状解决，**不需要**再给章末插尾部留白（插了反而会在章末留下空白段）。本卡留档，若日后有人再提「末句要严格居中」再议。
- 任务ID: FIX-002 ｜ 级别: P1 ｜ 依赖: FIX-001 ｜ 风险: 中
- 修复方案：滚动模式 List 加 `.contentEndOffset(band/2 + 实测页脚高)`；同步核对 `R:3220`、`R:3647-3651`、`R:5048-5053` 三处底部判据在留白生效后是否仍正确（必要时改用 `Scroller.isAtEnd()` / `onScrollEdge`）。
- 验证标准：章末末句 `|dev| ≤ 0.15×band`（真居中或接近）；按钮可见；自动换章不提前触发；`pageMode` 行为不变。

#### Agent任务: FIX-003 章首口径（待拍板）

- 任务ID: FIX-003 ｜ 级别: P1（口径）｜ 依赖: 用户拍板（**已拍板 ＝ B**）+ FIX-002 ｜ 风险: 低
- 方案（B，已定）：**不改代码**，只改 `01-纯阅功能规格.md` §2.4：写明「章首正文不足半屏时不硬居中，首句位于屏幕上部（屏上由『上一章』按钮占位）」；同时把「章末读到最后一屏的内容即滚到最下方并让末句居中」写清。
- 验证标准：文档口径生效；真机实测章首首句距顶 ≤ 0.35×band 且与文档描述一致、无逐 tick 抖动。

#### Agent任务: FIX-004b 末块插值改按「块自身估算高」（**首要**，治 R5）

**交付记录（2026-10-16，编排者已自行复跑门禁 + 逐张看真机截图核对）**
- 改动：`Reader.ets:1083` → `const y1 = (bi + 1 < this.blockTops.length) ? this.blockTops[bi + 1] : y0 + this.blockEstHeight(bi);`（复用现成 `blockEstHeight`，`R:354`）；`md5 4bc53f91… → 0628c8ed…`；备份 `release/_bak/Reader.ets.pre-fix004b.4bc53f91`；**仅 1 行**（文件大小 −8 字节）。
- 离线门禁（编排者复跑）：`--expect-green` → **57/57 全绿 EXIT 0**（`UT-003` 红→绿，`lastBlockSpan: ONE_LINE→EST`）；`reader_pos_selftest 150/150`；jsonrule 13/13；shelf/voice ✅。
- 真机复验（`FIX-004b-真机取证.md` + `scratch/fix004b/`；两处**编排者看图纠正**见下）：
  - ✅ **ch371 章末（上一轮"节点消失"的取证章）持续达标**：朗读 +7/+12/+16s，`dumpLayout` 里「下一章」恒在 `[1041,2455][1193,2514]`，末块 `Text` 从 `[67,1377][1193,2750]` 变为 `[67,128][1193,2361]`，页码恒 `第 37/37 页`；我亲自看 `p2_ch371_tts16s.jpeg`：**末行 + 「上一章/下一章」同屏**。
  - ⚠️ **ch370 "+10s 未达标" 是取样时机问题，不是回归**（编排者判读）：该时刻**朗读还没读到末块**（末块正是插值被修的那块），所以状态与旧包相同；我亲自看 `p2_ch370b_tts10s.jpeg`（未达标：无按钮、`第 34/36 页`）与 `p2_ch370b_tts19s.jpeg`（**已恢复**：末行 + 两按钮 + `第 36/36 页`）。⇒ 结论是「读进末块后才生效」，而**旧包在同一位置是持续不恢复**（§1.3 R5 的 12.6s 实测）。
  - ⚠️ **章首那条「60.7% 屏高、不再贴顶」不能当修复证据**（编排者纠正）：我看 `p3_ch371_head_start8s.jpeg` —— 屏幕顶部仍是「上一章」按钮 + 章标题，说明**视图就在章首（curY=0）**，高亮是该章**第 3 段**的句子，自然在 58% 处；与 M-001 基线（**第一句**、21vp）不是同一时刻 ⇒ **章首第一句仍必然贴顶（口径 B，物理限制）**，此处无改善也无恶化。
  - 轻量回归：章中两帧高亮 60.5%→68%（在屏内、无逐 tick 抖动）；滚动模式 `switch-in/switch-out` 0 次；翻页模式听书正常并已切回滚动。

- 任务ID: FIX-004b ｜ 级别: **P1**（章末 D1/D2 的主因）｜ 依赖: FIX-001 已落地 ｜ 风险: 低（纯算术 + 有离线门禁）
- 修复方案：`Reader.ets:1083` 末块 fallback `y1 = y0 + this.fontSize * this.lineHeight` → 改成该块自身的估算高（优先用现有 `blockEstHeight(bi)`，若无则 `Paginator.linesOf(this.blocks[bi], this.measWidth, this.fontSize) * lineH`）。**只改这一处**，不动上界、不动尺子归一化、不动 `measureBlocks`。
- 验证标准：`tools/reader_center_selftest.py --expect-green` → **57/57 全绿 EXIT 0**（`UT-003` 红→绿）；`reader_pos_selftest.py` 仍全绿；出包后真机复测同一章末：**「下一章」在朗读期间仍在屏内**（`dumpLayout` 能取到 bounds）+ 末块 `Text` bounds 不再压到视口底；章末高亮位置以截图量像素记录（与改前同一章对照）。

#### Agent任务: FIX-004a 尺子静态定标（条件触发，暂缓）

- 任务ID: FIX-004a ｜ 级别: P2 ｜ 依赖: 真机实测残差 > 1 行高 ｜ 风险: 中
- 修复方案：`R:3592` 乘一个**实测写死的** `RULER_SCALE`（禁止运行时重算、禁止反馈回路）。
- 说明：M-001 未取到标定系数、FIX-001 A/B 显示 ch370/ch371 估算**偏大** 170~350vp（量级 0.6~1.3%）⇒ **暂不开工**，等 FIX-004b 落地后再量一次（届时全程用截图量像素）。
- 验证标准（FIX-004a 若开工）：章首/章末位置以**截图量像素**对照改前明显靠中；`dev` 中位数同章前后收敛；门禁 `--expect-green` 保持全绿 + 反向对照仍失败。

#### Agent任务: FIX-005 验收 / 出包 / 回写

- 任务ID: FIX-005 ｜ 级别: P1 ｜ 依赖: 以上全部 ｜ 风险: 中
- 内容：按 `test-strategy.md` §3 逐条验收；`python tools/check_both.py` 过双包门禁；出**自用版 release hap**（用户日常用自用版）并 `hdc install -r -d` 直装真机；`release/<版本>/` 归档；md5 三处对齐；回写 `03`/`04`/`01`；飞书私聊交付说明。
- 验证标准：验收点清单全绿 + 装机后 `bm dump -n` 的 `updateTime` 是本次 + 真机截图复核。

---

## 四、实施计划

### 4.1 阶段划分

| 阶段 | 任务 | 产出 |
|------|------|------|
| 阶段0 | Batch 0 | 基线 commit + `04` 登记 |
| 阶段1 | M-001, G-001 | 取证单（真实内容高/页脚高/`dev` 分布）+ 离线门禁（红） |
| 阶段2 | FIX-001, FIX-002 | 修好的 `Reader.ets` + 真机日志/截图 + release hap |
| 阶段3 | FIX-003（拍板后）, FIX-004（条件） | 章首口径落地 + 定标系数 |
| 阶段4 | FIX-005 | 验收报告 + 取证单 + 文档回写 + 出包归档 |

### 4.2 发布计划

- 不升版本号（未正式上架前 `versionName=1.0.0` 恒定）；改动逐条单独出包真机验，**每次只装一个变体**（自用版），装完确认手机上留下的是自用版。
- 交付口径：直装真机（不是"发个文件"）+ 飞书私聊说明（附 hap md5）。

### 4.3 待办登记

开工前把本轮 FIX-001~005 以「承诺 + 验收判据」一行一条追加到 `04-纯阅待办与验收.md` 的「已承诺未完成」区块；`04` 现有 #1/#2 两条与本方案同指一件事，完成后一并划掉。

---

## 五、口径裁定与红线

**裁定顺序**（文档库 `05-§三`）：用户本次拍板 > `01-纯阅功能规格` > `03-关键约定与踩坑` > `04-待办与验收` > 专项文档。**技能笔记（`references/*.md`）不在该顺序内，属工具层笔记，只作为"踩过的坑"参考，不得当作现行实现口径。**

**同一问题的并存口径（本方案裁定）**

| 冲突点 | 技能笔记说法 | 文档库说法 | 裁定 |
|--------|--------------|------------|------|
| 章末按钮可见性 | `contentHeight = top + FOOTER_H(≈120vp)`、读到「本章最后 3 句」每 tick `scrollEdge(Edge.Bottom)` | `03` §J：「章尾揭示…一律撤销」「不要再加揭示/钉底这类补丁」 | **以文档库为准**；本轮用官方 `contentEndOffset` + 上界过冲（结构性、无补丁、不依赖估的 120vp） |
| 跟读目标夹取 | 一度记 `lim = maxScroll + bias` | §J.2：不得用"学到的真实上限"夹取（算过头无害，夹小了才卡死） | 两者不冲突：**只用估算系**，且上界放宽 `+band`（不引入真实上限） |
| 偏置标定三点 | `CENTER_BIAS_FRAC` +0.12/−0.10/+0.05 ⇒ 38%/60%/45% | 代码中该常量**不存在**，历史零命中 | **视为已回退的旧尝试**；本轮不重建偏置常量，先用官方留白把"能不能到中心"解决，再谈观感微调 |
| 章首不插空白 | — | `plan.md:757` 实测短章 `want=0 curY=0 clamped=1`（正文留原位、不插空白） | 保持；章首真居中需用户拍板（FIX-003a） |

**红线（任何 FIX 都不得引入）**

1. 用 `realMaxScroll` / 任何"学到的真实上限"夹取跟读目标（`03` §J.2 教训 1，已实测卡死 34/37）。
2. 跟读过程中实时重算尺子偏置/锚点（反馈回路 ⇒ 屏幕上下抖）。
3. 章尾"揭示/钉底"补丁、把 `FOOTER_H` 当成常量硬编码 120vp。
4. 往计时/定位模型叠补偿（预取、预灌水位、起播时刻补偿等，均已判负收益）。
5. 一次改多个变量后一起真机验（分不清哪条起作用 ⇒ 只能整体回退）。
6. 用 `onScrollFrameBegin` 拿程序化滚动的剩余距离（官方明文不触发）。

---

## 六、追加问题：章中（一般情形）高亮不够居中（2026-10-16 用户追加）

> 用户原话：「**但是其他时候滚动听书的高亮不够居中**」——即 §1.2 的 D2 在**章中/一般情形**仍存在（章末已在 FIX-004b 后由用户确认「句末高亮现在就很好」）。本节为同一专项的续修，沿用本目录，不另开文档。

### 6.1 现状与已知可疑点

- 目标式（`Reader.ets:1062-1071`）：`want = clamp(0, maxScroll + band, centerY − band/2)`，`centerY` 由 `pixelOfLocal`（估算像素）给出；**死区** `CENTER_DEADZONE_FRAC = 0.08`（`Reader.ets:94`）⇒ 高亮在**中心 ±8%×band（≈±62vp ≈1.5 行）** 内时**故意不滚**。
- 上一轮 fix004b 真机复验里，章中两帧量到高亮在 **60.5% → 68%**（偏中心**下方** 10~18%×band）——但那是子Agent用日志/坐标推的，**未经截图像素复核**（本轮已定规：绝对位置一律以截图量像素为准）。
- 早期真实对照（M-001）显示：同一刻日志 `hrel = −641`（说高亮在视口上方 641vp）而截图里高亮在屏内约 48% ⇒ **日志系与真实系差 0.8~0.9×band**，所以「不够居中」的结论**必须先用截图量出来**再动手。

### 6.2 待验判据（测量法，真机）

用截图程序化量：截图 1260×2844；正文可视区取 `dumpLayout` 里 List/Text 的 bounds（例：`[0,128][1260,2750]` ⇒ 顶 128px、高 2622px）。
1. 在图上做**高亮底色检测**（`hiBgColor()` 那块底色），取该色像素占比超过阈值的连续行区间，算其中心 `y_h`（px）；
2. **偏移** = `(y_h − (可视区顶 + 可视区高/2)) / 可视区高`（0 = 正中；负 = 偏高、正 = 偏低）；
3. 章中随机采 **≥10 个时刻**（间隔 ≥10 s，含长段与短段各 ≥3 次），给出 偏移的 min/中位/max 与**方向是否单向**；每个采样点同时记录该刻 `center follow` 的 `dev/want/curY` 做**日志 vs 截图**的对照。

**判据**：用户要的「居中」= `|偏移| ≤ 5%`；若中位 |偏移| 在 5%~15% 且**单向**，则可能是「死区 + 单向估算偏差」的固定组合；若**双向散布**，则先查 `followFrontier` 的早退条件（块布局未就绪 / 用户让位窗）是否在听书期间频繁命中。

### 6.3 候选修法（**测完只挑一条**，各自单独出包）

| 编号 | 修法 | 代价/风险 | 适用前提 |
|---|---|---|---|
| C1 | 收紧死区 `CENTER_DEADZONE_FRAC` 0.08 → 0.03 | 滚得更勤、有抖动观感风险 | 偏移分布双向、量级 <10% |
| C2 | 加一个**静态**居中偏置常数（等效旧的 `CENTER_BIAS_FRAC`，把目标整体上移/下移固定量） | 只治系统性单向偏差；换字号/语言可能需重标 | 偏移**单向且稳定** |
| C3 | 用 `Scroller.getItemRect(块号)` 在**稳定时刻**取真实块 y 做锚点校正（**禁止**随滚动实时重算——那是已翻车的反馈回路） | 中；需谨慎实现"只在稳定时刻采一次" | 偏移随块序**累积变大**（估算系漂移） |
| C4 | 长句的「盯正在读的那一行」改用「块内行号 × 行高」（`floor((local−b0)/perLine)`） | 低；当 `perLine` 非整数时与线性 `frac×块高` 同源，收益需实测确认 | 偏移随**块内位置**规律变化 |
| C5 | 查并修 `followFrontier` 的早退/让位窗在听书期间被错误命中 | 低 | 偏移**双向散布**或高亮长时间不动 |

### 6.4 验收

- 章中 `|偏移| ≤ 5%`（截图量像素，≥10 个采样点中位）；
- 章末维持现状（用户已确认「句末高亮现在就很好」，**不许回退**）；
- 章首维持口径 B（不插留白、第一句贴顶属设计行为）；
- 日志 `dev` 只做同章前后对照，不作为验收判据；
- 离线门禁 `python tools/reader_center_selftest.py --expect-green` 保持全绿；改动若涉及 `centerTarget` 表达式，同步更新门禁的字符串抽取目标（**不许**放宽断言）。
