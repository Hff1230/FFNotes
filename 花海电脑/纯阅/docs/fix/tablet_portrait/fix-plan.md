# 修复方案文档 — 纯阅平板竖版适配

> 文档生成时间: 2026-10-17
> 关联问题ID: FIX-TABLET
> 性质: 🔵 功能优化（非 Bug）——让 1.0.0 手机版在平板竖版达到「原生平板」体验并具备出包出图条件

---

## 一、问题诊断

### 1.1 问题概述
| 属性 | 内容 |
|------|------|
| 问题ID | FIX-TABLET |
| 发现时间 | 2026-10-17 |
| 影响级别 | P2 |
| 问题状态 | ✅ 已完成（2026-10-17 03:43 落地；2026-10-17 起定版 **1.0.1**/1000001 重出包） |
| 影响模块 | Index.ets（书架列数）、Reader.ets（设置面板限高）、模拟器环境、AGC 上架资料 |

### 1.2 问题描述
用户要求「准备纯阅平板竖版版本，使用模拟器测试，及后续出包出图」。当前包已声明 tablet，可在平板上以兼容模式运行，但未经平板竖版实测，且大屏下有已知体验短板（书架 3 列被拉宽、设置面板限高偏矮、弹窗 84% 宽在超宽屏观感差）。

### 1.3 现状盘点（2026-10-17 只读子Agent取证，全部已核实）

**代码侧（好消息：0 个文件是「不改就跑不起来」）**
- `entry/src/main/module.json5:7-10`：`deviceTypes = ["phone","tablet"]` **已含 tablet**；全工程无 `orientation` 锁（跟随系统）。
- `AppScope/app.json5`、`build-profile.json5`：无设备类型配置需改。
- 布局：主布局全部 `width('100%')` + 弹性；固定数值宽度只出现在小控件（标签列 72、图标 26 等）。**无** GridRow/GridCol/breakpoint/windowSizeChange 响应式设施（grep 零命中）。
- 阅读页几何：`viewportWidth/Height` 来自 `.onAreaChange`（vp），翻页模式 `Reader.ets:5690-5697`（注释明确处理旋转/分屏重分页）、滚动模式 `Reader.ets:5807-5838`（vh/vw 变化>1vp → 锚位→measureBlocks→rebuildPages→restoreScrollToOffset）。**平板视口变化已被这条链路覆盖**。
- 已知短板 3 处：
  1. `Index.ets:855` 书架 `columnsTemplate('1fr 1fr 1fr')` 写死 3 列 → 平板竖屏卡片被拉得很宽；
  2. `Reader.ets:5563` 设置面板 `constraintSize({maxHeight:360})` → 平板大屏偏矮；
  3. 弹窗 `width('84%')`（Index.ets:1260-1302、SourcePage.ets:2171）→ 超宽屏观感。
- 资源：仅 base/media 一套（app_icon 512px、startIcon 144px），无分密度目录，平板可缩放复用，不阻塞。

**模拟器侧**
- `Emulator.exe -list` 有 MatePad Pro 13 实例，但 **tablet_x86 镜像从未下载**（实例是 4 月的空壳，只有 config.ini）。
- 平板镜像可下载：`Emulator.exe -imageList -deviceType tablet` → HarmonyOS 7.0.0(26.0.0) 有 tablet 镜像（与现有 PureReadAPI26 手机实例同 API 26，**选它**）。
- 命令行可全自动：`-install -deviceType tablet -osVersion "HarmonyOS 7.0.0(26.0.0)"` → `-create <名> -deviceType tablet -screenProfile "MatePad Pro 13"` → `-start`；支持 `-rotation`、`-screenshot`。
- 当前在线：`127.0.0.1:5555`（手机模拟器）、真机 `2NP0224531032649`（离线）。
- `tools/emu.py:47` 取 hdc 第一个 target——手机+平板模拟器同开时会打错设备，需加 SERIAL 过滤（技能铁律：每条命令显式 `SERIAL=`）。

**AGC 上架侧（官方口径，已核来源）**
> 📚 **技术来源**:
> - [AGC 支持设备与包声明校验](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs/faqs-appgallery-27)
> - [发布应用-支持设备（兼容模式分发说明）](https://developer.huawei.com/consumer/cn/doc/doccenter-submission/agc-help-release-app-devicetype-0000002271592112)
> - [应用素材要求（手机/平板共用素材页签）](https://developer.huawei.com/consumer/cn/doc/app/agc-help-app-material-requirement-0000001146534651)
> - [平板最佳实践（断点参考、兼容模式默认上架）](https://developer.huawei.com/consumer/cn/doc/best-practices/bpta-pad-guide)

1. 包声明 deviceTypes ≥ AGC 勾选范围，否则无法提审（我们已含 tablet ✅）。
2. AGC「支持设备」勾「平板」即可；不勾也会以兼容模式分发到 NEXT 平板，勾了才算原生平板。
3. **截图/图标手机平板共用一套素材**（同一页签上传），无需单独平板截图；图标 216×216 必传（已有 `release/1.0.0/平板图标-216.png`、`平板图标-1024.png`）。
4. 分栏/响应式适配**不是上架硬性门槛**，是体验建议。
5. ❗**发布后支持设备只增不减**：1.0.0 若先只勾手机，以后可加平板；反之删不掉。
6. 平板竖屏断点参考：MatePad Pro 13 竖屏 1440×960vp（lg），11.5S 竖屏 1120×736vp（md/lg）。

### 1.4 深层原因
工程从第一天按手机写、按百分比布局侥幸免改，但「平板竖版」要的是**验收过的平板**，不是「能跑的兼容包」——缺的是平板模拟器环境 + 3 处大屏调优 + 一轮平板竖版实测取证。

### 1.5 影响范围
- 受影响模块：书架列数、阅读设置面板、（可选）弹窗宽度
- 不受影响：分页/滚动/听书核心几何（全动态 vp）、多语言、发布签名链
- 红线：不动 `signing2/`；不动 1.0.0 已归档产物；`check_both.py` 跑着时不 commit

---

## 二、修复方案

### 2.1 方案对比

| 维度 | 方案A：最小适配（推荐） | 方案B：全面响应式（GridRow/breakpoint 系统） |
|------|------------------------|---------------------------------------------|
| 描述 | 书架列数按视口宽选 3/4/5 列（onAreaChange 记宽 + 断点变量）；设置面板 maxHeight 按视口比例；弹窗 84%→min(84%, 560vp) | 引入 breakpoint 系统重构全部页面栅格 |
| 优点 | 改动 ~3 处、风险低、与现有 onAreaChange 链路同构 | 一步到位 |
| 缺点 | 后续折叠屏/横屏分栏再按需补 | 6000+ 行 Reader 重排风险高，违背「最小改动」 |
| 风险 | 低 | 高 |
| 工作量 | 半天 | 数天 |

### 2.2 推荐方案
**方案A**。AGC 不强制响应式（来源见 §1.3 C-4），用户诉求是「平板竖版能看、能测、能出包出图」，不是分栏。

### 2.3 技术实现
1. **书架列数**（Index.ets:855 附近）：书架 Grid 外层 `.onAreaChange` 记 `shelfW`；`columnsTemplate` 由 `shelfW` 计算：`<600vp→3 列 / 600~900→4 列 / >900→5 列`（平板竖屏 960~1440vp 落 4~5 列）。不引入 breakpoint 库，与 Reader 现有 onAreaChange 同构。
2. **设置面板限高**（Reader.ets:5563）：`maxHeight: 360` → `Math.min(560, viewportHeight * 0.72)`（手机 777vp 视口下 ≈560 与 360 相比变高——需真机/模拟器复核手机侧不被撑坏；保守可 `viewportHeight>=600 ? 560 : 360`）。
3. **弹窗宽度**：`width('84%')` → `width('84%')` 保留但加 `constraintSize({ maxWidth: 560 })`（手机不受影响，平板不铺满）。
4. **模拟器环境**：`Emulator.exe -install -deviceType tablet -osVersion "HarmonyOS 7.0.0(26.0.0)"` → 删空壳 MatePad 实例或 `-create PurePad26 -deviceType tablet -screenProfile "MatePad Pro 13"` → `-start`；装 gallery 调试 hap 实测。
5. **出包**：代码改动合入后重跑 `check_both.py` → 重出上架版 .app（发布钥匙 `signing2/`，签前 PEM 级配对校验）→ 归档 `release/1.0.0/`（旧包 .bak）→ AGC 勾「平板」。
6. **出图**：AGC 手机/平板共用素材——现有 7 张 9:16 截图**不必重拍**；若用户想要平板观感图，可在平板模拟器上拍同构图替换其中几张（9:16 竖版构图不变）。

### 2.4 风险评估
- 直接影响：书架 Grid 重排（列数变化→卡片尺寸变化）；设置面板高度。
- 副作用分析：列数断点若判据错，手机上可能变 4 列（验收 V-004 钉死手机仍 3 列）；设置面板变高后手机上滚动区变化（保守三元式规避）。
- 回滚方案：三处改动各一个独立 commit，`git revert` 单点回退；模拟器环境不影响仓库。

---

## 三、Agent任务拆分

### 3.1 批次规划

**Batch 1 — 环境（串行，独占模拟器资源）**
| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-T01 | 下载 tablet 镜像 + 建 MatePad 实例 + 启动 + 装 gallery 包冒烟 | 无 | 低（下载数 GB 耗时） |

**Batch 2 — 代码（FIX-T02/T03 同文件不同文件可并行，≤2）**
| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-T02 | Index.ets 书架列数断点 + 弹窗 maxWidth | FIX-T01（先量平板真实 vp 宽） | 中 |
| FIX-T03 | Reader.ets 设置面板 maxHeight 自适应 | FIX-T01 | 低 |

**Batch 3 — 验收与交付（串行）**
| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-T04 | 平板模拟器全链路实测（书架/阅读/滚动听书/EPUB/设置/关于）+ 手机模拟器回归 + check_both 两包门禁 | T02,T03 | 中 |
| FIX-T05 | 重出上架包（signing2 签 + verify）+ 归档 + AGC 资料补平板口径 + push | T04 | 低 |

### 3.2 依赖关系图
```
FIX-T01 (平板模拟器环境)
   ↓
FIX-T02 ∥ FIX-T03 (代码，≤2 并发)
   ↓
FIX-T04 (双端实测 + 门禁)
   ↓
FIX-T05 (出包出图归档)
```

### 3.3 Agent任务卡

#### FIX-T01 平板模拟器环境
- **输入**：`C:/Program Files/Huawei/DevEco Studio/tools/emulator/Emulator.exe`
- **执行**：`-imageList -deviceType tablet` 确认 → `-install -deviceType tablet -osVersion "HarmonyOS 7.0.0(26.0.0)"`（数 GB，后台跑）→ `-create PurePad26 -deviceType tablet -screenProfile "MatePad Pro 13"`（或复用 MatePad Pro 13 空壳补镜像）→ `-start` → `hdc list targets` 拿新 SERIAL → 装 `build/outputs/gallery/HuaweiReader-gallery-screenshot.hap` → 开《使用说明》截图存 scratch。
- **输出**：新模拟器 SERIAL、首屏截图、`Emulator.exe -list` 回显。
- **验证标准**：平板模拟器上纯阅可开书；截图分辨率 ≈2880×1920（竖版 1920×2880）。
- ❗每条 hdc/drv 命令显式 `SERIAL=<新序列号>`（技能铁律，防打到手机模拟器）。

#### FIX-T02 书架列数断点 + 弹窗限宽
- **输入**：`entry/src/main/ets/pages/Index.ets`（:855 columnsTemplate；:1260-1302 弹窗）
- **执行**：书架容器 onAreaChange 记宽 → 列数 3/4/5 断点（阈值以 FIX-T01 实测平板 vp 宽定，参考 960/1440vp）；弹窗加 `constraintSize({maxWidth:560})`。改完中英双语各截图。
- **验证标准**：手机模拟器仍 3 列不变；平板竖屏 4~5 列；`check_both.py` 两包绿。

#### FIX-T03 设置面板高度自适应
- **输入**：`entry/src/main/ets/pages/Reader.ets`（:5563）
- **执行**：`maxHeight: this.viewportHeight >= 600 ? 560 : 360`（保守三元式，手机行为零变化）。
- **验证标准**：手机面板高度与改前逐像素一致；平板面板明显更高、内容不裁切。

#### FIX-T04 双端实测 + 门禁
- **执行**：平板竖版走查清单（见 test-strategy.md §2.4 场景表）；手机模拟器回归书架 3 列 + 设置面板；`python tools/check_both.py` 全绿后才允许 commit（技能铁律：门禁跑着绝不 commit）。
- **输出**：平板截图 ≥6 张（scratch）、日志判据数字、门禁回显。

#### FIX-T05 出包出图归档
- **执行**：按 `references/release-packaging.md` 顺序：自用版 hap 先出先归档 → gallery 裁剪构建 → **签前 PEM 级验 signing2 私钥↔Profile 配对** → sign-app → verify-app → 归档 `release/1.0.0/`（旧包 .bak）→ AGC 文档补「支持设备：手机+平板」口径 → 截图沿用现有 7 张（如需平板版观感，平板模拟器重拍同构图）→ commit+push（带 tag）。
- **验证标准**：交付文档三处 md5 对齐；GitHub 同步。

---

## 四、实施计划

| 阶段 | 任务 | 产出 |
|------|------|------|
| 阶段1 | FIX-T01 | 可用平板模拟器 + 冒烟截图 |
| 阶段2 | FIX-T02, FIX-T03 | 代码改动（各独立 commit） |
| 阶段3 | FIX-T04 | 双端实测报告 + 门禁绿 |
| 阶段4 | FIX-T05 | 新上架包 + 归档 + AGC 资料 + push |

发布计划：AGC 提审时「支持设备」勾手机+平板（包已声明 tablet）；❗记住**发布后设备只增不减**，本次一次勾齐。
