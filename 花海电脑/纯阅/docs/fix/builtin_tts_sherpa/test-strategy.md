# 验证测试策略初稿

> 关联问题: BUILTIN-TTS（内置离线 TTS：sherpa-onnx + matcha-icefall-zh）
> 生成时间: 2026-10-17
> 文档性质: 初稿（用于后续详细测试文档生成）
> 配套: `fix-plan.md`（同目录）

---

## 一、测试范围

### 1.1 受影响模块

| 模块 | 修改类型 | 测试优先级 |
|------|----------|------------|
| `utils/BuiltinTts.ets` + worker（新增） | 新引擎层 | 高 |
| `utils/BookSpeaker.ets` | 引擎分支接驳（播放链路核心） | 高 |
| `utils/VoiceRule.ets` + `tools/voice_selftest/` | 音色判定扩展 | 高 |
| `pages/Reader.ets`（音色 UI/pickVoice/voiceUsable） | UI + 判定 | 中 |
| `tools/build_gallery_nosource.py` / `check_both.py` | 裁剪与门禁 | 高（上架版红线） |
| 构建链（ohpm har、rawfile 模型、.gitignore） | 工程配置 | 中 |

### 1.2 功能点清单
- [ ] 内置引擎合成中文语音并正常播放（前台/锁屏）
- [ ] 内置音色 ↔ 系统音色（聆小珊）随时切换，切换即生效不需重进书
- [ ] 按书记音色（ttsVoice=100 与 13 各记各的）
- [ ] 语言守卫：英文书内置音色置灰；内置音色听中文书守卫不误换
- [ ] 打断/暂停/切段/跳段/切章无旧句残留、无混段
- [ ] 高亮跟读、段推进、页码在内置引擎下行为与系统引擎一致
- [ ] 上架版包内零内置引擎痕迹（门禁）
- [ ] 自用版包体与分发链路可接受（~150MB）

---

## 二、测试类型

### 2.1 单元测试（离线门禁，Node 跑生产代码套路）

| 测试项 | 测试内容 | 优先级 |
|--------|----------|--------|
| UT-001 | float32[-1,1] → int16 转换（含削顶边界 ±1.0、0、静音） | 高 |
| UT-002 | `bytesToMs()` 双采样率（16000/22050）换算正确 | 高 |
| UT-003 | worker 序号闸：非当前段号 PCM 一律丢弃（防混段，历史预取教训） | 高 |
| UT-004 | 空段（0 样本）跳过逻辑对内置分支同样生效 | 中 |
| UT-005 | `VoiceRule.langOfPerson(100)='zh-CN'`、`resolveVoice` 内置音色解析、英文书守卫换 13 | 高 |
| UT-006 | `voiceUsable()`：内置音色短路安装判定、语言判定仍生效 | 高 |

**边界条件**:
- [ ] 90 字上限长句（SEG_MAX）合成不超时不截断
- [ ] 纯标点/哑巴段（内置引擎 0 样本）不卡推进
- [ ] 语速 speed≠1 时 segDurMs 与实际音频时长一致
- [ ] 采样率参数化后系统引擎路径回归（16000 不变）

**反向对照（每个新门禁必做）**: `git show HEAD:<file>` 旧码跑新用例必须红。

### 2.2 集成测试

| 测试项 | 测试场景 | 涉及模块 |
|--------|----------|----------|
| IT-001 | 选内置音色 → 开始朗读 → 段推进（`selfplay seg done played≈dur`）→ 自动跨章 | BuiltinTts, BookSpeaker |
| IT-002 | 朗读中暂停→继续→跳段→切章，PCM 队列无旧句残留 | BookSpeaker, worker |
| IT-003 | 朗读中切音色（内置→聆小珊→内置），渲染器重建、采样率切换正确 | BookSpeaker |
| IT-004 | 滚动模式跟读居中在内置引擎下与系统引擎表现一致 | Reader, BookSpeaker |
| IT-005 | 两包门禁：`check_both.py` 全绿 + 上架版 needles 零命中 + 自用版命中>0 | tools/ |
| IT-006 | 现有门禁零回归：`reader_center_selftest.py --expect-green`、`reader_pos_selftest.py`、`shelf_selftest` | 全链 |

### 2.3 回归测试
**目标**: 系统 TTS 路径零行为变化。
- 核心功能: 聆小珊朗读（前台/锁屏后台保活 `sp:on audio:live`）、按书记忆、语言守卫、音色下载（凌飞哲/Laura）
- 关联功能: 改字号重居中、章末页码、滚动跟读（本单声称零改动，抽一章对拍即可）

### 2.4 场景测试（真机 HBN-AL00）

| 场景 | 操作步骤 | 预期结果 |
|------|----------|----------|
| 场景1 | 中文书选「纯阅女声·内置」→ 开始朗读 → 锁屏 10 分钟 | 连续播放不断、进度正确（强杀重开 restore pos） |
| 场景2 | 内置朗读中点暂停/拖进度/点下一章 | ≤500ms 止声；无旧句混入 |
| 场景3 | 内置听完退书架 → 开英文书 | 内置音色置灰划线；守卫不自动选内置 |
| 场景4 | 书A记内置、书B记聆小珊，来回开书 | 各记各的，切换即生效不重进 |
| 场景5 | 飞行模式全程 | 内置引擎照常出声（离线是立项动机） |
| 场景6 | 连听 30 分钟 | `hidumper --mem` RSS 稳定不持续上涨；无 Freeze 日志 |

---

## 三、验收标准

### 3.1 必须通过
- [ ] FIX-000 取证达标（RTF≤0.5、RSS≤400MB、打断≤500ms）才允许进 FIX-001
- [ ] 新增 UT 全绿 + 反向对照报红（有牙）
- [ ] `check_both.py` 两包全绿；上架版包内 `sherpa/matcha/vocos/纯阅女声` 零命中
- [ ] 场景1~5 真机全过（要日志/截图数字，不接受「看起来好了」）
- [ ] 系统 TTS 回归零失败；装机 hap 与门禁 hap 同 md5
- [ ] 模型/har 未进 git（`git status` 干净 + `git log --stat` 无大文件）

### 3.2 建议通过
- [ ] 场景6 长跑 30 分钟无内存缓涨
- [ ] 150MB hap 飞书直发成功（失败则 .app 交付并记录）
- [ ] 内置引擎段界空隙听感不劣于系统引擎（`selfplay seg done` 时间戳对照）

### 3.3 验证点清单

| 编号 | 验证点 | 验证方法 | 通过标准 |
|------|--------|----------|----------|
| V-001 | 引擎真的在自播 | 听书面板自检行 | `sp:on audio:live` 且无 `fallback` |
| V-002 | 段推进按真实时长 | 日志 `selfplay seg done played≈dur` | 误差 <150ms |
| V-003 | 无混段 | 打断后听感 + 序号闸日志 | 零旧句片段 |
| V-004 | 上架版净化 | `check_both.py` verify() | needles「一个都没命中」 |
| V-005 | 装机版本 | `bm dump -n com.longxia.huaweireader` updateTime | 等于装机时刻 |
| V-006 | 离线可用 | 飞行模式场景5 | 正常出声 |

---

## 四、测试建议

### 4.1 扩展方向
1. **测试数据**: 固定语料三件套——中文小说段（剑来抽 90 字段）、英文段（Pride and Prejudice 样本）、混排段（中文夹英文人名）；模型文件 sha256 清单入取证单。
2. **自动化**: UT-001~006 全部离线门禁化（Node 跑生产 .ets 套路）；IT-005/006 挂 check_both 收口。
3. **性能基准**: FIX-000 的 RTF/RSS 数字作为基线表，后续换模型/升 har 版本对拍（防 #3759 类回归）。
4. **多机型**: 用户另有 nova14 Pro（Mate 70 曾测深色模式）——低内存机型 RSS 值得补测。

### 4.2 注意事项
- ❗真机驱动铁律：先查 UU远程占用、屏幕常亮设好、动作合并成一条命令、SERIAL 每条显式写。
- ❗跑 `check_both.py` 期间绝不 git commit（历史坑）。
- ❗一次派单只放一个交付物；构建/装机独占串行。
- ❗计时模型不许叠补偿（历史整体回退教训）；测试判据优先读应用诊断日志，别解析 UI 文本。
- baker 模型许可：测试与自用分发 OK，**任何上架/商用分发前许可问题必须已闭环**。

---

## 五、参考信息

**相关代码文件**:
- `entry/src/main/ets/utils/BookSpeaker.ets`（接驳核心；行号见 fix-plan §1.3）
- `entry/src/main/ets/utils/VoiceRule.ets`、`entry/src/main/ets/pages/Reader.ets`
- `tools/build_gallery_nosource.py`、`tools/check_both.py`、`tools/voice_selftest/`

**相关文档**:
- 修复方案: `docs/fix/builtin_tts_sherpa/fix-plan.md`（本目录）
- 取证单（FIX-000 产出）: `docs/fix/builtin_tts_sherpa/FIX-000-取证单.md`
- 口径库: `03-纯阅关键约定与踩坑.md` §I.6/§I.8；`04-纯阅待办与验收.md`（已登记承诺）
