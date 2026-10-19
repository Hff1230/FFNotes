# 修复方案文档：听书音频与其他应用语音（微信/畅聊/电话/闹铃）焦点冲突

> 文档生成时间: 2026-10-18（同日按用户拍板语义原地修订）
> 关联问题ID: FIX-AF-000
> 文档性质: **仅方案，未实施**（改码需用户另行明确拍板，如「按方案修吧」）

---

## 一、问题诊断

### 1.1 问题概述

| 属性 | 内容 |
|------|------|
| 问题ID | FIX-AF-000 |
| 发现时间 | 2026-10-18（用户报告） |
| 影响级别 | P1（听书期间微信语音/畅聊/电话全被压制；通话结束后听书可能"无声假播"） |
| 问题状态 | 语义已定案，待拍板实施 |
| 影响模块 | `BookSpeaker.ets`（自播渲染器/段推进）、`Reader.ets`（长时任务保活链） |

### 1.2 问题描述与定案语义

用户报告：听书播放期间，微信里播放语音消息或畅聊语音，会被听书立刻打断。

✅ **产品语义已定案（用户 2026-10-18 拍板）**：
> **检测到 播放语音（微信语音消息/畅聊语音）、接听电话、闹铃响起 时，听书自动暂停；对方结束后自动恢复听书。**

即采用「**暂停让路 + 自动恢复**」语义，**不做混播**（原方案 A2 的「可与其它应用同时播放」开关被否决，见 §2.1）。

### 1.3 根因分析

**直接原因（证据等级：代码实证，已核实）**：
听书自 2026-10-15「后台保活硬解」（提交 `02666c6`）起用**本进程 AudioRenderer** 出声：

- `BookSpeaker.ets:1329-1341`：`audio.createAudioRenderer`，`usage: STREAM_USAGE_AUDIOBOOK`（媒体组）、`content: CONTENT_TYPE_SPEECH`、`rendererFlags: 0`。
- 鸿蒙默认焦点策略：媒体类（MUSIC/MOVIE/AUDIOBOOK）与语音消息类（VOICE_MESSAGE）、通话类（VOICE_COMMUNICATION）、闹铃（ALARM）互斥——**后起的高优先级流会把媒体流 PAUSE，对方结束后媒体收到 RESUME**（官方典型场景表：「通话接通时音乐暂停，挂断后恢复」；语音消息、闹铃同理为 PAUSE→RESUME 临时失焦）。官方映射表直接点名：微信语音消息=VOICE_MESSAGE、微信语音通话=VOICE_COMMUNICATION。
- ⇒ 系统本来就会把听书暂停、给对方让路；**用户仍听到"听书掐断对方"，机理指向应用侧对暂停无感知后的反向动作**（下述深层原因 2/3）——此机理为**待验假设**，由随包 `afoc|` 日志在真机四场景定案。

**深层原因（证据等级：代码实证，已核实）**——应用侧对焦点零管理：

1. **全仓库无任何 `audioInterrupt` 监听**（`interrupt` 全仓零命中代码；`Reader.ets:3802/4247` 仅注释引用官方口径）⇒ 系统 PAUSE 听书时应用无感知：`playing` 仍 true、推进 tick 照跑、`pump()` 继续向已被系统暂停的渲染器灌 PCM、高亮继续前进。
2. **保活链反向抢回**：`onBgTaskStopped`（`Reader.ets:4251`）在长时任务被系统取消后 1.2s/4s/12s 三次自动重申请且**期间保持朗读**；另有每段开始补申请（`:3803`）、5s 心跳补申请（`:4293`）、回前台补申请（`:5472`）——对方语音播放期间这套逻辑反复重试，一旦渲染器被恢复即再次出声。
3. **恢复缺失 → 无声假播**：官方语义 RESUME 一定是 SHARE、系统不代调 `start()`，应用必须自己调 `renderer.start()`。没监听 ⇒ 通话/语音消息结束后没人恢复 ⇒「播控显示播放中、实际没声音、高亮还在走」（**待真机取证确认**）。
4. 全仓库也不存在 AudioSession 会话策略代码——本方案**维持不加**（默认策略的 PAUSE→RESUME 恰是用户要的让路语义，见 §2.2）。

**影响范围**：所有听书用户碰微信语音/畅聊/电话/闹铃的高频场景；仅手机/平板（官方：PC 默认多应用混播）。

### 1.4 复现步骤

1. 装纯阅，开书点「开始朗读」（自检行 `sp:on audio:live`）。
2. 切微信播一条语音消息 / 发起畅聊语音 → 实际：语音刚起即被掐/压，听书独占。
3. 反向：听书中接蜂窝电话，挂断回纯阅 → 大概率无声但界面显示播放中（待验假设）。
4. 闹铃：定个闹钟，响铃时听书应暂停、铃停后应续（现状：全程无让路感知）。

### 1.5 相关信息

- 出声链路：`toggleSpeech()`（`Reader.ets:3667`）→ `speaker.play()`（`BookSpeaker.ets:857`）→ `eng.speak(playType:0)` 只回 PCM → `onPcm`→`pump()`→`renderer.write()`（`:1542`）。
- 系统 TTS 只做合成（`playType:0`）；`soundChannel` 仅影响 `playType:1` 回落路径。
- 长时任务：`startBackgroundRunning(AUDIO_PLAYBACK)`（`Reader.ets:4181`）+ `module.json5 backgroundModes:["audioPlayback"]`。
- 官方依据全文：本目录 `调研纪要-harmonyos-audio-focus.md`。

### 1.6 取证（并入实施包，不再单独出零行为包）

原计划的独立取证包**取消**：MIX 生效方向这个最大未知量已随「不做混播」的拍板消失；剩余未知（FORCE/SHARE 到达形态、暂停后写入是否把声音顶回来、假播路径）用**实施包自带的 `afoc|` 日志**在真机四场景一次采齐：
① 微信语音消息 ② 畅聊语音通话 ③ 蜂窝来电+挂断 ④ 闹铃响起+停止。
量具自证：先用③（必触发系统暂停）确认 `afoc|` 行能出现，再跑其余。`tts_diag.txt` 每场景分段 recv（开播即 TRUNC）。

---

## 二、修复方案

### 2.1 方案对比（按定案语义修订）

| 维度 | 方案A：中断监听 + 自动暂停/恢复（✅ 采纳） | 方案B：AudioSession MIX 混播开关（❌ 用户否决） | 方案C：改 usage 低优先级通道（❌ 否决） |
|------|------|------|------|
| 描述 | 注册 `on('audioInterrupt')`：PAUSE/STOP/MUTE→暂停朗读逻辑；RESUME→`renderer.start()`+续播；保活重试在焦点暂停期挂起 | 播放前 activate `CONCURRENCY_MIX_WITH_OTHERS` 求混播 | 换 ACCESSIBILITY/VOICE_ASSISTANT 通道 |
| 结果 | 恰为用户要的「对方播时我停、对方完我续」；顺带修无声假播 | 与定案语义不符（混播=一起响）；且官方规则 STOP>PAUSE>DUCK>MIX 优先级限制，MIX 未必挡得住语音消息抢焦点 | usage 语义造假，后台保活校验连锁风险 |

### 2.2 推荐方案（定案）

**方案A 单条链**，不加设置项、不加 AudioSession：

- 默认焦点策略对「语音消息 / 通话 / 闹铃」三类**本来就是 PAUSE→RESUME**（官方典型场景表），应用只需**听话地执行暂停、并在 RESUME 时恢复**——不需要任何会话策略干预。
- 官方语义硬约束：`InterruptEvent` 仅 3 字段（eventType/forceType/hintType）；FORCE=系统已执行暂停（应用只更新状态，勿再调系统接口），SHARE=应用自己处理；**RESUME 一定是 SHARE，必须自己调 `renderer.start()`**；**STOP=永久失焦、不会再有 RESUME**——闹铃/通话/语音消息按官方策略都走 PAUSE→RESUME，若个别机型对闹铃发 STOP，则按官方语义保持暂停、由用户手动续播（文档如实写明，不做无依据的轮询抢回）。

### 2.3 技术实现

**① 中断监听（BookSpeaker.ets，`ensureRenderer`/`recreateRenderer` 每次新建渲染器都注册，`release` 时 off）**：

```ts
// 伪码示意（实施时按 ArkTS 类型写全）
r.on('audioInterrupt', (ev: audio.InterruptEvent) => {
  dlog(`afoc|evt=${ev.eventType}|force=${ev.forceType}|hint=${ev.hintType}`);
  if (ev.eventType !== audio.InterruptType.INTERRUPT_TYPE_BEGIN) return; // END 仅记账
  const h = ev.hintType;
  if (h === audio.InterruptHint.INTERRUPT_HINT_PAUSE
      || h === audio.InterruptHint.INTERRUPT_HINT_STOP
      || h === audio.InterruptHint.INTERRUPT_HINT_MUTE) {
    this.pauseForFocusLoss();
  } else if (h === audio.InterruptHint.INTERRUPT_HINT_RESUME) {
    this.resumeFromFocus();
  } // DUCK/UNDUCK：默认策略下听书不该收到；收到只记日志不动作
});
```

`pauseForFocusLoss()`：置 `focusPaused=true` → 停推进 tick（沿用「渲染器为 null 时不推进」的既有闸）→ `clearPrefetch()`（红线：暂停必清预取，恢复不播旧 PCM）→ 渲染器若仍 active 则 `pause()`（FORCE 时系统已停，重复 pause 无害）→ 上报 Reader 挂起保活重试 + 自检行追加 `foc:pause`。
`resumeFromFocus()`：`focusPaused=false` → `renderer.start()`（SHARE/RESUME 官方要求自调）→ 从当前段续推 → 通知 Reader 走既有 `bgAcquireTick` 重新申请长时任务（官方口径：被打断后系统自停长时任务，重启播放要再次申请；`isAudioLive()` 门禁已就位）。
STOP 分支：同 PAUSE 暂停，但记 `afoc|stop-norm`，**不自动恢复**（官方语义），用户点「开始朗读」即正常续。

**② 保活链联动（Reader.ets）**：`speaker.isFocusPaused()` 为 true 期间——
- `onBgTaskStopped` 的 1.2s/4s/12s 重申请、每段补申请（`:3803`）、5s 心跳（`:4293`）、回前台补申请（`:5472`）**全部挂起**（音频没在播，重申请必报 9800005，纯刷屏且是"抢回局面"的推手）；
- 焦点恢复后由 `resumeFromFocus` 触发一次重申请；
- 听书面板自检行追加焦点态（复用现成行零新文案，如 ` … foc:pause`）。

**③ 进度红线**：焦点暂停瞬间按既有「停止听书即落库」口径落一次位置；恢复后逐段落库不变——严禁恢复时回到章首（进度铁律）。

**④ 日志**：`afoc|` 前缀全部走既有攒批 dlog；每事件一行，含 eventType/forceType/hintType；`pump()` 写失败补 `afoc|write-fail|state=`。

> 📚 **技术来源**（全部经 OpenHarmony 官方 docs 原文交叉核对，详见本目录调研纪要）:
> - 音频焦点介绍/典型场景表（通话/语音消息/闹铃 × 媒体 = PAUSE→RESUME）: https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/audio-playback-concurrency
> - on('audioInterrupt') 语义与 FORCE/SHARE 处理示例（RESUME 必须自调 start()）: https://developer.huawei.com/consumer/cn/doc/harmonyos-references/arkts-apis-audio-audiorenderer#onaudiointerrupt9
> - InterruptEvent / InterruptHint 枚举: https://developer.huawei.com/consumer/cn/doc/harmonyos-references/arkts-apis-audio-i#interruptevent9
> - 最佳实践《音频焦点管理》（微信语音消息/通话映射表）: https://developer.huawei.com/consumer/cn/doc/best-practices/bpta-audio-focus-management
> - 官方 Sample: https://gitcode.com/harmonyos_samples/audio-focus
> - ❌ 禁止引用的讹传 API：`AUDIO_SESSION_STRATEGY_*`、`AudioInterruptReason.CALL_INTERUPTED`——官方文档不存在。

### 2.4 风险评估

**影响范围**：渲染器创建/重建/释放路径、段推进 tick、长时任务申请链。
**副作用分析**：
1. 焦点暂停↔恢复与预取（`PREFETCH_NEXT`）交互：恢复必走 `clearPrefetch` 语义（已列入实现要点）。
2. `recreateRenderer()`（蓝牙切设备）后监听器丢失 ⇒ 每次重建后重挂，验收含拔插蓝牙。
3. 闹铃在个别机型可能以 STOP 到达 ⇒ 不自动恢复（官方语义），如实写进交付说明，不硬造恢复。
4. 与既有「冻结假播」取证混淆：`afoc|` 前缀独立。
5. 对方语音播放期间应用被系统冻结的风险：焦点暂停后本应用无音频流，长时任务会被系统正常收回——这是**正确行为**（让路），恢复时重新申请即可；需验收「暂停→恢复→长时任务重新 OK」闭环。

**回滚方案**：监听注册与暂停/恢复动作留常量 `FOCUS_PAUSE = false`（关闭=逐字等价现行为）；单提交落地，`git revert` 即回退；装机包留改前 md5。

---

## 三、Agent任务拆分

### 3.1 批次规划

**Batch 1 — 实施（用户拍板「按方案修」后开工）**
**执行方式：串行（FIX-AF-002/003 同改 BookSpeaker.ets + Reader.ets，本轮单文件串行，不开并行）**

| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-AF-002 | audioInterrupt 监听 + focusPaused 态 + 暂停/恢复动作 + `afoc|` 日志（BookSpeaker.ets） | 无 | 中 |
| FIX-AF-003 | 保活链挂起闸 + 自检行焦点态 + 恢复后重申请（Reader.ets 保活段） | FIX-AF-002 | 中 |

**Batch 2 — 验证与收口**

| 任务ID | 任务名称 | 依赖 | 风险 |
|--------|----------|------|------|
| FIX-AF-004 | 门禁全套 + `check_both.py` + release 包 + 真机四场景取证/验收 + 锁屏长播红线回归 + 文档回写 | FIX-AF-003 | 中 |

### 3.2 任务依赖关系图

```
用户拍板 → Batch 1 (FIX-AF-002 → FIX-AF-003，同文件串行)
              ↓
          Batch 2 (FIX-AF-004 门禁 + 真机四场景 + 红线回归 + 交付)
```

### 3.3 Agent任务卡

#### FIX-AF-002 中断监听与暂停/恢复（BookSpeaker.ets）

- **问题级别**: 一般Bug | **影响模块**: BookSpeaker.ets | **依赖**: 无 | **风险**: 中
- **输入**: `entry/src/main/ets/utils/BookSpeaker.ets`（`ensureRenderer` :1322 / `recreateRenderer` / `pump` :1513 / `startTick` :1594 / `clearPrefetch` / `release` :564）
- **修复方案**: 见 §2.3 ①④。常量 `FOCUS_PAUSE` 兜底关闭。
- **输出**: 修改后 BookSpeaker.ets + `isFocusPaused()` 对外接口 + 门禁断言（`diag_log_reset_selftest.py` 新增 `afoc|`/监听注册断言 + `git show HEAD` 反向对照报红）。
- **验证标准**: ① 每次新建/重建渲染器后监听唯一注册 ② PAUSE/STOP/MUTE→tick 停+预取清 ③ RESUME→`start()`+续推 ④ 暂停瞬间落库一次进度 ⑤ 常量关=旧行为。

#### FIX-AF-003 保活链联动（Reader.ets）

- **问题级别**: 一般Bug | **影响模块**: Reader.ets 保活段（:4138-4300、:5470） | **依赖**: FIX-AF-002 | **风险**: 中
- **修复方案**: 见 §2.3 ②。四处补申请入口统一查 `speaker.isFocusPaused()`；恢复后触发 `bgAcquireTick`；自检行追加 `foc:` 态（复用现成字符串）。
- **验证标准**: ① 焦点暂停期 `startBackgroundRunning` 尝试数=0（无 9800005 刷屏）② 恢复后 ≤1 个心跳周期内重新 OK ③ 非焦点暂停路径行为逐字不变。

#### FIX-AF-004 门禁、双包与真机四场景验收

- **问题级别**: 收口 | **依赖**: FIX-AF-003 | **风险**: 中
- **执行步骤**: 全套 `tools/*_selftest.py` + `check_both.py` → release 自用版包（1.3~1.5MB 抽验、md5 当场记）→ 装机（`-r -d`）→ 真机四场景（微信语音消息/畅聊/蜂窝来电/闹铃）各录 `afoc|` 序列 → 锁屏 ≥15 分钟红线回归 → 中英界面截图 → 回写本文档状态行、`04-纯阅待办与验收`、技能笔记。
- **验证标准**: 见 `test-strategy.md` §三 必须通过全绿。

---

## 四、实施计划

### 4.1 阶段划分

| 阶段 | 任务 | 产出 |
|------|------|------|
| 阶段1 | FIX-AF-002 → FIX-AF-003（串行） | 修复代码 + 门禁断言 |
| 阶段2 | FIX-AF-004 | 双包门禁 + 真机四场景报告 + 交付包 |

### 4.2 发布计划

焦点行为**只能真机验**（模拟器不做焦点校验）。真机四场景 + 用户实听拍板后随下一版发布。

---

## 五、状态

- [x] 诊断完成（代码实证 + 官方依据）
- [x] 语义定案（用户 2026-10-18：语音/通话/闹铃 → 自动暂停，结束自动恢复；不做混播）
- [x] 实施完成（FIX-AF-002 `ab2f57b` + r1 `ba95e5e`；门禁 UT-335/335b/336/337 全绿 + 反向对照有牙）
- [x] **真机验收通过（2026-10-18 深夜，用户原话「都OK了，nice」）**：交付包 `release/_wip/FIX-AF-002r1-release.hap`（md5 `bd263cb07daf259a26c9b4bd56d76542`）。日志证据 `release/_wip/afoc_final_evidence.txt`：5 组 pause→resume 全配对、恢复时延 53~72ms。

## 五·五、FIX-AF-005（2026-10-19，用户报「切抖音再回来，听书不恢复卡住」）

- **根因**：焦点暂停（focusPaused）后的恢复**完全依赖系统发 RESUME**。微信语音放完会主动释放焦点（实测 END+RESUME 配对）；短视频类 App（抖音等）被切后台只是**暂停**自己的媒体流、**不释放焦点**，系统不给纯阅发 RESUME ⇒ `focusPaused` 永久卡住：tick 闸不推进、四处保活补申请全被 `afoc|bg-skip` 挂起 ⇒「界面显示播放中、没声音、不恢复」。回前台路径（`onAppForeground`）旧代码只挂起补申请，**没有任何恢复动作**。
- **修法（FIX-AF-005，单变量）**：「用户回到纯阅」本身就是最强的恢复意图信号 ⇒ `onAppForeground` 检测 `isFocusPaused() && ttsPlaying` ⇒ 600ms 后（等前台布局/焦点态落定）调 `speaker.resumeIfFocusPaused('fg')` 主动补一次 `resumeFromFocus()`（内部幂等 + start() 失败 300ms 重试一次，复用 FIX-AF-002r1 已验收链路）。若对方其实还在播（悬浮窗/后台音），`start()` 会被系统再次 PAUSE ⇒ 自动回到焦点暂停态（自愈，不会双声）。恢复后长时任务由 5s 心跳补申请（既有链）。
- **判据**：回前台 ≤1s 出现 `afoc|fg-resume|why=fg` + `afoc|resumed`；若被再次打断则随后再现 `afoc|paused|hint=`。门禁 UT-338（反向对照旧码报红）。
- **状态**：已实施，待真机验收（只能真机验，模拟器不做焦点校验）。

### 实测修正（原地改，不留矛盾）
- §2.2 官方语义「RESUME 一定是 SHARE（BEGIN）」**被真机推翻**：本机 RESUME 发在 **END 事件**（`evt=2|force=1|hint=1`）。首包按文档只认 BEGIN → 恢复被闸掉 → 永久无声假播（用户报「听完语音听书没回来」）；r1 改为 END+RESUME 也走 `resumeFromFocus`。
- 闹铃实测走 DUCK/UNDUCK（`hint=4/5`）而非 PAUSE：默认策略下闹铃与听书混播，代码只记日志不动作，符合预期（用户验收 OK）。
