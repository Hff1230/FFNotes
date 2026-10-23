# 验证测试策略初稿 — 纯阅平板竖版适配

> 关联问题: FIX-TABLET
> 生成时间: 2026-10-17
> 文档性质: 初稿（用于后续详细测试文档生成）

---

## 一、测试范围

### 1.1 受影响模块
| 模块 | 修改类型 | 测试优先级 |
|------|----------|------------|
| Index.ets 书架 Grid（:855 columnsTemplate） | 布局逻辑（列数断点 3/4/5） | 高 |
| Index.ets / SourcePage.ets 弹窗（width 84%） | 布局（constraintSize maxWidth 560） | 中 |
| Reader.ets 设置面板（:5563 maxHeight） | 布局（视口高自适应） | 高 |
| 阅读页几何（不改码，回归验证） | 无改动，平板视口经 onAreaChange 链路 | 高 |
| 模拟器环境（tablet 镜像/实例） | 新增环境 | 高 |
| 发布链（check_both / 签名 / 归档） | 流程复用 | 中 |

### 1.2 功能点清单
- [ ] 平板竖屏：书架列数 4~5、卡片不变形、文件夹行正常
- [ ] 平板竖屏：TXT/EPUB 开书、分页正确、进度续读
- [ ] 平板竖屏：滚动模式 + 听书高亮居中跟读（onAreaChange 重算链路）
- [ ] 平板竖屏：阅读设置面板完整可见可操作（字号 A+/A−、翻页方式、语言）
- [ ] 平板竖屏：目录、关于页、导入弹窗、使用说明
- [ ] 手机回归：书架仍 3 列、设置面板高度与改前一致、弹窗不变
- [ ] 中英双语各过一遍书架与阅读页（排版铁律）
- [ ] 两包门禁：自用版 + 上架版裁剪构建全绿、包内无书源/诊断残留

---

## 二、测试类型

### 2.1 单元测试（离线门禁，改码即跑）
| 测试项 | 测试内容 | 优先级 |
|--------|----------|--------|
| UT-T01 | `python tools/check_both.py` 两包全绿（含上架版裁剪产物校验） | 高 |
| UT-T02 | `python tools/reader_center_selftest.py --expect-green`（动 Reader 后必跑） | 高 |
| UT-T03 | `python tools/reader_pos_selftest.py` | 中 |
| UT-T04 | 列数断点纯函数用例：宽 500/700/1000/1440vp → 3/4/4/5 列（可仿 shelf_selftest 套路加进 `tools/shelf_selftest/`，含反向对照） | 中 |

**边界条件**:
- [ ] 视口宽恰在断点值（600/900vp）时列数稳定不抖（onAreaChange 抖动 ±1vp 不触发重排）
- [ ] 手机竖屏（≈400vp）与手机横屏均仍 3 列
- [ ] 设置面板 maxHeight 三元式在 viewportHeight=599/600 两侧行为正确

### 2.2 集成测试
| 测试项 | 测试场景 | 涉及模块 |
|--------|----------|----------|
| IT-01 | 平板模拟器开《使用说明》→ 改字号 → 页码/分页重算（onAreaChange→measureBlocks→rebuildPages） | Reader |
| IT-02 | 平板滚动模式开朗读 → 高亮居中、`tts_b.txt` 有 `center|` 行、无回滚（followFloor） | Reader+BookSpeaker |
| IT-03 | 平板导入 EPUB（推《刀剑神域》到 `/storage/media/100/local/files/Docs/Download/`）→ 打开 367 章 | EpubParser |
| IT-04 | 上架版 gallery 包装平板 → 无书源入口、听书面板无音色行/无导出日志/无后台保活行 | 裁剪链 |

### 2.3 回归测试
**回归范围**:
- 核心功能: 书架（手机 3 列）、开书、翻页、滚动、听书、目录、进度保存
- 关联功能: 关于页（支持格式行）、多语言（中英）、导入弹窗、文件夹标签列

### 2.4 场景测试（平板竖版走查清单，FIX-T04 用）
| 场景 | 操作步骤 | 预期结果 |
|------|----------|----------|
| S1 首屏 | 冷启动（桌面图标进，勿从设置返回气泡态拍） | 书架 4~5 列、顶栏两行不叠字 |
| S2 阅读 | 点开《使用说明》→ 左右翻页读 3 页 | 分页字数随宽屏增加、页码连续 |
| S3 滚动听书 | 设置→上下滚动 → 听书→开始朗读 | 高亮居中（截图量像素 40%~60%）、章末贴底停滚 |
| S4 设置面板 | 点屏幕中心→设置 | 面板完整、maxHeight 放宽、A+/A− 生效（dump 字号数值确认） |
| S5 目录/关于 | 目录跳章；书架→关于 | 目录可滚动；关于页字段行齐全 |
| S6 弹窗 | 书架→导入 | 弹窗 ≤560vp 宽、不铺满 |
| S7 英文 | 阅读设置→语言→English → 回 S1/S4 | 不叠字（Shelf/Sources 短标签） |
| S8 手机对照 | 手机模拟器重复 S1/S4 | 与改前逐像素一致 |

---

## 三、验收标准

### 3.1 必须通过
- [ ] 平板模拟器（MatePad Pro 13 竖屏）S1~S6 全过，截图存 scratch 可复查
- [ ] 手机模拟器 S8 与改前一致（书架 3 列、面板高度不变）
- [ ] `check_both.py` 两包 ✅；`reader_center_selftest.py --expect-green` 绿
- [ ] 上架包重签后 `verify-app success` + 签前 PEM 级私钥↔Profile 配对通过
- [ ] 交付文档（AGC md 表 / 归档目录 / git tag）三处 md5 对齐

### 3.2 建议通过
- [ ] S7 英文双语过；UT-T04 断点用例含反向对照
- [ ] 平板截图若替换商店素材，仍满足 9:16、≥720P、3~10 张

### 3.3 验证点清单
| 编号 | 验证点 | 验证方法 | 通过标准 |
|------|--------|----------|----------|
| V-001 | 平板列数 | dumpLayout 数 Grid 首行卡片 bounds x 数 | 4~5 列 |
| V-002 | 手机列数不变 | 同上（手机模拟器） | 恰 3 列 |
| V-003 | 听书居中 | 截图量高亮底色行中心 | 屏高 40%~60% |
| V-004 | 面板高度 | 改前后手机截图面板 bounds 对比 | 完全一致 |
| V-005 | 上架包净化 | 包内靶子串扫描（凌飞哲/Laura/downloadVoice/书源/后台保活/导出运行日志/rdr_124/130/140） | 零命中 |
| V-006 | 签名合法 | verify-app + 解包 profile type=release | success + release |

---

## 四、测试建议

### 4.1 扩展方向
1. **测试数据准备**：《刀剑神域 01.epub》（桌面 纯阅-书源电子书/）、英文 txt 一本（S7 用）；推文件走 `/storage/media/100/local/files/Docs/Download/`。
2. **自动化**：drv.py（技能 scripts/）+ `SERIAL=<平板序列号>` 显式传参可脚本化 S1/S2/S4；列数判定用 dumpLayout 数卡片而非肉眼。
3. **性能**：平板大页（每页字数 +50%）下首屏耗时先量一次基线（精度零不可读时先建基线口径）。
4. **后续立项**：横屏/分栏（系统强制横屏分栏是用户侧行为）、折叠屏断点——本次不做。

### 4.2 注意事项
- ❗平板镜像 HarmonyOS 7.0.0(26.0.0) tablet_x86 约数 GB，FIX-T01 后台下载，勿阻塞等待。
- ❗手机+平板模拟器同开时每条命令显式 `SERIAL=`（技能铁律，防打错设备）。
- ❗`check_both.py` 运行期间绝不 `git commit`（会提进「文件被移走」状态）。
- ❗出包顺序：自用版 hap 先出先归档，再出上架版（会覆盖同一路径）。
- ❗AGC 支持设备发布后只增不减：本次一次勾齐手机+平板。
- ❗调试截图一律落 scratch，不落 `E:\HuaweiReader`。

---

## 五、参考信息

**相关代码文件**:
- `entry/src/main/ets/pages/Index.ets`（:855 列数、:1260-1302 弹窗）
- `entry/src/main/ets/pages/Reader.ets`（:5563 面板限高、:5690/:5807 onAreaChange 链路）
- `entry/src/main/ets/pages/SourcePage.ets`（:2171 弹窗）
- `entry/src/main/module.json5`（:7-10 deviceTypes 已含 tablet，不改）

**相关文档**:
- 修复方案文档: `docs/fix/tablet_portrait/fix-plan.md`
- 平板最佳实践断点: https://developer.huawei.com/consumer/cn/doc/best-practices/bpta-pad-guide
- AGC 支持设备: https://developer.huawei.com/consumer/cn/doc/doccenter-submission/agc-help-release-app-devicetype-0000002271592112
