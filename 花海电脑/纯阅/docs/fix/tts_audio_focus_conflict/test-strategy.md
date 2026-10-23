# 验证测试策略初稿：听书音频焦点冲突（FIX-AF）

> 关联问题: FIX-AF-000（听书打断微信语音/畅聊语音）
> 生成时间: 2026-10-18（同日按用户拍板语义原地修订：自动暂停让路 + 自动恢复，不做混播开关）
> 文档性质: 初稿（供后续详细测试文档展开）
> ❗本域全部行为**只能真机验**（模拟器不做焦点校验）；判据以 `afoc|` 日志序列为准，截图只作静态佐证。

---

## 一、测试范围

### 1.1 受影响模块

| 模块 | 修改类型 | 测试优先级 |
|------|----------|------------|
| `BookSpeaker.ets` 渲染器生命周期（ensureRenderer/recreateRenderer/release） | 新增 audioInterrupt 监听 | 高 |
| `BookSpeaker.ets` 段推进（startTick/pump/预取） | 新增 focusPaused 态闸门 + 暂停清预取 | 高 |
| `Reader.ets` 长时任务保活链（onBgTaskStopped/每段补申请/心跳/回前台） | 焦点暂停期挂起重申请；恢复后重新申请 | 高 |
| 后台保活（已定案红线能力） | 回归 | 高 |
| 进度落库（红线） | 焦点暂停瞬间落库、恢复不回章首 | 高 |

### 1.2 功能点清单（定案语义：对方播→听书停；对方完→听书续）

- [ ] 听书中播微信语音消息 → 听书自动暂停；语音放完 → 自动恢复续播
- [ ] 听书中畅聊语音通话 → 通话期间听书暂停；挂断 → 自动恢复
- [ ] 听书中接听蜂窝电话 → 暂停；挂断 → 自动恢复 + 长时任务重新申请成功
- [ ] 听书中闹铃响起 → 暂停；闹铃停止/关闭 → 自动恢复（若个别机型以 STOP 到达则保持暂停、用户手动续，如实记录）
- [ ] 焦点暂停期间：tick 停、高亮停、预取清、无 9800005 重试刷屏
- [ ] STOP 型中断（永久失焦）不自动恢复（官方语义）
- [ ] 常量 `FOCUS_PAUSE=false` → 行为与改前逐字一致（回退验证）
- [ ] 蓝牙切设备重建渲染器后监听仍生效
- [ ] 锁屏后台连续播放 ≥15 分钟不断（红线回归）
- [ ] 焦点暂停瞬间落库一次进度；恢复后强杀重开位置正确（进度铁律）

---

## 二、测试类型

### 2.1 单元测试（离线门禁）

| 测试项 | 测试内容 | 优先级 |
|--------|----------|--------|
| UT-AF-01 | `diag_log_reset_selftest.py` 新增断言：`on('audioInterrupt')` 注册、`afoc|` 字段串、`pauseForFocusLoss`/`resumeFromFocus`/`isFocusPaused` 存在（源码字符串抽取） | 高 |
| UT-AF-02 | 反向对照：`git show HEAD:BookSpeaker.ets` 旧码跑同一断言必须报红 | 高 |
| UT-AF-03 | 保活四处补申请入口均含 `isFocusPaused()` 闸（源码抽取，锚点窗口 ≥3000 字符，防过期误报） | 高 |
| UT-AF-04 | 常量开关 `FOCUS_PAUSE=false` 路径静态可辨（监听注册与暂停动作均在闸内） | 中 |

**边界条件**:
- [ ] `recreateRenderer()` 后监听器唯一（不重复注册 → 无两条 `afoc|` 同刻重复）
- [ ] `release()` 后监听 off（无泄漏）
- [ ] 焦点暂停时预取缓冲已清（恢复不播旧 PCM）
- [ ] 焦点暂停期间收到 `onBgTaskStopped` 不触发重申请
- [ ] FORCE 与 SHARE 两种 forceType 到达时暂停动作幂等（系统已停/未停都不出错）

### 2.2 集成测试（真机）

| 测试项 | 测试场景 | 涉及模块 |
|--------|----------|----------|
| IT-AF-01 | 听书 → 播微信语音消息（连播 3 条）→ 每条：`afoc|` begin/pause→resume 序列完整、恢复 ≤1s 出声 | BookSpeaker+系统 |
| IT-AF-02 | 听书 → 畅聊语音通话（≥30s）→ 挂断：同上 + `startBackgroundRunning OK` 重现 | BookSpeaker+Reader 保活 |
| IT-AF-03 | 听书 → 蜂窝来电振铃→接听→挂断：PAUSE→RESUME 全链 + 进度不丢（强杀重开验证） | 全链 |
| IT-AF-04 | 听书 → 闹铃响→关闭：暂停→恢复；记录实际 hint（pause 还是 stop） | BookSpeaker |
| IT-AF-05 | 焦点暂停 30s：`startBackgroundRunning` 尝试数 = 0（挂起闸生效） | Reader |
| IT-AF-06 | 蓝牙播放中来电→挂断→切回扬声器：重建渲染器后 `afoc|` 仍可触发 | recreateRenderer |

### 2.3 回归测试

- 核心功能: 锁屏后台连续播放 ≥15 分钟（`sp:on audio:live`、无 Freeze）；段间预取 `PREFETCH_NEXT` 行为不变（`pfx take` 提前量正常）；高亮跟读/进度逐段递增落库。
- 关联功能: `FOCUS_PAUSE=false` 对拍改前行为逐字一致；哑巴段跳过、silentstorm 重建不受影响；`check_both.py` 双包编译。

### 2.4 场景测试（用户视角）

| 场景 | 操作步骤 | 预期结果 |
|------|----------|----------|
| 场景1 | 听《剑来》滚动模式，连播 3 条微信语音消息 | 每条语音完整可听；听书即停、每条放完自动续，位置不跳 |
| 场景2 | 听书中发起畅聊语音 1 分钟挂断 | 通话全程对方听得清；挂断后听书自动续播 |
| 场景3 | 锁屏听书 20 分钟，中途一次来电 | 不断播；来电期间暂停、挂断续播 |
| 场景4 | 听书中定 1 分钟后闹钟，铃响后关闭 | 铃响即停、铃停即续（或 STOP 到达则保持暂停并如实记录） |

---

## 三、验收标准

### 3.1 必须通过
- [ ] 原问题不可复现：四类触发（语音消息/畅聊/电话/闹铃）下对方声音完整可听，听书自动暂停
- [ ] 对方结束后听书自动恢复出声（无"界面播放中但无声"假播）
- [ ] 焦点暂停期间零 9800005 重试刷屏
- [ ] 后台保活红线回归通过（锁屏 ≥15 分钟）
- [ ] 进度零丢失（暂停落库、恢复续走、强杀重开位置正确）
- [ ] 门禁全套 GREEN + 反向对照 RED；`check_both.py` 双包过

### 3.2 建议通过
- [ ] 闹铃场景 hint 实测记录（pause vs stop）回写 fix-plan §2.2
- [ ] 恢复时延 p95 ≤1s（`afoc|` 时间戳统计）
- [ ] DUCK 型场景（导航播报）行为合理（不崩不卡，只记日志）

### 3.3 验证点清单

| 编号 | 验证点 | 验证方法 | 通过标准 |
|------|--------|----------|----------|
| V-001 | 中断事件被捕获 | `grep -a 'afoc|' tts_diag.txt` | 蜂窝来电必出现 begin+pause/stop（量具自证，先于矩阵） |
| V-002 | 暂停动作执行 | `afoc|paused` + tick 停止（`seg|` 行停增） | 触发即停，高亮不动 |
| V-003 | 恢复动作执行 | `afoc|resumed` 行 + 实听 | 对方结束 ≤1s 出声 |
| V-004 | 保活挂起闸 | 焦点暂停窗口内 `startBackgroundRunning` 尝试数 | =0 |
| V-005 | 回退开关 | `FOCUS_PAUSE=false` 包重复场景1 | 与改前行为逐字一致 |
| V-006 | 闹铃 hint | IT-AF-04 日志 | 记录实测值，不猜 |

---

## 四、测试建议

### 4.1 扩展方向
1. **测试数据准备**：固定一本长章书（《剑来》）+ 已配微信账号的真机 + 闹钟计划；蓝牙耳机一副（IT-AF-06）。
2. **自动化**：`afoc|` 序列可写脚本汇总（仿 `scroll_trace_analyze.py`：每场景输出事件时间线 + 暂停/恢复时延）；场景驱动需真人拨微信/接电话，保持手工 + 日志判据。
3. **性能**：监听器为事件驱动，无轮询；确认 `afoc|` 日志走攒批 dlog 不引入段界卡顿（段界指标不劣化）。
4. **安全/合规**：无新权限（audioInterrupt 免权限）；不涉及 `@@BOOKSOURCE@@` 裁剪块，上架版无影响。

### 4.2 注意事项
- ❗量具先自证：装机后先跑蜂窝来电场景确认 `afoc|` 能出现，再跑其余三场景（量具看不见的现象如实报「没看见」）。
- ❗`tts_diag.txt` 每次开播 TRUNC ⇒ 四场景分段 recv。
- ❗一次只装一个变体；装机包 md5 当场记录；取证前先做装机包溯源、别为取证重装。
- ❗`InterruptHint.INTERRUPT_HINT_STOP` 不自动恢复是官方语义，测试时别把「STOP 后没续播」当 bug 报；闹铃若实测以 STOP 到达，回写 fix-plan 并单独议。
- ❗真机 A/B 比较口径：同书、同模式、同设备；改前包要能复现症状（无 `afoc|` 行、假播）才算有效对照。

---

## 五、参考信息

**相关代码文件**:
- `entry/src/main/ets/utils/BookSpeaker.ets`（渲染器 :1322-1341、pump :1513、release :564、recreateRenderer）
- `entry/src/main/ets/pages/Reader.ets`（保活链 :4138-4300、AVSession :4751、toggleSpeech :3667）
- `entry/src/main/module.json5`（backgroundModes / KEEP_BACKGROUND_RUNNING）

**相关文档**:
- 修复方案: 同目录 `fix-plan.md`
- 官方依据调研: 同目录 `调研纪要-harmonyos-audio-focus.md`
- 官方: audio-playback-concurrency 指南、bpta-audio-focus-management、arkts-apis-audio-audiorenderer#onaudiointerrupt9
