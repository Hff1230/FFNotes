# 修复方案文档：内置离线 TTS 引擎（sherpa-onnx + matcha-icefall-zh）

> 文档生成时间: 2026-10-17
> 关联需求: 用户指令「开始内置音色包（sherpa-onnx + matcha-icefall-zh）开发，发布版和自用版支持随意切换」
> 性质: 🔵 功能立项（非 Bug 修复）
> 现状摸底与技术调研均已完成（2026-10-17，两个只读子Agent），本文所有符号/行号已核实。

---

## 一、问题诊断（现状与差距）

### 1.1 概述

| 属性 | 内容 |
|------|------|
| 问题ID | BUILTIN-TTS |
| 影响级别 | P1（功能立项） |
| 问题状态 | FIX-000 取证达标 + FIX-001 引擎层已落地（2026-10-18，`c032f42`）；FIX-002 接驳待做 |
| 影响模块 | BookSpeaker / Reader 音色体系 / 构建裁剪链 / 包体 |

### 1.2 需求描述
当前听书完全依赖系统 TTS（Core Speech Kit）：中文只有聆小珊出厂即装，其余音色首用必弹系统下载框；无中英混读音色；行为不可控（引擎上报 sr/ch 不可信、下载点取消照样 resolve）。用户拍板内置 sherpa-onnx + matcha-icefall-zh 离线引擎，且**内置音色与系统音色可随意切换**。

### 1.3 现状核实（已验证，非假设）

**工程侧（E:\HuaweiReader，全部 grep/读码核实）**：
- 自播 PCM 链路完整且与引擎无关：`BookSpeaker.ets` `playType:0` 取流（`:752`）→ `onPcm()`（`:881`）→ `pump()` 串行 `renderer.write()`（`:904-938`）→ `onTick()` 按音频真实时长推进（`:995`，判据 `played+120>=segDurMs`）。**内置引擎只需替换「文本→PCM」这一段**，段推进/高亮/空段跳过（`:324-330`）/后台保活（`isAudioLive()` `:227`）全部复用。
- 渲染器现固定 16000Hz/S16LE/单声道（`:850-853`）；`calibrateSeg()`（`:806-828`）为系统引擎「上报不可信」而设 —— 内置引擎输出确定性参数，**可绕过标定**。
- 音色体系：`VOICES`（`BookSpeaker.ets:68-72`，在 `@@VOICE-DL@@` 块内，13 聆小珊/21 凌飞哲/8 Laura）；`pickVoice`（`Reader.ets:3246`）、`voiceUsable`（`:3164`）、按书记忆 `books.ttsVoice`（`DBHelper.ets:106`，`-1`=未设）、语言守卫唯一真源 `utils/VoiceRule.ets`（纯函数，有门禁 `tools/voice_selftest/`）。
- **native 零落地**：无 cpp/、无 CMakeLists、无 .so、无 externalNativeOptions；`git log -S sherpa/onnx/matcha` 全空 —— 全新立项。
- rawfile 无大文件先例（仅 20 个 txt）；当前自用版 hap **1.27MB**。
- 上架版净化链成熟：`@@VOICE-DL@@`/`@@BOOKSOURCE@@`/`@@DIAG@@` 成对标记 + `tools/build_gallery_nosource.py` 物理裁除 + `tools/check_both.py` 两包门禁（含包内 needles 校验）。

**技术侧（已核来源）**：
- sherpa-onnx **官方支持 HarmonyOS**：OHPM 包 `sherpa_onnx`（`ohpm install sherpa_onnx`，har 28.6MB 含 arm64+x86_64）、官方 TTS 教程与示例工程 `harmony-os/SherpaOnnxTts`（worker 线程推理）、C API 有 OHOS 专用变体 `SherpaOnnxCreateOfflineTtsOHOS(config, NativeResourceManager*)` 直接吃 rawfile。
- 模型 `matcha-icefall-zh-baker`：22050Hz 单说话人女声，模型 75.6MB + 声码器 vocos-22khz-univ.onnx 53.9MB ≈ **解压后 126MB**；中文前端用 lexicon.txt+fst，**不需要** espeak-ng-data/jieba dict。
- 输出为 **float32 [-1,1] 单声道 22050Hz**（非 int16/16k）→ 需转 int16 + 采样率适配。
- RTF（树莓派4B，4线程）0.391；手机 CPU 更快，**估计 0.1~0.3，待真机实测**（证据等级：外推假设）。
- 内存：无鸿蒙实测公开数字，按 ORT arena 规律估 250~350MB（证据等级：**待验假设**，FIX-000 必测）。
- 鸿蒙先例成熟：OpenHarmony AI Model SIG 官方 AsrAndTts 样例、lavalphone_tts_demo（OH 4.1/5.0 真机跑通）。

> 📚 **技术来源**:
> - [sherpa-onnx HarmonyOS TTS 官方教程](https://k2-fsa.github.io/sherpa/onnx/harmony-os/tts.html)
> - [OHPM sherpa_onnx 包](https://ohpm.openharmony.cn/#/cn/detail/sherpa_onnx) / [har 构建文档](https://k2-fsa.github.io/sherpa/onnx/harmony-os/how-to-build-har.html)
> - [官方 OHOS TTS 示例](https://github.com/k2-fsa/sherpa-onnx/tree/master/harmony-os) / [NonStreamingTtsWorker.ets](https://github.com/k2-fsa/sherpa-onnx/blob/master/harmony-os/SherpaOnnxTts/entry/src/main/ets/workers/NonStreamingTtsWorker.ets)
> - [matcha-icefall-zh-baker 模型页（含许可声明）](https://huggingface.co/csukuangfj/matcha-icefall-zh-baker) / [模型文档](https://k2-fsa.github.io/sherpa/onnx/tts/all/Chinese/matcha-icefall-zh-baker.html)
> - [官方 RTF 表](https://github.com/k2-fsa/sherpa/blob/master/docs/source/onnx/tts/pretrained_models/rtf.rst)
> - [HAP 包大小上限（手机/平板 4GB）](https://forums.developer.huawei.com/forumPortal/en/topic/0205201191526461058)
> - [OpenHarmony AI Model SIG 样例](https://gitcode.com/openharmony-sig/applications_ai_model_samples) / [lavalphone_tts_demo](https://gitee.com/MIKECODE/lavalphone_tts_demo)
> - [ORT 内存 arena 讨论 #3032](https://github.com/k2-fsa/sherpa-onnx/issues/3032) / [HAR 内 ORT 版本滞后 #3759](https://github.com/k2-fsa/sherpa-onnx/issues/3759)

### 1.4 关键冲突与口径（必须先拍板）

**① 许可红线（最高优先级）**：baker 数据集明示 **non-commercial**（[模型卡](https://huggingface.co/csukuangfj/matcha-icefall-zh-baker)、[数据源](https://en.data-baker.com/datasets/freeDatasets/)）。纯阅上架版是商用分发 ⇒ **上架版不得携带 baker 模型**。
- **推荐口径**：引擎切换**代码**两版共享（内置音色在自用版可选、可切回系统音色）；**模型与 har 只进自用版**，上架版维持聆小珊单音色（现有 `@@VOICE-DL@@` 口径不变）。
- 若用户坚持上架版也带内置音色：先解决许可（向标贝购买商用授权，或换许可干净模型——aishell3 商用条款**未找到公开证据**，不许默认能用）。这是独立前置任务，不阻塞自用版。
- ❗**「sherpa-onnx Apache 2.0 ⇒ 商用链条完整」是常见误读（2026-10-17 外部建议核查后钉死）**：Apache 2.0 只覆盖**引擎代码**，不覆盖模型权重与训练数据。逐模型核查：
  - `Kokoro-82M`（英文）：权重确为 Apache-2.0（[模型卡](https://huggingface.co/hexgrad/kokoro-82m)），但**官方 language=en，不含中文**；
  - `kokoro-multi-lang-v1_0`（中英 53 音色）：ONNX 导出自 taylorchu/kokoro-onnx（MIT，仅导出脚本），**中文音色的训练数据出处官方模型卡未声明**——商用链条**未验证**，不许当「已解决」用；
  - 结论：目前**没有任何一个中文开源音色有公开可查的商用许可证据**。上架版内置音色的三条真路：① 买标贝商用授权；② 委托录制/自采语料训练（独立立项）；③ 上架版维持系统聆小珊（推荐，零许可风险）。

**② 包体与仓库卫生**：自用版 hap 1.27MB → 约 150MB（har 单 ABI 估 10~15MB + 模型 126MB）。远低于 HAP 4GB 上限，但：
- ❗模型文件与 har **不入 git**（本仓曾 filter-repo 清大文件）：`rawfile/models/`、`*.har` 进 `.gitignore`，模型由 `tools/fetch_tts_model.py` 按校验和下载/从本地归档目录复制，构建前就位。
- 飞书分发 150MB hap 需实测能否发（不行则发 .app 或分卷，交付流程调整，见 FIX-005）。

**③ 「随意切换」的落地语义**：音色面板新增内置音色条目（与聆小珊并列），选中即走内置引擎、选系统音色即走原链路；**按书记忆沿用 `books.ttsVoice` 扩展编码**（见 2.3），语言守卫规则扩展：内置音色=中文单音色 ⇒ 英文书置灰（复用 `voiceUsable` 语言判定，短路掉「已安装」判定——内置永远已安装）。

### 1.5 复现/验证路径
不适用（新功能）。验收见 `test-strategy.md`。

---

## 二、修复（实施）方案

### 2.1 方案对比

| 维度 | 方案A：官方 OHPM har + rawfile 模型（推荐） | 方案B：自编 sherpa-onnx OHOS har | 方案C：系统 TTS 维持现状 |
|------|------|------|------|
| 描述 | `ohpm install sherpa_onnx`，模型放 rawfile，照官方 worker 示例接驳 | Command Line Tools NDK 交叉编译 onnxruntime+sherpa | 不做 |
| 优点 | 零 native 编译经验要求；官方维护；2~4 人日 | 可裁 .so 体积、可控 ORT 版本 | 零成本 |
| 缺点 | har 含双 ABI（可事后剥 x86_64）；ORT 版本滞后（#3759，matcha 不受影响） | +3~5 人日，工具链坑多 | 无离线多音色，用户诉求不满足 |
| 风险 | 低 | 中 | — |
| 工作量 | 2~4 人日 | +3~5 人日 | 0 |

**推荐：方案A**。自编仅在「单 ABI 剥离后体积仍不可接受」时再立项。

### 2.2 技术实现要点

1. **引擎层**：新建 `entry/src/main/ets/utils/BuiltinTts.ets` + worker（仿官方 `NonStreamingTtsWorker.ets`）：`SherpaOnnxCreateOfflineTtsOHOS` 从 rawfile 加载 matcha+vocos；`generate(text, sid, speed)` → Float32Array。合成在 worker 线程，主线程只收 PCM。
2. **接驳层**：`BookSpeaker` 增加引擎维度（`engine: 'system' | 'builtin'`）：
   - 内置路径：段文本 → worker 合成 → float32→int16 转换 → 现有 `pcmPending`/`pump()` 队列（**不新建播放器**）；
   - 渲染器采样率参数化：内置=22050、系统=16000（`buildRendererRaw()` 收 sampleRate 入参，`bytesToMs()` 同步用它）；内置引擎 `calib=true, calibCh=1` 直接置位，**不进 `calibrateSeg()`**；
   - 打断：worker 内 `cancelled` 标志 + 丢弃在途 PCM（取消语义真机实测，见 FIX-000）；`pause()/release()` 同步通知 worker。
3. **音色层**：`VOICES` 增内置条目（合成 person 号 `100 = 纯阅女声·内置`，不占系统 person 空间）；`VoiceRule.ets` 扩展 `langOfPerson(100)='zh-CN'`、`voiceUsable` 对内置短路安装判定；`books.ttsVoice=100` 即按书记住内置音色——**DB 零迁移**（INTEGER 列直接存）。
4. **裁剪层**：新成对标记 `@@BUILTIN-TTS@@`（夹住：内置 VOICES 条目、BuiltinTts 引用点、BookSpeaker 内置分支）；`build_gallery_nosource.py` 增：裁 rawfile models 目录、移除 har 依赖行、verify() needles 加 `sherpa`/`matcha`/`纯阅女声`；`check_both.py` 两包门禁全绿才算过。
5. **红线遵守**：段推进计时模型**不加任何补偿**（历史教训：叠补偿→高亮抢跑→整体回退）；内置引擎输出时长确定（样本数/采样率），比系统引擎更准，直接 `segDurMs = samples/sampleRate*1000`。

### 2.3 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| baker 许可被带进上架版 | **高** | 门禁 needles 硬拦（模型文件名+sherpa 零命中）；FIX-004 反向对照 |
| 真机 RTF/内存不达标（估 250~350MB RSS） | 中 | FIX-000 先量再改；不达标则换 vits-icefall-zh-aishell3（30MB/RTF 0.156，音质降级）或放弃 |
| 150MB hap 构建/分发链路（hvigor、飞书、GitHub） | 中 | 模型不进 git；FIX-005 实测飞书发送；必要时 .app 交付 |
| 打断/切段时在途 PCM 混入旧句（历史踩过预取混段） | 中 | 单请求模型不变（一次一句、无预取）；worker 序号闸：非当前段号 PCM 一律丢 |
| 上架版被 native 配置拖挂（externalNativeOptions 是共享文件） | 中 | har 走 ohpm 依赖按标记裁剪；若 build-profile 必须动，纳入还原对拍 |
| 回滚 | — | 引擎选择默认值=system；内置链路整体在 `@@BUILTIN-TTS@@` 内，出问题改一个默认值即回旧行为 |

**回滚方案**：代码层 = revert BuiltinTts 相关提交（模型不在 git，revert 干净）；行为层 = 全局默认音色保持 13，不选内置即零影响。

---

## 三、Agent 任务拆分

### 3.1 批次规划（并发≤2；构建/装机为独占资源，一次派单只放一个交付物）

**Batch 0 — 取证（先量再改，无前置）**

| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-000 | 真机基准取证：官方示例 + matcha 在 HBN-AL00 实测 | 无 | 低（纯 spike） |

**Batch 1 — 引擎接入（串行，同文件区）**

| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-001 | har 依赖 + BuiltinTts worker + rawfile 模型加载 + gitignore | FIX-000 通过 | 中 |
| FIX-002 | BookSpeaker 引擎分支接驳（PCM/采样率/打断/计时） | FIX-001 | 高（动播放链路核心） |

**Batch 2 — 音色与裁剪（并行 2 个）**

| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-003 | 音色体系：VOICES/VoiceRule/voiceUsable/按书记忆 + voice_selftest 扩展 | FIX-002 | 中 |
| FIX-004 | 裁剪与门禁：@@BUILTIN-TTS@@ 标记 + build_gallery_nosource + check_both needles | FIX-002 | 中 |

**Batch 3 — 交付**

| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-005 | release 出包 + 真机验收 + 飞书交付 + 文档回写 | FIX-003, FIX-004 | 中 |

### 3.2 依赖关系图
```
FIX-000 (真机基准, 取证单)
   ↓ 达标才继续（不达标→换模型重开 000）
FIX-001 (引擎层) → FIX-002 (接驳层)
                     ├→ FIX-003 (音色)  ┐ 并行
                     └→ FIX-004 (裁剪)  ┘
                          ↓
                       FIX-005 (出包验收交付)
```

### 3.3 Agent 任务卡

#### FIX-000 真机基准取证（spike，不改主工程）✅ 已完成 2026-10-18
- **结果**：RTF≈0.10（4线程，90字<2s）/ PSS 328MB / 取消回调 125ms ⇒ **达标放行**。两条新口径：① `callback` 返回 0 **不能中止** `generateAsync`（300字取消后仍全量生成）⇒ 打断只能靠**序号闸丢在途 PCM**，FIX-002 必守；② `new OfflineTts(config, resourceManager)` **直吃 rawfile**（含 ruleFsts），免拷沙箱。详见 `FIX-000-取证单.md`。
- **级别**: 取证 | **影响模块**: 无（独立 spike 工程或官方示例） | **风险**: 低
- **目标**: 把「RTF/内存/打断」三个**待验假设**变成实测数字，产出 `FIX-000-取证单.md`（本目录）。
- **步骤**: ① 拉官方 `SherpaOnnxTts` 示例或最小 spike 工程，`ohpm install sherpa_onnx`；② 下载 matcha-icefall-zh-baker + vocos（校验 sha256，存本地归档目录如 `E:\HuaweiReader\tts_models\`，不进 git）；③ HBN-AL00 真机（无线调试 192.168.3.188:5555，先查 UU远程占用、屏幕常亮 `power-shell setmode 602`）测：10/30/90 字句合成耗时（RTF）、`hidumper --mem` RSS、合成中打断响应时延、worker 取消语义；④ 对照口径：段合成耗时须显著小于段朗读时长（否则段界必卡）。
- **通过判据**: RTF ≤ 0.5 且 RSS ≤ 400MB 且打断 ≤ 500ms ⇒ 继续；否则带数字回来重开选型。
- **输出**: 取证单（数字表 + 结论 + 模型文件 sha256 清单）。**不许改 E:\HuaweiReader 主工程。**

#### FIX-001 引擎层接入 ✅ 已完成 2026-10-18（提交 c032f42）
- **落地**：`utils/BuiltinTts.ets`（门面：init/synthesize/cancel/release，**epoch 序号闸**丢在途 PCM）+ `workers/BuiltinTtsWorker.ets`（matcha 4 线程、rawfile 直吃、float32→int16 削顶）；依赖 `sherpa_onnx@1.13.3` 在 `@@BUILTIN-TTS@@` 标记内；`tools/fetch_tts_model.py` 按 sha256 就位模型（rawfile/models/，不进 git）。
- **FIX-004 一并提前落地**：build_gallery_nosource.py 裁标记段+移引擎文件+移 rawfile/models；needles 加 sherpa/matcha-icefall/vocos/BuiltinTts/纯阅女声。
- **验收**：`tools/builtin_tts_selftest.py` UT-B01~B06 全绿 + 反向对照红；`check_both` 两包绿（自用版 166MB 含模型；上架版包内 so/模型/字样零命中）；反向对照（依赖行挪出标记）门禁红 ✓。

#### FIX-001 引擎层接入（原任务卡）
- **依赖**: FIX-000 | **风险**: 中 | **影响模块**: oh-package.json5、新 BuiltinTts.ets、rawfile、.gitignore
- **输入**: FIX-000 取证单（含模型路径与 sha256）；官方 worker 示例。
- **步骤**: ① `ohpm install sherpa_onnx`；② 新建 `utils/BuiltinTts.ets` + worker（合成/取消/序号闸），接口形状：`init()` / `synthesize(text, seq): Promise<{pcmInt16, sampleRate, samples}>` / `cancel()`；③ 模型放 `rawfile/models/`（构建前由脚本从归档复制，写 `tools/fetch_tts_model.py` 带 sha256 校验）；④ `.gitignore` 加 `rawfile/models/`、`*.har`、`oh_modules/`；⑤ 编译通过 + 一个「合成一句话返回 PCM 长度>0」的最小自测（可离线 Node 测纯函数部分，native 部分留给 FIX-005 真机）。
- **输出**: 上述文件 + 构建成功日志。**不动 BookSpeaker/Reader。**

#### FIX-002 BookSpeaker 接驳（核心，动播放链路）
- **依赖**: FIX-001 | **风险**: 高 | **影响模块**: `utils/BookSpeaker.ets`（共享文件，触点全部落 `@@BUILTIN-TTS@@` 标记内）
- **步骤**: ① `engine` 状态（由当前 person==100 推导）；② `speakCurrent()` 内置分支：送 worker、PCM 入 `pcmPending`（**连续喂，不清队列**——历史铁律）；③ 渲染器采样率参数化（22050/16000），`bytesToMs()` 用实际采样率；④ 内置引擎 `calib=true, calibCh=1`，跳过 `calibrateSeg()`；⑤ `segDurMs = samples/sampleRate*1000`，计时模型其余**一字不动**；⑥ `pause()/release()/jumpTo()/setChapter()` 联动 worker cancel + 清在途；⑦ 空段（0 样本）跳过逻辑对内置同样生效。
- **验证**: 现有门禁全绿（`reader_center_selftest.py`、`reader_pos_selftest.py` 等不受影响）；新增离线用例：float32→int16 转换、bytesToMs 双采样率、序号闸丢旧段（仿 `tools/voice_selftest` 套路 + **反向对照**）。
- **红线**: 不加预取、不加缓冲补偿、不动跟读目标算术（`Reader.ets` 本单**零改动**）。

#### FIX-003 音色体系与 UI
- **依赖**: FIX-002 | **风险**: 中 | **影响模块**: `BookSpeaker.ets:68` VOICES（VOICE-DL 块内）、`VoiceRule.ets`、`Reader.ets` pickVoice/voiceUsable/音色行、`tools/voice_selftest/`
- **步骤**: ① VOICES 加 `{person:100, name:'纯阅女声·内置', needDownload:false}`（自用版表内；ALT 单音色表**不加**——上架版连内置条目也裁掉，走 `@@BUILTIN-TTS@@`）；② `VoiceRule.langOfPerson(100)='zh-CN'`、`resolveVoice` 认识 100；③ `voiceUsable()`：内置音色短路安装判定、语言判定照旧（英文书置灰）；④ 按书记忆零迁移（ttsVoice=100）；语言守卫：内置音色在中文书合法、英文书走既有 defaultPersonFor 守卫（换 8，与系统音色同路，2026-10-18 复核：守卫从无换 13 路径）；⑤ 文案 `rdr_1xx`「内置音色」等 **10 语言 + base 同步**；⑥ voice_selftest 扩展用例 + 反向对照（旧 VoiceRule 跑新用例必须红）。
- **验证**: voice_selftest 行为+结构全绿；模拟器截图中文书可选内置、英文书置灰。

#### FIX-004 裁剪与门禁
- **依赖**: FIX-002（与 FIX-003 并行，文件不重叠：本单动 tools/ 与标记边界，003 动音色逻辑——**标记边界以 FIX-002 落地的为准，开工前先看 002 的 diff**）
- **步骤**: ① 确认 `@@BUILTIN-TTS@@` 覆盖全部内置触点（标记块外零引用——历史坑）；② `build_gallery_nosource.py`：裁 rawfile models、移除 ohpm 依赖行、ALT 表逻辑兼容；③ `check_both.py` needles 加 `sherpa`/`matcha-icefall`/`vocos`/`纯阅女声`；④ 两包门禁全绿 + 上架版包内 needles **零命中** + 自用版命中>0（双向校验）；⑤ ❗跑 check_both 期间绝不 git commit（历史坑）。
- **验证**: `python tools/check_both.py` 全绿；反向对照：故意把内置条目移出标记 ⇒ 门禁必须红。

#### FIX-005 出包与真机验收交付
- **依赖**: FIX-003+004 | **风险**: 中 | **独占**: 构建/装机/飞书
- **步骤**: ① 自用版 release `assembleHap`+`assembleApp`（先出先归档先记 md5——出包顺序铁律）；② 真机 `install -r -d`（HBN-AL00）+ 重启；③ 实测：中文书选内置→朗读（前台/锁屏 10 分钟，看后台保活自检行 `sp:on audio:live`）、切回聆小珊、按书切换记忆、英文书置灰、打断响应；④ 150MB hap 飞书私聊实发 + 读回对 md5；⑤ 归档 `release/1.0.0/自用版-带书源/`（旧包 .bak）+ 交付文档 md5 三处对齐 + 04 待办划账 + 03 新增内置音色小节。
- **验证**: 见 test-strategy.md 场景测试全过。

---

## 四、实施计划

| 阶段 | 任务 | 产出 | 预估 |
|------|------|------|------|
| 阶段0 | FIX-000 | 取证单（RTF/RSS/打断实测数字） | 0.5~1 天 |
| 阶段1 | FIX-001 → FIX-002 | 引擎层 + 接驳层 + 离线门禁 | 1~2 天 |
| 阶段2 | FIX-003 ∥ FIX-004 | 音色 UI + 两包门禁全绿 | 1 天 |
| 阶段3 | FIX-005 | release 包 + 真机验收 + 交付 | 0.5~1 天 |

**发布计划**：自用版先行直装手机（用户日常用）；上架版行为零变化（门禁保证），随下一次正常送审节奏走，不单独送审。版本号仍 1.0.0/1000000 恒定。

**遗留决策点（已拍板 2026-10-17）**：上架版**不带**内置音色，维持系统聆小珊（用户选 3）；内置音色仅自用版。若日后要上内置音色，先解决许可（买标贝授权 / 自采语料），单独立项。
