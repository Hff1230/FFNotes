# 修复方案文档 — 听书多音字预处理（通用词库 + 入库预匹配版）

> 文档生成时间: 2026-10-18（同日按用户口径**原地改写**：不按书定制、不向用户要例词，改「通用常用多音字词库 + 入库一次性预匹配 + 命中结果落书籍数据，听书直接取用」）
> 关联问题ID: FEAT-POLYPHONE
> 文档性质: **方案文档（未实施）**。按交付边界铁律，本文档只规划，不改码；任何改码须用户看完本文档后另行拍板（如「按方案修吧」）。
> 类型: 🔵 功能优化（听书发音质量）

---

## 一、问题诊断

### 1.1 问题概述

| 属性 | 内容 |
|------|------|
| 问题ID | FEAT-POLYPHONE |
| 发现时间 | 2026-10-18（用户提出「听书的多音字预处理方案」） |
| 影响级别 | P2（发音质量，不阻塞阅读/听书主链路） |
| 问题状态 | 待取证 → 待拍板 |
| 影响模块 | 听书 TTS 链路（BookSpeaker / BuiltinTts）+ 入库链路（新增一次性扫描）+ 书籍数据（新增 sidecar），**不影响**显示文本、高亮、进度 |

### 1.2 问题描述（含用户定案口径）

中文多音字（重/行/长/着/得/还/乐/朝/单/仇/区…）在听书朗读中读错音。词典外组合退化为单字默认音。两条引擎路径都可能中招：

- **系统 TTS**（聆小珊 person 13 等）：引擎前端闭源，多音字词典规模与规则**未找到公开证据**；
- **内置离线引擎**（person 100，sherpa-onnx + matcha-icefall-zh-baker）：前端 = 模型自带 `lexicon.txt`（训练期由 pypinyin 单字库 41,923 条 + 词组库 47,111 条生成）+ 推理期**词组最长匹配**（≤10 字），词典外组合逐字取默认音。

**用户口径（2026-10-18 定案，别再重开）**：
1. **不按书定制**——归纳一份通用常用多音字词库随 App 内置；不管什么书，内容匹配上就生效；
2. **匹配时机 = 加载书进书架时一次性做**，命中结果**保存到应用存储的书籍数据里**；听书时直接取用，播放路径不做实时匹配。

### 1.3 根因分析

**直接原因**（代码事实，已核实）：全链路不存在任何发音预处理层——

- `BookSpeaker.setChapter(text)`（`BookSpeaker.ets:1021`）收到正文后直接 `split()`（`:1029`），中间零清洗零归一化；
- `split()`（`:850-907`）只做断句（SEG_MAX=90 / 引号内 120 / trim），段文本原样；
- 送引擎三点全部原样直送：系统引擎 `eng.speak(seg.text, …)`（`:1344`）、预取 `eng.speak(seg.text, …)`（`:1413`）、内置 `BuiltinTts.get().synthesize(seg.text, sp)`（`:791`）；
- 内置 worker 同样原样透传（`BuiltinTtsWorker.ets:83-87`），唯一"前端"是模型自带 `lexicon.txt + tokens.txt + date/phone/number.fst`（`BuiltinTtsWorker.ets:32-38`）；
- 上游文本侧：`Reader.curText` 是纯 substring 截取（`Reader.ets:2378`/`sliceGlobal:2325`），`BookLoader` 仅有 `TextUtil.normalize`（`TextUtil.ets:209-216`，删控制字符/换行归一），与发音无关；
- 全仓 grep：`多音字`/`pinyin`/`phoneme`/`SSML` **零命中**（`拼音` 2 处均与 TTS 无关）。

**深层原因**：

1. 两条引擎都**没有 SSML 通道**（华为 API 参考全文无 SSML；sherpa `OfflineTtsFrontend` 只收自然文本）——发音纠偏只能走各引擎自己的窄通道，App 层不做就没人做；
2. 引擎词典是静态的，书中专有名词/生僻搭配无人补录 ⇒ 需要一条**随 App 维护、对全书通用**的纠音通道。

**影响范围**：
- 受影响模块：送引擎的那一份文本（仅朗读音频）+ 入库链路新增一次性扫描 + 书籍数据新增 sidecar；
- 不受影响：显示正文（红线：**本地书原文一个字节不改**，SHA256 不变）、`SpeechSeg.start/end` 偏移、高亮跟读、进度落库；
- 相关文档：`docs/fix/builtin_tts_sherpa/fix-plan.md:36` 只确认过前端组成，**没有任何多音字结论先写过**（全目录 grep 零命中）。

### 1.4 复现步骤

1. 任选含常见多音词的书（或自造样章：银行/重量/重复/音乐/着…），系统音色与内置音色各听一段；
2. 记录错读词、错读音、应读音；
3. 频率定性：偶发（专有名词）还是高频（常见词）。

（不再向用户要「按书例词」——用户已定案走通用词库；取证用自造样章即可。）

### 1.5 相关信息 — 引擎侧已核实事实

> 📚 **技术来源**（子Agent逐条抓取核实，非记忆）:
> - [华为 textToSpeech API 参考](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/hms-ai-texttospeech)：`SpeakParams.extraParams` 全字段表 = speed/volume/pitch/languageContext/audioType/playType/soundChannel/queueMode，**无 SSML/音素/拼音字段**；`CreateEngineParams.extraParams` 仅 style/locate/name/isBackStage。
> - [华为播报策略指南](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/texttospeech-guide)：支持**文本内嵌标记**四种：`[hN]` 字母/单词播报、`[nN]` 数字策略、`[pN]` 静音停顿、**`[=MN]` 指定汉字发音（M=拼音、N=声调1~5）**，官方示例 `'着[=zhuo2]手'` → 着读 zhuó。**这是华为引擎唯一的发音自定义接口，逐字作用。**
> - [sherpa-onnx matcha-tts-lexicon.cc](https://github.com/k2-fsa/sherpa-onnx/blob/master/sherpa-onnx/csrc/matcha-tts-lexicon.cc) + [phrase-matcher.cc](https://github.com/k2-fsa/sherpa-onnx/blob/master/sherpa-onnx/csrc/phrase-matcher.cc)：现行中文前端 = 标点归一 → 逐字切分 → **PhraseMatcher 对 lexicon.txt 词集最长匹配（max_search_len=10）**，命中词查词级拼音，未命中逐字默认音。**纯词典式，无词性/上下文规则引擎。**
> - sherpa-onnx jieba 移除史：PR #2662/#2664（2025-10）已从 master 移除 cppjieba；本机 har 为 **1.13.3**（`entry/oh-package.json5:10`），其前端行为**属 FIX-000 待验项**（见 §2.2 H2）。
> - [sherpa-onnx OfflineTtsConfig 文档](https://k2-fsa.github.io/sherpa/onnx/tts/all/Chinese/matcha-icefall-zh-baker.html)：`lexicon` 参数**支持逗号分隔多词典文件**、重复词取先入者 ⇒ 追加自定义词典是官方支持路线；`rule_fsts` 是数字/日期 TN，非发音接口。
> - sherpa TTS **无音素直喂接口**；`HomophoneReplacer(hr)` 只挂 ASR，TTS 配置无 hr 字段（C++/Python 头文件均核实）——别照 ASR 文档给 TTS 配 hr。
> - [icefall baker 词典生成脚本](https://github.com/k2-fsa/icefall/commit/bfffda5afb74b193068078c9b51db380ec005afe)：lexicon.txt 由 pypinyin `pinyin_dict + phrases_dict + tone_sandhi=True` 生成，且官方自己就硬编码 `load_phrases_dict({"行长":…, "银行行长":…})` 补上下文词——**印证「通用词组白名单」就是业界正解**。
> - [pypinyin](https://github.com/mozillazg/python-pinyin)：单字库 41,923 条、词组库 47,111 条，**MIT**，纯 JSON/txt，可移植；pinyin4j（BSD）无词组消歧库；TinyPinyin（Apache-2.0）无声调、靠自定义词典。
> - baker 模型 **non-commercial** ⇒ 内置引擎词典扩展只影响自用版（与既有口径一致）。

---

## 二、修复方案

### 2.1 方案（用户定案形态）

**通用多音字词库 + 入库一次性预匹配 + 命中表落书籍数据，播放期零匹配。**

```
App 内置通用词库 polyphone.json（常用多音字词组 → 目标读音，随版本维护）
        │
入库时（一次性，后台）：
  抓取书 = 提纯落盘、建条目之后扫描；本地书 = 进书架/首次打开时扫描
  全文跑词库最长匹配 ⇒ 命中表 [{off, word, pin, tone}]
  存 sidecar：<书>.poly.json（书籍数据目录，原文零改动）
        │
听书时（零匹配、零延迟）：
  系统音色：setChapter 后按段区间 [seg.start, seg.end) 从命中表取词，
            在 seg.text 副本上插官方 [=pin4] 标记 → eng.speak
  内置音色：引擎自带 lexicon 已含同源 pypinyin 词库；
            另追加全局自定义词典（与 polyphone.json 同源生成）→ 引擎原生生效
```

要点：
- **词库通用**：不分书、不询问用户例词；命中表带 `dictVersion`，开书时发现词库版本落后就后台重扫（懒更新，不阻塞打开）；
- **一次性**：匹配只发生在入库/后台扫描；播放路径只做「按偏移取命中 + 插标记」，每段 O(段内命中数)，无词库扫描；
- **原文零改动**：命中表是 sidecar（对齐既有铁律「本地书原文一个字节不改，只做 sidecar/显示层」），正文与 `.raw` 均不动，SHA256 不变；
- **进度零影响**：命中表偏移基于同一份 `text`，`SpeechSeg.start/end`、进度锚（offset+章节名+百分比）全部不碰。

### 2.2 待验假设（取证前一律不当结论，FIX-000 先行）

| # | 假设 | 验证方法 | 若不成立 |
|---|------|---------|---------|
| H1 | ~~华为引擎认不认 `[=pin4]`~~ **已定案成立**（2026-10-19 真机用户实听：A 组全按标注读对、方括号未念出、B 组默认音全对，见 `M-000-取证.md`） | — | 系统音色标注通道畅通，方案全量推进 |
| H1b | **实测补充（2026-10-19 用户实听）**：内置引擎（sherpa）**不认** `[=]` 标记，会把方括号内容念出来 | 同一本测试书切内置音色实听 | ⇒ 硬红线：`markRange` 标注**只许进系统引擎路径**（`speakCurrent`/`prefetchSeg` 的 `eng.speak`）；内置路径（`synthesize`）永远送原文，纠音只走自定义词典通道。接线单必须把这条写进断言 |
| H2 | har 1.13.3 的 matcha 前端 = PhraseMatcher 词典匹配（而非旧 jieba 路径），且 `lexicon` 逗号多文件在 ArkTS har 面可用、重复词先入/后入行为明确 | 读 har 内 `.so` 符号 + 模拟器合成对拍「银行行长」 | 走旧路径 ⇒ 自定义词典改为构建期合并进 rawfile lexicon.txt（同样可行，合并策略不同；重复词行为实测钉死排序） |
| H3 | 引擎词典本身没错（错读主要源于「词典外搭配」） | 自造样章双引擎实听基线 | 引擎词典本身错 ⇒ 自定义词典**覆盖式**追加（利用先入者优先，自定义文件排前） |
| H4 | `[=]` 标注不破坏语速估算（`charsPerSec()` 按字数估语速） | 真机 A/B 听 + `rate … cps` 日志看是否落 4~9 | 标注计入字数 ⇒ 在语速统计侧剥离标记长度 |
| H5 | 整本扫描性能可接受（百万字级书 × 数百词条） | 离线基准：Node 跑复刻匹配器扫 2MB 文本计时 | 超时 ⇒ 分块后台扫 + 让路（入库链路本就有探测/提纯等后台步骤可搭车） |

### 2.3 技术实现

**核心不变量（红线）**：
1. 预处理**只作用于送引擎那一份文本**；`SpeechSeg.text`（显示/高亮用）与 `start/end` 偏移**逐字节不变**；
2. 标注可逆：`strip(mark(t)) === t` 恒成立（门禁断言），strip 正则 = `/\[=[a-z]+[1-5]\]/g`；
3. 词库未命中 ⇒ 送引擎文本与现状**逐字节一致**（零行为漂移）；
4. 原文与 `.raw` 零改动（SHA256 断言）；
5. 可关常量 `POLYPHONE = false` 即等价改前（不扫描、不读表、不标注）；内置侧词典文件在 `@@BUILTIN-TTS@@` 标记内，上架版裁剪纪律照旧。

**新增件**：

1. **通用词库** `resources/rawfile/polyphone.json`：常用多音字词组表（初始 300~800 条人工精选：常见文学多音词 + 姓氏/地名高频 + pypinyin phrases_dict 高频子集，MIT 出处写文件头注释）；每条 `{w:"银行", r:[{c:"行", p:"hang", t:2}]}`；带 `dictVersion`，随 App 版本维护。
2. **匹配器（纯函数）** `utils/PolyphoneRule.ets`（仿 `utils/VoiceRule.ets` 先例，可被 Node 门禁直接跑）：
   - `scan(text, dict) → hits[{off, w, pin}]`：词级最长匹配，输出全局偏移；
   - `markRange(text, lo, hi, hits) → string`：对段文本副本按命中插 `[=pin4]`（跨段界的词只按「词起点落在本段」处理，避免重复标注）；
   - `strip(s)`；`strip(mark(t)) === t` 为门禁恒真断言。
3. **入库挂点（一次性扫描）**：
   - 抓取书：提纯落盘、`onReady` 建条目**之后**后台扫（不阻塞入库判定——入库铁律「探到内容才入库」不动）；
   - 本地书：进书架/首次打开时后台扫；
   - 产物 `<书>.poly.json`（与书数据同目录 sidecar；含 `dictVersion`）；开书时版本落后 ⇒ 后台重扫，本次先用旧表或直通；
   - 清扫链路（`sweepDeadGrabs` 类）要认这个 sidecar（随书删/随书留）。
4. **听书挂点（零匹配）**：`setChapter` 后加载本书命中表；`speakCurrent`（`:1344` 前）与 `prefetchSeg`（`:1413` 前）用 `markRange(seg.text, seg.start, seg.end, hits)` 的副本送引擎；`seg` 对象本身不改。
5. **内置引擎全局词典**：`BuiltinTtsWorker.ets` 的 `config.lexicon` 改指 `models/matcha-icefall-zh-baker/lexicon.txt,models/polyphone.lex.txt`（H2 证实多文件可用；否则构建期合并）。`polyphone.lex.txt` 由 `polyphone.json` 同源生成（`tools/` 里放生成脚本，单一真源不手改两份），行格式**与现 lexicon.txt 逐字同构**（FIX-000 先抄现格式，不猜）。`tools/fetch_tts_model.py` 校验和清单只管下载件，自定义词典另列。
6. **判据化日志**（零行为日志包，随 FIX-000 出）：
   - `polyscan|book=…|dict=N|hits=M|ms=T|v=<dictVersion>`（入库扫描，写 `tts_diag.txt`，攒批 dlog）；
   - `poly|seg=N|n=命中数|words=词1,词2`（播放期取用，验证「命中表读到了、标注插了」）；
   - 每加一类日志补一条 `diag_log_reset_selftest.py` 门禁（现行套路）。

> 📚 技术来源见 §1.5 来源块（`[=MN]` 官方示例、lexicon 多文件、PhraseMatcher 语义均引自该处链接）。

### 2.4 风险评估

**影响范围**：
- 直接影响：送引擎文本（两条路径各一处调用点）+ 入库链路新增后台扫描 + 书籍目录新增 sidecar 文件；
- 间接影响：H4（语速估算）、`[=]` 标记与引擎 TN（number.fst 等）相互作用（命中词恰在数字旁）；sidecar 纳入备份/清扫链路；
- 上架版：系统 TTS 标注层属通用能力可留；内置词典文件在 `@@BUILTIN-TTS@@` 标记内随裁剪走，`build_gallery_nosource.py:314` needles 复核零命中。

**副作用分析**：
- `[=]` 标记不被识别 ⇒ 逐字念出方括号（H1 先验，风险最高的一条，故 FIX-000 排最前）；
- 词库条目本身录错 ⇒ 把对的改错 ⇒ 词表评审 + 每条目带来源注释；
- 大书扫描占后台资源 ⇒ 与入库探测/提纯同队列排队；App 内口径 =「不阻塞打开、后台完成」；
- 旧书无命中表 ⇒ 直通（等价改前），懒补扫，绝不因缺表报错。

**回滚方案**：`POLYPHONE = false` 一个常量回到改前；sidecar 文件留着无害；内置词典文件删除/不引用即恢复原前端行为；git revert 单提交边界。

---

## 三、Agent任务拆分

### 3.1 批次规划

**Batch 0 — 取证（零行为，先征得用户同意再出包）**

| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-P000 | 取证包（零行为日志）：验 H1（`[=]` 真机三例）、H2（har 1.13.3 前端路径 + lexicon 多文件 + 重复词行为）、H3（自造样章双引擎实听基线）、H4（rate 日志）、H5（Node 复刻匹配器扫 2MB 计时）；抄录现 lexicon.txt 行格式 | 无 | 低（零行为日志包） |

**Batch 1 — 词库 + 匹配器（单文件串行，不开并行）**

| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-P001 | `polyphone.json` 通用词库（300~800 条，带来源注释+dictVersion）+ `PolyphoneRule.ets` 纯函数（scan/markRange/strip）+ Node 门禁（含反向对照）+ H5 基准脚本 | P000 | 低 |

**Batch 2 — 接线（❗P002/P003 同改 `BookSpeaker.ets` 相邻区域 ⇒ 串行；P004 文件独立可并行）**

| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-P002 | 入库扫描接线：抓取书/本地书两入口后台扫 + `<书>.poly.json` sidecar + dictVersion 懒重扫 + `polyscan|` 日志 + 原文 SHA256 不变断言 + 清扫链路认 sidecar | P001 | 中（入库链路是新触点） |
| FIX-P003 | 播放取用接线：`setChapter` 读命中表 + `speakCurrent`/`prefetchSeg` 两点 `markRange` 副本 + `POLYPHONE` 常量 + `poly|` 日志 + 真机听判 | P001, P002 | 中（H1/H4） |
| FIX-P004 | 内置接线：worker `config.lexicon` + `polyphone.lex.txt`（同源生成脚本进 tools/）+ `builtin_tts_selftest`/`builtin_link_selftest` 补断言 + 模拟器听判 | P001 | 低 |

**Batch 3 — 收口**

| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-P005 | 回归 + `check_both.py` 双包门禁 + 上架版 needles 复核 + 文档回写（本 fix-plan 状态行、`04` 承诺表） | P002, P003, P004 | 低 |

### 3.2 任务依赖关系图

```
Batch 0 (取证包: H1~H5)
    ↓
Batch 1 (通用词库 + PolyphoneRule 纯函数 + 门禁)      ← 单文件串行
    ↓
Batch 2 (P002 入库扫描 → P003 播放取用 [同文件串行] ∥ P004 内置词典 [独立文件])
    ↓
Batch 3 (回归 + 双包门禁 + 文档回写)
```

### 3.3 Agent任务卡

#### FIX-P000 取证包（零行为日志 + 引擎事实钉死）
- **输入**：`BookSpeaker.ets`、`BuiltinTtsWorker.ets`、`entry/oh_modules/sherpa_onnx/`（har 1.13.3）、`rawfile/models/matcha-icefall-zh-baker/lexicon.txt`。
- **执行**：① 抄 lexicon.txt 前 50 行格式 + grep 常见多音词（银行/行长/重复/音乐/着）在词典中的有无与读音；② har `.so` 符号查 PhraseMatcher/jieba 路径；③ 出零行为日志包（`polyscan|`/`poly|` 行 + `[=]` 三例试合成，不改正常链路行为）；④ 真机（系统音色）+ 模拟器（内置音色）跑自造样章，记录每条对错；⑤ Node 复刻匹配器扫 2MB 文本计时（H5）。
- **输出**：`M-000-取证.md`（H1~H5 各自 成立/不成立/未验 + 数字），lexicon 格式样例。
- **验证标准**：H1 有明确「认/不认/逐字念出」三态结论；H2 有符号级证据；量具（`poly|` 行）先用已知命中场景自证「能看见」。

#### FIX-P001 通用词库 + 匹配器 + 门禁
- **输入**：pypinyin phrases_dict（MIT，出处注释）、常见多音字人工精选表、P000 的 lexicon 格式样例。
- **输出**：`resources/rawfile/polyphone.json`（含 dictVersion）、`utils/PolyphoneRule.ets`、`tools/polyphone_selftest/`（Node 跑生产 `.ets` 副本，仿 voice_selftest 套路；断言含：`strip(mark(t))===t`、未命中逐字节相等、最长匹配优先、跨段界只标一次、重叠词、纯标点段、英文段直通；**反向对照**：`git show HEAD` 无此文件即红）、H5 基准脚本。
- **验证标准**：用例全绿 + 反向对照报红 + 词表每条有来源注释 + 2MB 扫描计时达标。

#### FIX-P002 入库扫描接线
- **输入**：入库链路（抓取书提纯落盘后 / 本地书进书架）、`PolyphoneRule.scan`。
- **执行**：两入口后台扫（不阻塞打开/入库判定）+ sidecar 读写 + dictVersion 懒重扫 + `polyscan|` 日志 + 清扫链路认 sidecar。
- **验证标准**：入库后 `<书>.poly.json` 存在且 hits 与离线复刻一致；**原文 SHA256 改前改后一致**；旧书无表直通不报错；扫描期间打开书不卡。

#### FIX-P003 播放取用接线
- **输入**：`BookSpeaker.ets`（`setChapter:1021`、`speakCurrent:1344`、`prefetchSeg:1413`）。
- **执行**：`POLYPHONE` 常量 + 命中表加载 + 两点 `markRange` 副本送引擎 + `poly|` 日志；真机（用户手机，音频类只能真机）听判样章 + 对照 `rate … cps` 落 4~9。
- **验证标准**：样章例词读对；无命中段送引擎文本与改前逐字节一致（日志对拍）；高亮/进度回归正常；`POLYPHONE=false` 时行为与改前完全一致；播放路径无词库扫描（每段耗时日志无变化）。

#### FIX-P004 内置 TTS 接线
- **输入**：`BuiltinTtsWorker.ets:32-38`、`polyphone.lex.txt`（由 polyphone.json 生成，格式=现 lexicon.txt）。
- **执行**：按 H2 结论选「多文件引用」或「构建期合并」；生成脚本进 `tools/`；补 `builtin_tts_selftest.py`（UT-B07 词典路径/格式断言）与 `builtin_link_selftest.py`（标记内触点断言）。
- **验证标准**：模拟器听判样章；`fetch_tts_model.py` 校验和不受影响；上架版裁剪后 worker 编译通过（`check_both.py`）。

#### FIX-P005 收口
- **执行**：全套 `tools/*_selftest.py` + `check_both.py` + release 包 + 装机 + 回写本文档状态行与 `04-纯阅待办与验收.md`。
- **验证标准**：见 test-strategy §三 必须通过清单。

---

## 四、实施计划

### 4.1 阶段划分

| 阶段 | 任务 | 产出 |
|------|------|------|
| 阶段0 | P000 | M-000 取证（H1~H5 定案） |
| 阶段1 | P001 | 通用词库 + 匹配器 + 门禁绿 |
| 阶段2 | P002 → P003（串行）∥ P004 | 入库扫描 + 播放取用 + 内置词典 + 听判记录 |
| 阶段3 | P005 | 双包门禁 + 交付包 + 文档回写 |

### 4.2 发布计划

- 与既有口径一致：改动全部挂 `POLYPHONE` 常量，**spike → 用户拍板 → 转正**五步走（听感类改动必须用户实听拍板）；
- ~~若 H1 不成立~~ **H1 已定案成立**（2026-10-19 真机实听），系统音色标注通道与内置词典通道**双线全量推进**；预案作废。

### 4.3 明确不做

- ❌ 按书定制词库/向用户要例词（用户已定案：通用词库，内容匹配即生效）；
- ❌ 播放期实时匹配（用户已定案：入库一次性预匹配，结果落书籍数据）；
- ❌ 改写正文落盘（含抓取书——提纯文本也不动，纠音信息只进 sidecar）；
- ❌ 同音字替换（银行→银航，污染文本轨）；
- ❌ 移植 pypinyin 全量词库到 ArkTS（内置引擎模型词典已含同源词库；App 词库只做「常用精选 + 引擎词典的覆盖补充」）；
- ❌ 给 sherpa TTS 配 HomophoneReplacer（那是 ASR 的功能，TTS 配置无此字段）；
- ❌ 修改显示正文或 `SpeechSeg` 偏移。

---

## 六、实施记录（2026-10-19，编排收口时同步）

| 单 | commit | 内容 | 门禁 |
|----|--------|------|------|
| P001 | 5316d66 (+f7c725b 门禁修正) | 词库 polyphone.json 610 条 + PolyphoneRule（scan/markRange/strip，禁令注释）+ polyphone_gen.py + run.py（UT-P01~P08） | 正向绿；--head 反向红（锚点=引入提交父提交，HEAD 口径会假绿） |
| P002 | ef563d6 | PolyScan（loadDict/loadPoly/scanAndSave）+ 入库挂点（SourcePage addToShelf/updateExisting/抓失败删书、Reader 本地书后台扫、Index 删书随删）+ sidecar `<书>.poly.json` | UT-P09~P14；2MB 端侧 112~133ms；SHA256 不变 |
| P003 | ec0e1f2 | BookSpeaker：POLYPHONE 总闸 + polyMark 副本送系统引擎两点（:1444/:1514）+ setChapter 可选 bookPath 异步读 sidecar（代数闸，读不到直通）+ H4 语速 measureRate :472 走 strip 口径；内置 synthesize(seg.text) 零改动 | UT-P15~P20（含 Node 往返自证 + POLYPHONE=false 逐字节回原样）；反向红 34 条 |
| P004 | a6ae871 | polyphone_lex_gen.py → polyphone.lex.txt（610 行，跳过 0，轻声裸音节同现库口径）+ worker lexicon 逗号双文件（lexicon.txt 在前=先入者优先；:36-39 回退注释=构建期合并）+ .gitignore 白名单放行该生成物 + .gitattributes 钉 LF | UT-B07、UT-L06 正反均验；UT-B03/UT-L03 两处存量误红修判据 |

**已知分歧（留对拍）**：610 词中 530 与模型词典读音相同、58 分歧、22 新增；先入者优先 ⇒ 58 分歧词以 lexicon.txt 为准的风险留模拟器对拍。
**H2 尾巴**：har 1.13.3 native 逗号切分 lexicon 未实测 ⇒ P005a 对拍；不生效则回退=构建期合并。
**P005a 进行中**：check_both 双包 + 自用版 release + 模拟器冒烟（polyscan/polyload 日志、内置词典对拍、删书随删、回归抽查）。
