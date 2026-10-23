# 验证测试策略初稿：滚动模式听书「来回滚动」

> 关联问题: ISSUE-ZZ-001　关联方案: `fix-plan.md`（同目录）
> 生成时间: 2026-10-17 18:40
> 文档性质: 初稿（用于后续生成详细测试文档）
> 验收设备: 平板模拟器 PurePad26（1920×2880@320 ⇒ 960×1440vp）；手机模拟器 PureReadAPI26 作回归

---

## 一、测试范围

### 1.1 受影响模块

| 模块 | 修改类型 | 测试优先级 |
|---|---|---|
| `Reader.ets` `followFrontier`（跟读唯一执行者） | 逻辑修改（粘滞 + 看门狗） | 高 |
| `Reader.ets` `restoreScrollToOffset` / `settleChapterScroll` / `gotoChapter` / `smoothScrollStep` | 新增前置闸 | 高 |
| `Reader.ets` `onAreaChange`（可视高变化） | 分支调整 | 高 |
| `Reader.ets` 日志（`diagB` / `dlog`） | 新增 | 高（取证前提） |
| `tools/diag_log_reset_selftest.py` | 新增 UT-313~315 | 中 |
| `BookSpeaker.ets` | **不改**（红线：不往计时模型叠补偿） | — |

### 1.2 功能点清单

- [ ] 滚动模式听书：视图**只向前**，无上下往复
- [ ] 滚动模式听书：高亮始终在屏内（`inScreen=1`）
- [ ] 滚动模式听书：跨章自动续章后不「归零 → 居中 → 再归零」
- [ ] 滚动模式听书：开听书瞬间（面板收起 + 进全屏、vh 变化）不抖
- [ ] 滚动模式听书：改字号/行距后一次性重摆居中，不来回
- [ ] 滚动模式听书：停播 → 再开，位置不跳
- [ ] **非听书**：手动滚动、自动滚动、改字号、换章、页码、目录跳转全部不变
- [ ] 翻页模式听书：完全不受影响（所有闸以 `!pageMode` 为前提）

---

## 二、测试类型

### 2.1 单元/离线门禁（`tools/*.py`，秒级，先跑）

| 测试项 | 测试内容 | 优先级 | 归属 |
|---|---|---|---|
| UT-001 | 既有居中算术 57 项全绿（`reader_center_selftest.py`） | 高 | 回归 |
| UT-002 | 位置链 150 项无新增失败（`reader_pos_selftest.py`） | 高 | 回归 |
| UT-313 | `scrollcmd` 日志格式存在且含 `src/why/want/from/to/wantSrc/floor/tts/mode` | 高 | 新增 |
| UT-314 | `zigzag` 判据（相邻位移反向且各 ≥0.25 band）函数存在且被调用 | 高 | 新增 |
| UT-315 | `phase` 四处标记（chapter / vh / font / start）存在 | 高 | 新增 |
| UT-316 | 单源闸：4 处入口都含 `ttsScrollSole()` 前置判断 | 高 | 新增 |
| UT-317 | `realMaxScroll` **仍无赋值**（防复发红线） | 高 | 新增 |
| UT-318 | 红线符号零出现：`CENTER_BIAS_FRAC` / `FOOTER_H` / `forceCenterOnStart` / `rulerBias` | 高 | 新增 |
| UT-201~206 | 改字号重居中（`font_metrics_selftest.py`） | 中 | 回归 |
| UT-301~312 | 日志重置/滚动日志存在性（`diag_log_reset_selftest.py`） | 中 | 回归 |

**边界条件**
- [ ] 章末最后一块（末块插值口径，`blockEstHeight`）
- [ ] 章首第一句（贴顶＝已知设计行为，不得报错）
- [ ] 单块超长（`> 0.8×band`）走 `frontierLocal`
- [ ] `getItemRect` 全 null（连续 4 拍）才允许 `scrollToIndex` 兜底，且每段 ≤1 次

### 2.2 集成测试（模拟器，单个任务内完成）

| 测试项 | 测试场景 | 涉及模块 |
|---|---|---|
| IT-01 | 滚动模式开听书 → 90s → 跨 1 章：`zigzag` = 0、`scrollcmd.src` 集合 ⊆ {seg,tick,start,recenter,chapter} | Reader + BookSpeaker |
| IT-02 | 听书中改字号 A+ 一次：只出现 1 次重摆（`phase=font` 窗口内允许 1 条 `zigzag`），之后单调 | Reader |
| IT-03 | 听书中开/停/复播：无二次归零，`curY` 不低于目标 0.9 | Reader |
| IT-04 | 非听书回归：手动滑动、自动滚动、改字号、目录跳章、章末「下一章」可见 | Reader |
| IT-05 | 翻页模式听书：行为与改前一致（对照组） | Reader |

### 2.3 回归测试（不能破的东西）

**核心功能**
- 页码：`label … src=` 判据五条仍能命中；章末页码 == 总页数；听书时页码跟朗读位置走（`04` #7）
- 进度：滚动全程 `save pos` 不出现反向（`04` §二 判据④）；强杀重开 `restore pos` 回到原位置（误差 ≤1 屏）
- 高亮：`hi … inScreen=1`；改字号后 `LazyForEach` 换块仍重画
- 章末「下一章」在 `dumpLayout` 里仍存在（不能被 `settleChapterScroll` 闸掉带崩）

**关联功能**
- 自动滚动（非听书）：仍可用（闸只看 `ttsPlaying`）
- 长时任务/后台保活：不受影响（未碰 `BookSpeaker`）
- 平板/手机两套视口：`onAreaChange` 逻辑（vh 变化）在两种尺寸都验一次

### 2.4 场景测试（真实使用路径）

| 场景 | 操作步骤 | 预期结果 |
|---|---|---|
| 场景1 | 平板 → 打开书 → 滚动模式 → 开朗读 → 听到章末让它自动续章 → 继续听 30s | 全程单向，无往复；`zigzag`=0 |
| 场景2 | 同上，听 20s 后点「A+」一次 | 居中一次到位，无往复；`phase=font` 内仅 1 条合法重摆 |
| 场景3 | 同上，听 20s 后停播 → 等 5s → 再开 | 位置不跳回章首；`floor-reset` 仅 1 次 |
| 场景4 | 手机模拟器同路径（对照） | 与平板同结论（跨设备一致） |
| 场景5 | 非听书：滚动模式 + 自动滚动开 10s | 行为与改前一致（拍前后对比） |

---

## 三、验收标准

### 3.1 必须通过（缺一即不通过）

- [ ] 原问题不再复现：平板模拟器滚动模式听书 **90s + 跨 2 章**，`zigzag` 行 = 0（`phase` 窗口内的合法重摆不计）
- [ ] `scrollcmd` 中 `src` 集合 ⊆ `{seg, tick, start, recenter, chapter}`（无 `restore/settle/auto/idx`）
- [ ] 高亮在屏内：`inScreen=1` 占比 **> 95%**
- [ ] 位置单调：`follow-scroll` 的 `y=` 序列单调非降（除 `floor-reset(recenter)` / 换章 1 次）
- [ ] 所有离线门禁 GREEN；新增 UT-313~318 在**旧码**上 RED（证明有牙）
- [ ] `python tools/check_both.py` 两包构建通过、上架版源码还原 ✓
- [ ] `git diff` 证明**未碰** `BookSpeaker.ets`、未给 `realMaxScroll` 赋值

### 3.2 建议通过

- [ ] 手机模拟器同路径同结论（跨设备）
- [ ] 帧率无下降（滚动过程截图不卡顿）
- [ ] `tts_b.txt` 体量在 90s 内 < 200KB（日志不失控）

### 3.3 验证点清单

| 编号 | 验证点 | 验证方法 | 通过标准 |
|---|---|---|---|
| V-001 | 无上下往复 | `tts_b.txt` 里 `zigzag` 计数 | = 0（phase 窗口内 ≤1） |
| V-002 | 只有跟读在滚 | `scrollcmd` 的 `src` 去重集合 | ⊆ {seg,tick,start,recenter,chapter} |
| V-003 | 高亮居中 | `hi`/`center` 行 `inScreen`、`dev` | `inScreen=1` >95%，`|dev| ≤ 0.15×band` |
| V-004 | 跨章不抖 | 换章前后 `curY` 曲线 | 只在章首停一次，无二次归零 |
| V-005 | 改字号只摆一次 | `phase=font` 窗口内 `scrollcmd` 数 | ≤ 2（recenter 主 + 1 补偿） |
| V-006 | 页码正确 | `label … src=` | 章末 = 总页数；听书页码跟朗读位置 |
| V-007 | 进度不跳 | `save pos` / `restore pos` | 无反向；重开误差 ≤1 屏 |
| V-008 | 章末按钮可见 | `dumpLayout` 里「下一章」节点 | 存在 |
| V-009 | 非听书不回归 | 场景5 + IT-04 | 全部正常 |
| V-010 | 上架版可构建 | `check_both.py` | 通过 + 源码还原 |

---

## 四、测试建议（后续详细测试文档扩展方向）

1. **测试数据准备**：一本 ≥3 章的本地 TXT/EPUB（章节长度要一长一短，覆盖「估算 maxScroll 偏大/偏小」两种章）；一本英文书（音色/语言守卫不干扰）；平板与手机各一份相同书。
2. **自动化可行性**：`scripts/drv.py` 已可驱动 `texts / tap / swipe / shot`；「开书 → 切滚动 → 开朗读 → 等 90s → 拉日志 → 断言行」整条可脚本化（`SERIAL=<target> python drv.py …`，每条显式 `-t`）。建议做成 `tools/zz_smoke.sh`。
3. **取证脚本化**：断言直接读 `tts_b.txt`（比解析 UI 可靠）：`grep -c 'zigzag|'`、`grep -o 'scrollcmd|src=[a-z]*' | sort -u`、`grep -c 'inScreen=1'`。
4. **注入式验证看门狗**：临时把 `followFrontier` 的测试入口暴露「连续两个相反目标」，确认 `zigzag-guard` 能触发并冻结 800ms 后恢复；验证后删除注入（不留测试后门）。
5. **性能**：日志 `zigzag` 判据里有 3s 窗口数组，注意不要每拍 push 造成泄漏（上限 12 条）。

## 五、注意事项

- ❗**「看起来好了」不算通过**：必须给 `zigzag` 计数 + `scrollcmd.src` 集合 + 截图。
- ❗日志数字只作**趋势**：`center|` 的 `dev/curY` 是「估算 − 真实」混算，绝对位置一律用截图量像素（`01` §2.4④）。
- ❗平板与手机**端口每次重启会变**：先 `hdc list targets` + 按分辨率认（平板 1920×2880），别信文档里的 5557。
- ❗调试截图/拉回的日志**存 scratch**，不落 `E:\HuaweiReader`（用户明确要求）。
- ❗装包后必须 `aa force-stop` 再启动，否则跑旧码。
- ❗一次只改一个变量、每条改动先写回退方式（`04:234-235` 纪律）。

---

## 六、参考信息

**相关代码**
- `entry/src/main/ets/pages/Reader.ets`：`1072`（tick）、`1110`（`followFrontier`）、`1202/1268`（下令）、`1223-1242/1261-1262`（地板）、`1348/1363`（目标）、`2093`（restore）、`2418`（verifyPlace）、`4223`（换章重置地板）、`4815/4819/4854`（换章）、`3850`（自动滚动）、`5861`（onAreaChange）、`5924/5937`（List 回调）
- `entry/src/main/ets/utils/BookSpeaker.ets`：`185`（`dlog` 落盘，**本单不动**）
- `tools/diag_log_reset_selftest.py`、`tools/reader_center_selftest.py`、`tools/reader_pos_selftest.py`、`tools/font_metrics_selftest.py`、`tools/check_both.py`

**相关文档**
- 修复方案：`docs/fix/tts_scroll_zigzag/fix-plan.md`
- 口径依据：`03-纯阅关键约定与踩坑.md` §C.5.1/§J；`04-纯阅待办与验收.md` §二 判据④
- 历史方案：`docs/fix/tts_scroll_center_footer/`、`docs/fix/scroll_progress_jump/`、`docs/fix/tablet_portrait/test-strategy.md:52`
- 技能参考：`pure-reader-dev-workflow` → `references/scroll-follow-positioning.md`、`references/real-device-diagnosis.md`、`references/emulator-env.md`
