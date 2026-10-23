# HarmonyOS NEXT / OpenHarmony（API 12+）音频焦点与打断机制调研纪要

> 调研日期：2026-10-18。依据：华为开发者官网（developer.huawei.com）文档 + OpenHarmony 官方 docs 仓库（gitee.com/openharmony/docs，master 分支原文逐条核对）。
> 所有枚举名/值均摘自官方文档原文；查不到的按「未找到官方依据」标注。

---

## 0. 先说结论（与本次 bug 直接相关）

- 鸿蒙上**媒体类流（MUSIC/MOVIE/AUDIOBOOK）之间默认互斥**：后播的会 STOP/PAUSE 先播的；**通话类（VOICE_COMMUNICATION）和语音消息类（VOICE_MESSAGE）优先级高于媒体类**，开始时会把媒体流强制暂停（PAUSE，通话结束后收到 RESUME）。听书 App 用 AUDIOBOOK/MUSIC 出声，天然会被微信语音消息（VOICE_MESSAGE）和微信语音通话（VOICE_COMMUNICATION）打断——这是系统默认焦点策略，不是 bug。
- 反过来，**听书 App 播放时也会打断微信语音消息**（媒体流与语音消息流互抢），除非听书 App 主动用 AudioSession 的 `CONCURRENCY_MIX_WITH_OTHERS` 降级自己的焦点优先级。
- 任务提示词里的 `AUDIO_SESSION_STRATEGY_DEFAULT/MIX/FOCUS` 和 `AudioInterruptReason（CALL_INTERUPTED 等）` **在官方 API 12+ 文档中不存在**（详见第 2、3 节），写文档时禁止使用。

---

## 1. StreamUsage 各取值的焦点行为

官方枚举名是 `audio.StreamUsage`（不是 Android 的 `AudioUsage`；`STREAM_USAGE_MEDIA` 自 API 10 废弃，拆成 MUSIC/MOVIE/GAME/AUDIOBOOK）。

| 官方枚举（值） | 用途 | 焦点行为（官方原文依据见链接） |
|---|---|---|
| STREAM_USAGE_MEDIA (1, 已废弃) / MUSIC (1) / MOVIE (10) / **AUDIOBOOK (12)** / GAME (11) | 有声书、新闻、播客用 AUDIOBOOK | 媒体类互斥：Movie 开始→Music **暂停且 Movie 结束后不恢复**；Music 与 Game **可并发混播**；AUDIOBOOK 与 MUSIC/MOVIE 同组互抢 |
| STREAM_USAGE_VOICE_COMMUNICATION (2) | VoIP 语音通话（官方映射表明确举例「微信语音通话」） | 开始→Music **暂停**；结束→Music 收到 **RESUME**。启动时启用 3A 算法 |
| STREAM_USAGE_VOICE_MESSAGE (5) | 语音短消息（官方映射表：「即时通讯应用中的语音消息」即微信语音消息一类） | 开始→Music **暂停**；结束→Music 收到 **RESUME** |
| STREAM_USAGE_VOICE_ASSISTANT (3) | 语音播报（官方举例：滴滴打车播报） | 参与焦点管理；VoIP 通话进行中时，voice broadcast 类播报**申请焦点会被拒绝、无法播放**（见最佳实践 VoIP FAQ） |
| STREAM_USAGE_ACCESSIBILITY (8) | 无障碍（助听器等） | 参与焦点管理；**AudioSession 申请焦点对它无效**（API 20 会话场景文档明确列出 ALARM/NOTIFICATION/ACCESSIBILITY 不受 AudioSession 焦点影响） |
| STREAM_USAGE_NAVIGATION (13) | 导航播报 | 开始→Music **DUCK（降至 20% 音量）**；结束→UNDUCK 恢复 |
| STREAM_USAGE_ALARM (4) / RINGTONE (6) / NOTIFICATION (7) | 闹铃/铃声/提示音 | 闹铃→视频暂停后恢复；铃声→音乐暂停后恢复；VoIP 通话中铃声/导航/通知可**并发**播放 |
| STREAM_USAGE_VIDEO_COMMUNICATION (17) | VoIP 视频通话（官方举例「微信视频通话」） | 同 VOICE_COMMUNICATION，启用 3A |

来源：
- StreamUsage 枚举定义（官方 API 参考）：https://developer.huawei.com/consumer/cn/doc/harmonyos-references/arkts-apis-audio-e#streamusage
  （OpenHarmony 原文：https://gitee.com/openharmony/docs/blob/master/en/application-dev/reference/apis-audio-kit/arkts-apis-audio-e.md ）
- 焦点策略常见场景（Movie→Music 暂停不恢复 / Navigation→Music duck / Music+Game 混播 / VoiceCommunication→Music 暂停可恢复 / VoiceMessage→Music 暂停可恢复）：
  https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/audio-playback-concurrency （「音频焦点介绍」，OpenHarmony 对应原文 https://gitee.com/openharmony/docs/blob/master/en/application-dev/media/audio/audio-playback-concurrency.md ）
- 流类型↔业务场景映射表（含「微信语音通话=VOICE_COMMUNICATION、微信铃声=RINGTONE、微信视频通话=VIDEO_COMMUNICATION」）与「选择合适的播放流类型」：
  https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/using-right-streamusage-for-playback
  （OpenHarmony 原文 https://gitee.com/openharmony/docs/blob/master/en/application-dev/media/audio/using-right-streamusage-and-sourcetype.md ）
- 最佳实践《音频焦点管理》（流类型↔场景映射 + 默认策略 Stop/Pause/Duck/Mix 四态定义）：
  https://developer.huawei.com/consumer/cn/doc/best-practices/bpta-audio-focus-management
- 附加注意：MUSIC/AUDIOBOOK 默认走低功耗渲染器，熄屏后台播放需轮询 `getAudioTimestampInfo` 判断真播完：
  https://developer.huawei.com/consumer/cn/doc/architecture-guides/audio-v1_2-ts_115-0000002560570921

## 2. AudioSession 策略：官方没有 DEFAULT/MIX/FOCUS 三值枚举

**重要纠偏**：在 HarmonyOS NEXT / OpenHarmony 官方文档（ArkTS 与 C API 均查过全文）中，**不存在 `AUDIO_SESSION_STRATEGY_DEFAULT / AUDIO_SESSION_STRATEGY_MIX / AUDIO_SESSION_STRATEGY_FOCUS` 这组枚举**（对 openharmony/docs 全库 grep `AUDIO_SESSION_STRATEGY` 零命中）。这组名字疑为其它平台（Android AudioAttributes 风格）或二手博客的讹传。官方真实 API：

- 结构体：`audio.AudioSessionStrategy { concurrencyMode: AudioConcurrencyMode }`（API 12+）
- 枚举 `AudioConcurrencyMode`（4 值）：
  - `CONCURRENCY_DEFAULT (0)`：走系统默认焦点策略
  - `CONCURRENCY_MIX_WITH_OTHERS (1)`：与其他应用音频**并发混播**
  - `CONCURRENCY_DUCK_OTHERS (2)`：并发且压低其他应用音量
  - `CONCURRENCY_PAUSE_OTHERS (3)`：暂停其他应用音频，释放焦点后通知其恢复
- 激活/失活：`AudioSessionManager.activateAudioSession(strategy)` / `deactivateAudioSession()`；**必须在开始播放流之前 activate**。非主动失活会收到 `on('audioSessionDeactivated')`，原因枚举 `AudioSessionDeactivatedReason`：`DEACTIVATED_LOWER_PRIORITY`（焦点被抢）/ `DEACTIVATED_TIMEOUT`（会话激活后 1 分钟无流在跑，超时失活；超时会导致被 duck 的流 unduck、被 pause 的流直接 stop）。
- **MIX 是否完全不做焦点管理？不是。** 官方语义是「降低本应用音频流的优先级以实现混播」，有两条硬限制：
  1. 并发策略优先级 **STOP > PAUSE > DUCK > PLAYBOTH(MIX)**，若自定义策略优先级高于默认并发策略则**不生效**；
  2. 官方示例明确：`CONCURRENCY_PAUSE_OTHERS` 也**暂停不了**其他应用正在播的 VoiceCommunication 流——同理 MIX 只是让本流可与他人混播，**通话类流开始时仍会打断你**（MIX 生效于「申请焦点」和「他人后申请焦点」两个时机，但通话优先级更高）。
  3. AudioSession 焦点对 ALARM/NOTIFICATION/ACCESSIBILITY 等流无效（API 20 文档）。
- API 20+ 增加 `setAudioSessionScene`（MEDIA/GAME/VOICE_COMMUNICATION 三场景）可让会话级焦点更连续（短视频连播防漏音、VoIP 多流保焦点）。

来源：
- AudioConcurrencyMode / AudioSessionStrategy / AudioSessionDeactivatedReason 定义：
  https://developer.huawei.com/consumer/cn/doc/harmonyos-references/arkts-apis-audio-e#audioconcurrencymode12
  https://developer.huawei.com/consumer/cn/doc/harmonyos-references/arkts-apis-audio-i#audiosessionstrategy12
- AudioSessionManager（activateAudioSession/deactivateAudioSession/on('audioSessionDeactivated')）：
  https://developer.huawei.com/consumer/cn/doc/harmonyos-references/arkts-apis-audio-audiosessionmanager
- 会话策略语义、优先级规则、超时规则、场景参数（「音频会话」章节）：
  https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/audio-playback-concurrency
- C API 对应：`OH_AudioSession_ConcurrencyMode`（CONCURRENCY_DEFAULT/MIX_WITH_OTHERS/DUCK_OTHERS/PAUSE_OTHERS）：
  https://gitee.com/openharmony/docs/blob/master/en/application-dev/reference/apis-audio-kit/capi-native-audio-session-base-h.md
- 最佳实践中的自定义策略原理图与 activate/deactivate 代码：https://developer.huawei.com/consumer/cn/doc/best-practices/bpta-audio-focus-management

## 3. on('audioInterrupt') / InterruptEvent 完整语义

- 触发机制（官方原文）：「AudioRenderer 对象在 start 事件时获取焦点，在 pause、stop 等事件时释放焦点，无需开发者主动申请。如果获取焦点失败或发生中断事件（如被其他音频打断），会收到 InterruptEvent。」AVPlayer 同样有 `on('audioInterrupt')`。
- `InterruptEvent` 只有 3 个字段（官方接口定义）：
  - `eventType: InterruptType` — `INTERRUPT_TYPE_BEGIN(1)` / `INTERRUPT_TYPE_END(2)`（打断开始/结束）
  - `forceType: InterruptForceType` — `INTERRUPT_FORCE(0)`：系统已强制执行，应用**只需更新状态/UI，不要再调系统接口**；`INTERRUPT_SHARE(1)`：系统不执行，应用**可自行处理或忽略**（RESUME 一定是 SHARE，因为系统无法替你调 start()）。默认优先 FORCE，应用无法更改。
  - `hintType: InterruptHint` — `NONE(0)` / `RESUME(1)`（仅在收到过 PAUSE 后才会收到；应用需自己调 start() 恢复）/ `PAUSE(2)`（临时失焦，后续会收到 RESUME）/ `STOP(3)`（永久失焦，**不会**收到 RESUME，需用户手动恢复）/ `DUCK(4)`（降到默认 20% 音量继续播）/ `UNDUCK(5)` / `MUTE(6)`、`UNMUTE(7)`（API 20+）。
- **关于 `AudioInterruptReason`（CALL_INTERUPTED / VOICE_ASSISTANT_INTERUPTED / DEVICE_REMOVED 等）：未找到官方依据。** 已核对：HarmonyOS ArkTS API 参考（Enums/Interfaces 全文）、OpenHarmony docs 全库 grep、OHAudio C API（`OH_AudioInterrupt_ForceType`/`OH_AudioInterrupt_Hint`）——均无此枚举。打断的「原因」在官方模型里不通过 reason 字段传达，而是通过 hint（做什么）+ 流类型策略（为什么）表达。与设备移除相关的是另一个枚举 `AudioStreamDeviceChangeReason`（REASON_OLD_DEVICE_UNAVAILABLE 等，API 11+，属设备变化事件不是焦点事件）：https://developer.huawei.com/consumer/cn/doc/harmonyos-references/arkts-apis-audio-e#audiostreamdevicechangereason11
- 同应用内多流：`InterruptMode`（`SHARE_MODE(0)` 默认，同应用共享一个焦点、系统不做应用内焦点决策 / `INDEPENDENT_MODE(1)` 每流独立焦点、系统按应用间策略决策）。官方推荐 SHARE_MODE + 应用自管，因为 INDEPENDENT 下音乐 vs 音乐是 STOP 且不恢复。设置：AudioRenderer `setInterruptMode()` / AVPlayer 属性 `audioInterruptMode`。
- SHARED vs FORCE 标准应对（官方示例代码）：FORCE 分支只更新状态/UI；SHARE 分支收到 RESUME 时**必须自己调 `audioRenderer.start()`** 才真正恢复播放——很多「被打断后不恢复」的 bug 就出在漏了这一步。

来源：
- on('audioInterrupt') 说明与处理示例（含 FORCE/SHARE 完整 switch 代码）：
  https://developer.huawei.com/consumer/cn/doc/harmonyos-references/arkts-apis-audio-audiorenderer#onaudiointerrupt9
  https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/audio-playback-concurrency （「处理音频焦点变化」「典型场景」表）
- InterruptEvent / InterruptForceType / InterruptHint / InterruptType 定义：
  https://developer.huawei.com/consumer/cn/doc/harmonyos-references/arkts-apis-audio-i#interruptevent9
  https://developer.huawei.com/consumer/cn/doc/harmonyos-references/arkts-apis-audio-e#interruptforcetype9
- C API 对应（AUDIOSTREAM_INTERRUPT_FORCE/SHARE、AUDIOSTREAM_INTERRUPT_HINT_*）：
  https://gitee.com/openharmony/docs/blob/master/en/application-dev/reference/apis-audio-kit/capi-native-audiostream-base-h.md

## 4. 微信语音消息 / VoIP 通话用什么流、与媒体流的焦点关系

- **官方映射表直接点名微信**（最佳实践《音频焦点管理》）：
  - 微信语音消息 → `STREAM_USAGE_VOICE_MESSAGE`（"Voice messages (in instant messaging apps and forums)"）
  - 微信语音通话（VoIP）→ `STREAM_USAGE_VOICE_COMMUNICATION`（"VoIP voice calls, such as in-game voice calls and WeChat voice calls"）
  - 微信视频通话 → `STREAM_USAGE_VIDEO_COMMUNICATION`；微信铃声 → `STREAM_USAGE_RINGTONE`
  - 官方 VoIP 开发指导也要求：播放对端语音 usage 必须设 `STREAM_USAGE_VOICE_COMMUNICATION`。
- 与媒体流（MUSIC/AUDIOBOOK）的焦点关系（官方默认策略）：
  - **VoIP 通话开始 → 媒体被强制暂停（PAUSE，临时失焦），挂断后媒体收到 RESUME 恢复**。官方典型场景表原文：「通话接通时，音乐暂停播放。通话挂断后，音乐恢复播放。」→ 是**强制暂停，不是混播**。
  - **语音消息播放（VOICE_MESSAGE）会抢焦点**：开始→Music/AudioBook 被暂停；播完→媒体收到 RESUME。→ 语音消息**会**抢焦点（临时性）。
  - 反方向（VoIP 已在通话中，后来者）：后来的蜂窝/VoIP 通话→当前 VoIP 暂停后可恢复；voice broadcast（VOICE_ASSISTANT）**申请焦点被拒**；铃声/导航/通知→与 VoIP 并发；**语音消息、锁屏音、音视频、游戏音效、电子书播报、闹铃→只被 duck（降音量），不打断 VoIP**。
- 注意平台差异：官方最佳实践明确「手机默认互斥打断；PC 默认允许多应用混播」——同一 App 在两种设备上的打断表现不同。

来源：
- 映射表 + VoIP FAQ（含上面「后来者×VoIP」完整策略清单）：https://developer.huawei.com/consumer/cn/doc/best-practices/bpta-audio-focus-management （FAQ「VoIP 通话被打断后无法恢复怎么办」）
- 典型场景表（VoIP 通话×音乐）：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/audio-playback-concurrency
- VoIP 开发指导（usage 必须 VOICE_COMMUNICATION）：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/audio-call-development
- 华为终端客服佐证（用户侧「微信语音和音乐同时播放」是音乐 App 开了混播开关所致）：https://consumer.huawei.com/cn/support/content/zh-cn15805905/

## 5. 系统 TTS（Core Speech Kit）的出声通道与焦点控制

- `textToSpeech.TextToSpeechEngine.speak()` 的 `extraParams` 中有 **`soundChannel`（播报通道）**：官方 API 文档原文「不传参时默认为 3，**语音助手通道**」，且注明「参数范围请参考《音频流使用》（即 StreamUsage）来选择适合自己的音频场景，范围之外会播报异常」。即：**系统 TTS 内部按所选 soundChannel 对应的 StreamUsage 出声，默认走 VOICE_ASSISTANT(3) 通道**，参与焦点管理（VOICE_ASSISTANT 在 VoIP 通话中申请焦点会被拒）。
- 官方未提供直接设置 TTS 焦点策略（如 AudioSession 绑定）的参数；**官方推荐的「可控焦点」路径是 `playType: 0`（仅合成不播报、通过 `onData` 回调返回 PCM 音频流）**，应用自己把 PCM 喂给 AudioRenderer——此时 usage 完全由应用决定（可用 AUDIOBOOK 正常抢焦点，或配合 AudioSession `CONCURRENCY_MIX_WITH_OTHERS` 实现可混播/让出焦点）。`playType: 1`（默认）是合成+直接播报，焦点行为由 soundChannel 通道决定，应用不可细控。
- 「TTS 朗读想混播」的官方推荐做法：**未找到专门针对 TTS 的混播指导条目**；可引用的官方依据是上述 soundChannel/playType 参数说明 + 通用 AudioSession 混播方案（第 2 节）+ FAQ「怎么在播放音频时不打断其他 APP 音频」（答案即 AudioSession CONCURRENCY_MIX_WITH_OTHERS）。

来源：
- textToSpeech API（soundChannel 默认 3 语音助手通道、playType 0/1、onData 返回 PCM）：
  https://developer.huawei.com/consumer/cn/doc/harmonyos-references/hms-ai-texttospeech
- TTS 开发指导：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/texttospeech-guide
- 「播放音频时不打断其他 App」官方 FAQ：https://developer.huawei.com/consumer/cn/doc/architecture-guides/audio-v1_2-ts_119-0000002558722236

## 6. 官方最佳实践 / 示例代码（媒体、有声阅读类打断与恢复）

- 《音频焦点管理》最佳实践（核心文档）：默认策略四态（Stop/Pause/Duck/Mix）、流类型配置、AudioSession 自定义策略、InterruptEvent 正确处理、同应用多流焦点、跨应用冲突 FAQ、后台连续任务须接 AVSession + AUDIO_PLAYBACK 类型。
  https://developer.huawei.com/consumer/cn/doc/best-practices/bpta-audio-focus-management
- 官方配套 Sample（含 VoIP/短视频/多流场景完整代码）：https://gitcode.com/harmonyos_samples/audio-focus
- 《听书解决方案》（有声阅读类官方方案：OHAudio 原生引擎 + 后台播放 + 播控中心）：
  https://developer.huawei.com/consumer/cn/doc/best-practices/bpta-audiobook
- 「音频焦点和音频会话管理」指南目录（音频焦点介绍 + 音频会话管理两篇）：
  https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/audio-playback-concurrency
  https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/audio-session-management
- AVSession（播控中心/后台播放配套，与焦点配合使用）：见最佳实践 FAQ「后台连续任务与音频焦点」条目（同上 bpta-audio-focus-management 页内）。

## 7. 已知 Issue / 社区讨论（应用播放 × 微信语音互相打断）

- 华为官方 FAQ「怎么在播放音频时不打断其他 APP 音频」——官方承认默认会打断、给出 MIX 方案：
  https://developer.huawei.com/consumer/cn/doc/architecture-guides/audio-v1_2-ts_119-0000002558722236
- 华为终端客服：「微信或 QQ 语音消息或视频与音乐同时播放」——定性为音乐 App 开了「允许与其他应用同时播放」（即混播）开关：
  https://consumer.huawei.com/cn/support/content/zh-cn15805905/
- 华为终端客服：「三方音频应用后台播放时，打开视频类应用后声音同时播放」——同为混播开关问题（酷狗/喜马拉雅设置路径）：
  https://consumer.huawei.com/cn/support/content/zh-cn16078376/
- 社区帖（第三方，非官方，仅作参考）：
  - HarmonyOS Next 微信播语音消息时接微信电话，语音消息不中断（焦点管理缺陷讨论）：https://bbs.itying.com/topic/6941843676afc40042beb145
  - HarmonyOS Next 进入微信小程序，音乐和听书都会中断：https://bbs.itying.com/topic/690358bd5479bc0071f51b58
  - 听音乐期间被微信打断讨论：https://bbs.itying.com/topic/69bc66ccc504c50058fd58ee
  - 华为开发者论坛《轻松解决鸿蒙应用中抢占音频焦点的难题》（最佳实践宣传帖）：https://developer.huawei.com/consumer/cn/forum/topic/0204192121847778129
- **专门针对「听书 App 播放打断微信语音」的官方 Issue 单：未找到官方依据**（开发者联盟论坛无公开可检索的同主题工单帖）。

---

## 附：对诊断文档的直接建议（基于以上官方依据）

1. 听书（TTS 朗读）若用默认 usage 出声，与微信语音消息/通话互抢焦点是**系统预期行为**；诊断文档应引用第 1/4 节的默认策略表。
2. 想让出焦点/可混播的官方手段只有两个：`AudioSession.activateAudioSession({concurrencyMode: CONCURRENCY_MIX_WITH_OTHERS})`（播放前激活、退出时 deactivate，并监听 audioSessionDeactivated），或静音阶段用 `setSilentModeAndMixWithOthers`。
3. 恢复播放必须处理 `INTERRUPT_SHARE + INTERRUPT_HINT_RESUME` 时**主动调 start()**；PAUSE 与 STOP 要区分（STOP 不自动恢复）。
4. 文档中不要出现 `AUDIO_SESSION_STRATEGY_MIX`、`AudioInterruptReason.CALL_INTERUPTED` 等不存在的 API 名。
