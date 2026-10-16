**■ 掼蛋局域网版 · 修复方案文档（fix-plan）**

> 文档生成时间：2026-10-16 11:25（北京时间）
> 关联问题ID：**ISSUE-GD-AUDIT-20261016**
> 审查基线：`guandan-server.js` 2978 行 / `guandan-lan.html` 6672 行 / `局域网版使用说明.md` v2.1.3（本文所有行号均指该基线，改代码后会漂移）
> 产出方式：4 个**只读**子 Agent（代码审查 / 文档审查 / 外部技术调研 / 影响范围分析）+ 1 次真实 headless-Chrome 实测
> 本文档**只含修复/实现**；测试内容一律见 `test-strategy.md`（两份文档职责互斥、不重复）

---

**■ 一、问题诊断**

**▍ 1.1 问题概述**

| 属性 | 内容 |
|---|---|
| 问题ID | ISSUE-GD-AUDIT-20261016 |
| 发现时间 | 2026-10-16 11:07–11:22（首轮：用户报「不能建房间」→ 已修 4 处；本轮：系统性复审） |
| 影响级别 | **P0**（1 条 P0 + 12 条 P1 + 8 条 P2 + 6 条 P3） |
| 问题状态 | 待修复（本文档即修复依据） |
| 影响模块 | 连接与身份鉴权、房间/连接生命周期、局面状态机、出牌与手牌完整性、观战、管理类消息、客户端协议健壮性、项目文档与规则描述 |
| 影响面 | 全房间（局域网内任何人只要拿到页面即可作案）；不改则胜负可信度、内存占用、文档可信度三线同时失守 |

**▍ 1.2 问题描述**

本轮是**系统化复审**，不是修单个 bug。共 3 类问题：

1. **代码缺陷 27 条**（详见 1.5 表 A）。最要命的一条是 P0：**服务端从不拿连接反查身份**，所有消息只信 `data.playerId`；而 `broadcastPlayerList` 把**含 AI 在内的全员 id 广播给房内所有人** → 任何连上服务器的人都能用别人的 id 发 `play`/`pass`/`ready`/`newRound`/`chat`，**替他人出牌、冒名发言、强行开下一局**。这不是"作弊边缘"，是"胜负完全不可信"。
2. **文档缺陷 43 条**（15 条说明↔代码不一致 / 9 条缺失 / 19 条规则核对中 8 条不一致，详见表 B/C）。其中 3 条**会让用户按文档打出错牌**（进贡排除范围、抗贡条件、连对/飞机的 A 作 1）。
3. **自重启机制残留隐患**（详见表 A 第 26 条 + 1.3 深层原因第 3 点）：今天加的「nodemon 让位」判据是 `npm_lifecycle_event === 'dev'`，但 `package.json` 里还有 `npm run dev:verbose`（值是 `dev:verbose`）→ **守卫失效，双重重启撞 8081 会复现**。

**▍ 1.3 根因分析**

**直接原因（三个独立根因）**

| 编号 | 直接原因 | 证据 |
|---|---|---|
| R1 | **身份与会话没有绑定**：`playerToRoom.get(data.playerId)` / `data.roomId` 由客户端自报，服务端只在 `reconnect` 分支校验过 `p.ws === ws` | `server:2662-2734`；`play 2687-2691`、`pass 2693-2697`、`ready 2661-2664`、`newRound 2708-2711`、`chat 2733-2747` |
| R2 | **房间/连接生命周期没有单一权威**：定时器（`turnTimer`/`dealInterval`/30 秒接管）散落、`close` 只清第一个匹配身份就 `break`、解散判据两处口径不一致、无心跳 | `server:378`（`dealInterval` 是局部变量）、`2852`（`break`）、`2796-2808` vs `2494-2498`（判据不一致）、`39/2468-2476`（无心跳） |
| R3 | **牌型/状态机的边界没有兜底**：出牌收集不去重、移除阶段不校验 `idx`；回合结束不复位 `started`/不清 `turnTimer`；局间过渡期没有 phase 位 | `server:786-803`；`endRound 1582-1674`、`endRoundWithDoubleWin 1491-1580`、`startNewRound 2313-2391`；`checkStartGame 250-255` |

**深层原因**

1. **协议设计上"客户端可信"**：整个消息总线（`wss.on('connection') → switch(data.type)`，`2468-2751`）把 `playerId`/`roomId`/`spectatorId` 当作**事实**而非**声明**。OWASP 的原则是「Treat all WebSocket messages as untrusted input」「Check authorization for each action」——本案两条都没做（无 Origin 校验、无握手鉴权、每动作不复核）。
2. **状态分散在三个地方**：`rooms`（Map）+ `playerToRoom`（Map）+ 每个 `GameRoom` 内部字段，三者靠手工维护同步；一旦某条路径少写一次（如 `close` 的 `break`），就永久泄漏。正确做法是**单一权威 + 房间级资源登记表**（定时器、身份、观战者都挂在房间上，房间销毁即全清）。
3. **"自重启"有两套实现**：nodemon（外部）与内置 `fs.watch`（`2931-2977`，用 `spawn(detached+unref)` 起游离进程）并存，靠一个环境变量猜"谁在管"。这不是判据问题，是**架构上不该有两套**。
4. **文档与代码没有单一事实源**：`局域网版使用说明.md` 手抄规则与行为，`package.json` 版本号是另一套（1.5.0 vs v2.1.3），规则文档 `掼蛋.md` 只存在于 `.claude/worktrees/` 副本里 → 三处各说各话。

**影响范围**

- **受影响模块**：连接鉴权、房间生命周期、局面状态机、出牌校验、观战、管理消息、客户端协议、项目文档。
- **受影响用户**：局域网内**所有玩家**（同一 WiFi 下任何人只要拿到地址即可作案，无需账号）。
- **不受影响**：牌型核心算法（`validatePlay 450-738`、`comparePlay 740`）经核对与竞技规则一致（除 A 作 1 两处，见表 C）；手牌隔离（`getPublicGameState 416` 只发张数）正确；`addAI` 有 4 人上限双重校验。

**▍ 1.4 复现步骤（均为只读验证，不改代码）**

| 编号 | 复现步骤 | 预期 vs 实际 |
|---|---|---|
| RP-1（P0 替他人出牌） | 1) 开 `http://127.0.0.1:8081`，建房+3 个 AI 开局；2) F12 开发者工具里看 `playerList` 广播出的他人 `id`；3) 控制台执行 `ws.send(JSON.stringify({type:'play', playerId:'<他人id>', roomId:'<房号>', cards:[{suit:'♠',rank:'3'}]}))` | 预期：被拒并提示无权限。实际：**以他人身份成功出牌**（`playCards` 只按 `playerId` 找玩家） |
| RP-2（P1 伪造炸弹） | 同上建房开局后，把你手上**同一张牌**在 `cards` 里重复填 4 次发 `play` | 预期：提示无效牌型/你没有这张牌。实际：**被判为炸弹成功打出**，且服务端 `hand.splice(-1,1)`（`800-803`）删掉的是手牌最后一张 → 前端 `myHand` 与服务端错位 |
| RP-3（P1 顶座看牌） | 1) 记下某玩家昵称；2) 让该玩家断线（关标签页）；3) 30 秒内用同名 `{type:'reconnect', roomId, playerName:'<昵称>'}` 重连 | 预期：无凭据不可重连。实际：**接管该座位并拿到其完整手牌**（`2571-2581` 只按名字匹配） |
| RP-4（P1 两个同号房间） | 1) 用「包间号=1」开房（`roomCounter` 仍为 0）；2) 关掉该连接让房间释放；3) 立刻用**自定义号 9** 开房后再用自动号开房 | 预期：包间号全局唯一。实际：`customTableNumber \|\| (++roomCounter)`（`2524`）两套编号无交集检查 → **可并存两个 `tableNumber` 相同的房间** |
| RP-5（P2 全房 XSS） | 任一玩家在聊天框发 `<img src=x onerror=alert(1)>` | 预期：按文本显示。实际：**房内所有人浏览器执行**（客户端 `handleChat` 用 `innerHTML` 拼 `${displayName}: ${data.message}`，`client:5442-5451`；服务端零转义零限长 `2739/2744`） |

**▍ 1.5 相关信息**

**表 A · 代码缺陷 27 条**（`guandan-server.js` 简称 server，`guandan-lan.html` 简称 client）

| 编号 | 位置 | 级别 | 现象 | 根因 | 建议方向 |
|---|---|---|---|---|---|
| A-1 | server:2687-2712 / 2661-2664 / 2733-2747（+2456-2458） | **P0** | 拿他人 id 即可替其出牌/发言/开新局 | 服务端只信 `data.playerId`，从不反查连接归属 | 建立 ws↔身份绑定，所有 handler 用连接身份 |
| A-2 | server:786-803 | P1 | 同一张牌重复 4 次可伪造炸弹出牌；`hand.splice(-1,1)` 删错牌 | 收集时 `findIndex` 命中不去重；移除时 `idx===-1` 未判非法 | 去重 + 数量校验 + `idx` 校验 |
| A-3 | server:2571-2581 | P1 | 知道昵称即可顶座并看全手牌 | 重连凭据是公开的玩家名 | 重连令牌（token） |
| A-4 | server:2486-2524 | P1 | 两个房间可同 `tableNumber` | 自定义号与自增号两套体系无交集检查 | 统一号池 |
| A-5 | server:39 / 2468-2476 | P1 | 半开 TCP 不进 `close` → 僵尸房常年挂着 | 无 ping/pong 心跳 | ws 官方 `isAlive` 心跳（30s） |
| A-6 | server:2483-2537 + 2753-2852 | P1 | 同一 ws 可反复开房/进房持有多个身份；`close` 首个匹配即 `break`(2852) → 其余房间 `players`/`playerToRoom` 永久残留 | `createRoom`/`joinRoom` 不校验连接是否已在房；`close` 只清一项 | 先解绑旧身份；`close` 遍历全部匹配 |
| A-7 | server:1582-1674 / 1491 / 2313 / 2762 | P1 | 回合结束 `started` 仍为 true、`turnTimer` 未清 → 结算期断线者被永久转 AI；`testWin` 残留 interval 推进会 | 三条退出路径都没复位 `started` 与定时器 | 统一复位 + `clearTurnTimer()` |
| A-8 | server:250-255 / 2350-2353 / 2205 / 331 | P1 | 新一局发牌/进贡期（`started` 未置 true）4 人点准备 → 二次 `startGame()` 把 `teamLevels` 重置为 `{1:2,2:2}`，抹掉升级进度并与发牌 interval 双发 | `checkStartGame` 只判 `!started`，不区分首局与局间过渡 | 引入 `phase`/`starting` 位 |
| A-9 | server:2708-2712 / 1528-1543 | P1 | 任何人可发 `newRound` 打断进行中对局；通关分支清态不完整 → 二次 `gameOver` | `newRound` 无身份/状态校验；通关 return 前不清 `roundWinner/levelUp/previousLevel` | 校验房主+阶段；通关分支完整清态 |
| A-10 | server:2739/2744 + client:5442-5451 | P2 | 全房 XSS（昵称/聊天经 `innerHTML` 注入） | 全链路零转义、零长度上限 | 服务端限长 + 客户端 `textContent`/转义 |
| A-11 | server:2526/2546/2624 | P2 | `playerName` 无类型/长度/字符校验（对象名、超长名直入） | 入参无 schema 校验 | 统一白名单 + 长度 + 类型 |
| A-12 | server:2666-2686 / 2713-2721 | P2 | `addAI`/`testWin` 无鉴权且 `roomId` 自报 → 给他人房间塞 AI / 强制结束他人对局 | 管理消息与普通消息同一入口，无房主概念 | 仅房主 + 指定房间成员 |
| A-13 | server:39 / 2483-2537 | P2 | ws 默认 `maxPayload` **100 MiB**；无频率限制、无房间/连接上限 | 未设 `maxPayload`、无令牌桶 | `maxPayload: 64KB` + 频率限制 + 上限 |
| A-14 | server:2647-2658 / 2623-2625 | P2 | `spectatorViewPlayer` 用自报 `spectatorId` 鉴权，拿到 sid 即可拉任意玩家完整手牌 | 观战身份同样未与 ws 绑定 | 观战身份绑定 ws；视角只允许本人切换 |
| A-15 | server:2796-2808 vs 2494-2498 | P2 | 房内还有在线观战时，"players 全 AI"仍解散房间 → 观战者被静默孤立 | 两处僵尸判定口径不一致 | 解散判据纳入在线观战者 |
| A-16 | server:96-128 / 2571-2579 | P2 | 同名玩家可同房共存；重连取"第一个同名断线者" → 张冠李戴 | `addPlayer` 不校验名字唯一 | 名字唯一 + 重连凭 token |
| A-17 | server:2778-2813 | P2 | 30 秒接管回调不复查对局状态：回合已结束/房间已删仍把真人永久改 AI，并可能触发解散 | 回调只看 `disconnected`/`ws`，句柄不可取消 | 复查 `started` + 取消句柄 |
| A-18 | server:2816-2817 vs 90-94 / 852-854 | P2 | `Array.from(players.keys())`（插入序）与 `getSortedPlayerIds()`（playerNum 序）混用 → 指定座位乱序入座时"轮到该玩家才让 AI 接管"命中错误的人 → 卡回合 | 同一语义两种排序 | 统一 `getSortedPlayerIds()` |
| A-19 | server:378-400 / 1702-1721 / 2807 | P2 | `dealInterval` 是局部变量，房间解散时清不掉 → 向已删房间广播 `dealCard`；再开局则两套发牌并行 | 定时器句柄未纳入房间生命周期 | 句柄挂 room，删除路径统一清理 |
| A-20 | server:1646-1661 / 2321-2327 | P2 | 失败局（`levelUp=0`）不更新 `previousLevel*` → 下一局打 A 通关判定读到陈值 | 升级信息只在 `levelUp>0` 分支写入 | 每局结算前显式重置并统一写入 |
| A-21 | server:446 | P3 | `myInfo: {id, ...player}` 把含 `ws` 实例的整个玩家对象展开下发 | 对象展开代替显式挑字段 | 显式挑选下发字段 |
| A-22 | server:2439-2450 vs 2406-2412 | P3 | 观战两条下发路径序列化口径不同 → 观战界面手牌忽有忽无 | 一处走 `getPublicGameState`、一处走 `getSpectatorGameState` | 统一走 `getSpectatorGameState` |
| A-23 | client:2548-2690（缺 case）+ server:2770/2788 | P3 | 客户端 switch 无 `default`，`playerDisconnected`/`playerReplacedByAI` 被静默丢弃 → 看不到"队友断线/被 AI 接管" | 客户端未覆盖服务端全部 type | 补 case + default 埋点 |
| A-24 | client:2482-2485 | P3 | `onmessage` 的 `JSON.parse` 无 try/catch，坏帧抛未捕获异常 | 解析未容错 | try/catch + 计数告警 |
| A-25 | client:6618-6622 | P3 | `send()` 在非 OPEN 时静默丢包（断线期 play/pass/ready/chat 无声丢失） | 无发送队列、无失败回调 | 发送队列 + 失败提示 |
| A-26 | client:3007-3021 | P3 | 每次 `onopen` 都用 localStorage 旧 `roomId+playerName` 重连（改名后仍以旧名重连，命中 A-3）；失败只 `clearPlayerInfo`，界面仍停在原等待房 | 重连数据未与当前界面校验 | 重连前校验一致性，失败强制回大厅 |
| A-27 | server:2485-2486 | P3 | `"0"` 被当"无自定义号"；`"-5"`、`"1.5"` 被接受成负/小数房号 | 解析宽松、无范围校验 | 正整数 1..N 校验 |
| **A-28** | server:2927-2929 | **P1** | **今天加的 nodemon 让位守卫在 `npm run dev:verbose` 下失效**（`npm_lifecycle_event === 'dev:verbose'` ≠ `'dev'`）→ 双重重启撞 8081 复现 | 用环境变量的**具体值**猜"谁在管"，不覆盖同一 package.json 里的其它脚本 | 改显式开关（如 `GD_NO_SELF_RESTART=1`）；内置自重启分支不要 `spawn(detached+unref)` |

**表 B · 说明文档不一致 15 条（节选高优先级，全文见子Agent报告）**

| 编号 | 文档位置 | 代码事实 | 级别 | 建议 |
|---|---|---|---|---|
| B-1 | `说明 L470` 版本 v2.1.3 | `package.json:3` `"version": "1.5.0"` | 高 | 版本号单一来源（统一到 2.1.3） |
| B-2 | `说明 L269` 单贡「非级牌、非王」 | `server:1803-1813` 只排除红桃级牌（逢人配） | 高 | **改文档**（官方口径：仅"红心级牌除外"） |
| B-3 | `说明 L272` 抗贡「手牌只有大王、小王、级牌时可抗贡」 | `server:1795-1799` 只判 `大王 >= 2` | 高 | **改文档**（单下=本人两张大王） |
| B-4 | `说明 L458-466` 文件清单缺 4 个文件 | 实有 `guandan.test.js`/`ai-players-test.js`/`kill_node.bat`/`运行测试.bat`/`server.log`/`docs/` | 中 | 补清单；`kill_node.bat` 硬编码 `pid 22300` 已失效 → 删或改 |
| B-5 | `说明 L19` Node 14+ | `node_modules/jest` engines 要求 `^18.14.0\|\|^20\|\|^22\|\|>=24` | 中 | 改「18.14+（跑测试）/ 14+（只跑服务端）」 |
| B-6 | `说明 L71` 「普通模式需手动重启」 | `server:2931-2977` 非 nodemon 时注册内置 `fs.watch` 自重启 | 中 | 注明两种模式都有自重启；`rs` 仅 nodemon 可用 |
| B-7 | `说明 L380` 排查看控制台 | 全文件无任何写文件日志（`grep` 计数 0）；`server.log` 是 4 月遗留 | 中 | 明写"只打控制台，`server.log` 可删" |
| B-8 | `说明 L5-11` 目录锚点用全角 ＃ 前缀 | Obsidian 里锚点需半角井号 → **TOC 链接实际点不动**（全文 16 处全角 ＃ / 0 处半角井号） | 中 | 修锚点或删 TOC |
| B-9 | `说明 L155` 观战「可勾选开启」 | 静态 checkbox `checked`，`server:2523` `allowSpectator !== false` 默认开 | 低 | 改「默认开启，可取消」 |
| B-10 | `说明 L358` 「自动替换为 AI」未说时限 | `server:2777-2813` 是 **30 秒后** | 低 | 补「30 秒后」 |
| B-11 | `说明 L349-354` 「游戏卡住 → 刷新/重启服务器」 | v2.1.3 已实现自动重连 → 旧说法过时且与 L390 重复 | 低 | 合并进 v2.1.3 条目 |
| B-12 | `说明 L87` 「首次运行会自动安装依赖」放在命令行段 | 自动安装是 `.bat` 行为（`启动服务器-*.bat:8-14`） | 低 | 移到「双击 bat」段 |
| B-13 | `说明 L342-347` 端口示例 | 实际 `server:9` `const PORT = 8081` | 低 | 标注第 9 行 |
| B-14 | `说明 L49-51` 依赖列表缺 jest | `package.json` devDependencies 含 `jest ^30.2.0` | 低 | 补 jest |
| B-15 | `说明 L93` 示例 nodemon 3.0.0 | 实装 3.1.14（`^3.0.0` 合规） | 低 | 加"版本随 lock"说明 |

**表 C · 规则一致性（19 条核对，8 条不一致）**

| 编号 | 规则点 | 官方权威口径 | 本案文档 | 本案代码 | 改哪边 |
|---|---|---|---|---|---|
| C-1 | 牌数/底牌 | 2 副 108 张，**每人 27 张，无底牌** | 27 张 | `slice(i*27,(i+1)*27)` 无底牌 | 一致，不改 |
| C-2 | 顺子 | **固定 5 张**；含 2 合法；A2345 合法（A 可作 1） | 未提 2/A2345 | 已含 `[14,2,3,4,5]` | 一致，文档补一句 |
| C-3 | 连对/飞机 | 三连对固定 3 对、二连三固定 6 张不带牌；**A 可作 1 ⇒ `AA2233`/`AAA222` 合法** | 未提 A 作 1 | `pairPatterns` 自 `[2,3,4]`、`planePatterns` 自 `[2,3]` 起，注释写死"A 只能当 14" | **改代码**（按 **D-1** 裁定，见 FIX-011） |
| C-4 | 进贡排除 | **仅排除红心级牌（逢人配）**；王与其他花色级牌**可**进贡 | 「非级牌、非王」 | 只排除红桃级牌 → 与官方一致 | **改文档**（按 **D-3** 裁定，见 FIX-010） |
| C-5 | 抗贡 | **单贡=进贡人自己持 2 张大王；双贡=2 张大王都在进贡方（双下方两人）手上合计**（按 **D-2** 裁定；**无「抗还贡」**） | 「只有大王、小王、级牌时可抗贡」 | **代码已符合**：单贡 `canResistTribute`(1795-1799) 只看该进贡人；双贡 `checkDoubleDownResistWithRanks`(1776-1791) 只看输家队两人合计 | **仅改文档**（FIX-010） |
| C-6 | 还贡限制 | 官方仅限「牌点 **10（含）以下**」，未禁还级牌 | 「非级牌、非王」 | 禁王+禁级牌+`>10` 拒绝（比官方严） | **无统一口径** → 保留实现 + 文档注明 |
| C-7 | 逢人配 | 红桃级牌，可替除王以外任意牌 | 同 | `isTrump`/`逢人配不可配王` | 一致 |
| C-8 | 升级档位 | 双赢+3/中赢+2/小赢+1 | 同 | 一致 | 一致 |
| C-9 | 通关条件 | 「打过 A」 | 说明写对（必须打自己级牌且双赢） | `previousLevel===14 && levelUp===3 && isPlayingOwnLevel` | 说明对；`掼蛋.md` 漏写 → 补 |
| C-10 | 首出 | 第一局持 ♥3 先出 | 同 | 找 `♥3` | 一致 |
| C-11 | 王炸/跨类型大小/级牌>A | 4 张王最大；6 张以上炸弹压同花顺 | 同 | 一致 | 一致 |
| C-12 | 安庆/地方规则 | 官方向竞技版收敛；**未见成文"安庆地方规则"** | 自称"安庆热门扑克游戏" | 按竞技规则实现 | **无统一口径** → 以竞技规则为准并注明 |
| C-13 | `掼蛋.md` 位置 | — | 末尾 `[[掼蛋]]` 双链 | 正式库无该文件，仅在 `.claude/worktrees/agent-a4894e66/` 副本内 | **把 `掼蛋.md` 取回正式库**（否则双链断） |

> 📚 **技术来源**（规则与实现依据）：
> - [《世界掼牌（掼蛋）竞赛规则（2025）》（PDF）](https://gawsf.b-cdn.net/files/%E4%B8%96%E7%95%8C%E6%8E%BC%E7%89%8C%EF%BC%88%E6%8E%BC%E8%9B%8B%EF%BC%89%E7%AB%9E%E8%B5%9B%E8%A7%84%E5%88%99%EF%BC%882025%EF%BC%89.pdf) —— 顺子固定 5 张、A 可作 1、进贡仅排除红心级牌、抗贡=两个大王
> - [百度百科 · 竞技掼蛋竞赛规则](https://baike.baidu.com/item/%E7%AB%9E%E6%8A%80%E6%8E%BC%E8%9B%8B%E7%AB%9E%E8%B5%9B%E8%A7%84%E5%88%99/63065438) ／[《淮安掼蛋竞赛规则》全文](https://www.docin.com/p-4837581181.html) ／[总局征求意见稿全文镜像](http://www.sbtsg.org.cn/apifile_read.aspx?id=53061&appid=69)
> - [南京信息工程大学工会《"掼蛋"比赛规则》PDF](https://gh.nuist.edu.cn/_upload/article/files/e2/4e/9a5343d0450a9580fd4c1f46fc0b/290d8299-e923-4966-a485-b0269c7e11fd.pdf) —— A-2-3-4-5 最小顺子、三连对最小 AA2233

---

**▍ 1.6 规则裁定（用户拍板 · 2026-10-16）**

> 以下三条由用户（本工程所有者）明确裁定，作为规则的**唯一口径** —— 优先级高于此前引用的公开规则；实现与文档一律以此为准。

| 裁定 | 内容（用户原话） | 落地方式 | 涉及任务 |
|---|---|---|---|
| **D-1** | 「连对/飞机缺 A 可以作 1 的 `AA2233`/`AAA222`」 | **改代码**：`pairPatterns`/`planePatterns` 补 A 作 1 模式 | FIX-011 |
| **D-2** | 「抗贡：单人进贡时进贡人有两个大王，双人进贡时两个大王都在进攻方」 | **无需改代码（已逐行核对符合）**：单贡 = 该进贡人**自己**持 2 张大王（`canResistTribute` server:1795-1799）；双贡 = 2 张大王**都在进贡方（双下方两人）手上合计**（`checkDoubleDownResistWithRanks` server:1776-1791）。**仅改文档**（`说明 L272` 写错，见 FIX-010） | FIX-010（文档） |
| **D-3** | 「抗贡失败时禁止进贡红心级牌」 | **改文档**：进贡取"除红心级牌外最大的一张"（王与其他花色级牌均可进贡）。现行代码 `getMaxNonTrumpCardForPlayer`(server:1803-1813) 已符合 → `说明 L269`「非级牌、非王」是错的 | FIX-010 |

**术语标注（实现者必须先核对，写错方向会反转判定）**：D-2 里的「进攻方」按与前半句「进贡人」的并列关系，理解为**进贡方**——即"必须给贡的那一方"（单贡=进贡人本人；双贡=双下方两人）。也就是：**两张大王都握在要给贡的那一方手里**才算抗贡成功，而不是"全桌任意两家合计两张"。若本意是"受贡方（上游方）持两张大王"，则判定对象要反转，请指出，本条随即修订。**实测补充**：现行代码的实际行为就是"进贡方两人合计"，与本次理解一致；**改成"受贡方"口径才会真的需要改代码**（要把 `checkDoubleDownResistWithRanks` 的 `losers` 取值反过来）。

> 核对结论（逐行验证，非转述）：三条裁定里 **只有 D-1 需要改代码**（牌型判定缺 A 作 1 模式）；**D-2、D-3 的代码已符合**（留证见 3.4），只需改文档。因此本次裁定**未新增代码缺陷**，P1 仍为 12 条。

---

**■ 二、修复方案**

**▍ 2.1 方案对比（针对 P0 身份与会话绑定）**

| 维度 | 方案A：握手期鉴权 + ws 绑定身份（推荐） | 方案B：仅"每动作复核 ws 归属" | 方案C：仅加 Origin 白名单 |
|---|---|---|---|
| 做法 | `server.on('upgrade')` 里校验并**把 (类型,id) 绑到这条 ws**；所有 handler 用连接身份，忽略 `data.playerId` | 保留自报 id，但每个 handler 加 `p.ws === ws` 断言 | 校验 `Origin` 头，只放行 `http://<本机IP>:8081` |
| 挡住"替他人出牌/发言" | ✅ 根本挡住 | ✅ 挡住 | ❌ 完全挡不住（同源页面照样能发任意消息） |
| 挡住"顶座看牌"（A-3） | ✅（配合重连 token） | ⚠️ 只能挡在线顶替，断线窗口无效 | ❌ |
| 挡住"拉他人手牌"（A-14） | ✅（观战身份同源绑定） | ⚠️ 需要每处都补，易漏 | ❌ |
| 挡住"跨站页面连你的服务器" | ✅ | ✅ | ✅（但本案是局域网自玩，价值次要） |
| 改动量 | 中（服务端入口 + 7 个 handler + 客户端 7 个发送点） | 中（散布在 7 个 handler，容易漏） | 极小（一处） |
| 风险 | 与客户端需同批发布（本工程客户端由服务器直吐 → 天然同批） | 漏一处就等于没修 | 假安全 |

**▍ 2.2 推荐方案**

**采用「方案A + 方案C 的组合」**，理由：

1. 本案的根因是 **"身份来自消息体"**（R1）。只有把身份锚定到**连接本身**才能一次修掉 A-1/A-3/A-11/A-12/A-14 五条同源缺陷；方案B 是"打补丁式"，7 个 handler 漏任何一个都保留 P0。
2. ws 官方明确**不推荐已弃用的 `verifyClient`**，推荐在 `upgrade` 事件里做鉴权（见 2.3 来源）——正是方案A 的落点。
3. Origin 白名单（方案C）成本极低、可作纵深防御，但**必须显式决定是否放行 `null`**：实测 file:// 页面发起的握手是 `Origin: null`（opaque origin），若一刀切拒绝，用户"双击 HTML 打开"的路径会被自己的校验挡掉——而"双击 HTML"正是本工程最常见的使用方式。
4. 本工程客户端 HTML 由服务器在 `/` 直吐 → **前后端协议天然同批发布**（用户 F5 即同步），是方案A 落地成本最低的场景；唯一要兼容的是"旧标签页"（见 2.4 兼容性）。

**▍ 2.3 技术实现（按修复包）**

**P1 身份/会话绑定（FIX-006）**
- 在 `server.on('upgrade')` 里取 `req.url` 上的 token（或首次 `createRoom/joinRoom/spectateRoom` 成功后由服务端下发 token），校验通过再 `wss.handleUpgrade(...)`；失败按官方示例回 `HTTP/1.1 401 Unauthorized` + `socket.destroy()`。
- 服务端维护 `ws → { type:'player'|'spectator', id, roomId }` 绑定；`play/pass/ready/setAutoPlay/newRound/returnTribute/chat` **一律用绑定身份**，`data.playerId` 只做一致性校验（不一致直接拒绝并计一次异常）。
- 令牌用 `crypto.randomUUID()`；`roomCreated/roomJoined/reconnected` 下发 `token`，客户端存 localStorage 并在重连时带上 → 同时修掉 A-3。
- 兼容旧标签页：**过渡窗口内允许"无 token 的首次 join"**，但**不允许无 token 的 reconnect**（重连必须凭 token 或 `playerId+token` 双因子）。

**P2 观战鉴权（FIX-007a）**
- 观战者与玩家共用同一绑定基元，但**类型必须区分**（`P_`/`S_`/`AI_` 前缀 + 类型字段）；`spectatorViewPlayer` 改用绑定 sid，`viewPlayerId` 必须落在该房间玩家集合内（范围校验）。
- 客户端 `switchViewPlayer()`（`client:3655-3660`）当前把 `playerId` 塞进 `spectatorId` 字段（既有笔误）→ 改为使用服务端下发的 sid。

**P3 管理消息门禁（FIX-007b）**
- `addAI`/`testWin`/`testWinScenario` 只允许「绑定身份=房主」且「未开局」调用；`testWin` 额外要求房间处于对局中且调用者在房内。

**P4 房间/连接生命周期基座（FIX-004）**
- 新增 **房间级资源登记表**（`room.timers = { turn, deal, takeover }`），所有 `setTimeout/setInterval` 句柄登记在房间上；房间销毁走**唯一函数** `disposeRoom(roomId)`：清三个定时器 → 清 `playerToRoom` 全部匹配 → `rooms.delete` → `broadcastRoomList`。
- **心跳**照抄 ws 官方 FAQ（30s 间隔 + `isAlive` + `terminate()`，`wss.on('close')` 清 interval）。
- **包间号统一号池**：`usedTableNumbers` 集合同时容纳自定义号与自增号；`createRoom` 先查号池，自增号生成后也查池（修 A-4）；僵尸房回收由"撞号被动触发"改为**心跳+定时扫描主动回收**。
- **单身份约束**：`createRoom`/`joinRoom`/`spectateRoom` 前先解绑旧身份并把旧房间按 A-6 规则清理；`close` 遍历**全部匹配**而不再 `break`。
- **解散判据统一**：`isRoomDisposable(room)` = 无在线真人 ∧ 无在线观战者 ∧ 无在线玩家连接；`allPlayersAreAI()` 只用于"AI 是否接管完毕"，不再直接决定解散（修 A-15）。

**P5 局面状态机（FIX-008）**
- 引入显式 `phase`：`lobby → dealing → playing → tribute → roundEnd → (newRound)`；`started` 保留为派生量（`phase==='playing'`）。
- `endRound`/`endRoundWithDoubleWin`/结算与通关三条退出路径**统一**：置 `phase='roundEnd'`、清 `turnTimer`、清 `dealInterval`、通关分支完整清 `roundWinner/levelUp/previousLevel*`（修 A-7/A-9/A-20）。
- `checkStartGame` 改为只在 `phase==='lobby'` 时允许 `startGame()`；`dealing`/`tribute` 期忽略 `ready`（修 A-8）。
- `newRound` 校验：房主 + `phase==='roundEnd'`。

**P6 出牌与手牌完整性（FIX-001）**
- `playCards` 收集 `actualCards` 时用**索引占用集合**去重（同一 `hand` 下标只能用一次），数量必须等于 `cards.length`；
- 移除阶段改按已确定的下标集合一次性移除；任一下标为 `-1` 或越界 → 直接判非法，回 `playError`（保持客户端既有 `pendingPlayCards` 恢复链路不变）。
- `validatePlay` 属"牌型判定"域，本次只补 A 作 1 模式（见 FIX-011），不动其它判定。

**P7 断线/重连/AI 接管（FIX-005）**
- 重连凭 token；`reconnect` 成功后**重新绑定** ws↔身份。
- 30 秒接管回调：句柄登记到 `room.timers.takeover`，回调内**三重复查**（房间仍存在 ∧ `phase==='playing'` ∧ 该玩家仍未回连），否则直接 return；房间销毁时取消（修 A-17）。
- 位置解析统一：`close` 里的 `Array.from(room.players.keys())` 改为 `getSortedPlayerIds()`（修 A-18）。

**P8 转义 + 客户端协议健壮性（FIX-009）**
- 服务端加 `sanitizeText()`（去控制字符、限长 32）、`escapeHtml()` 用于所有含用户输入的广播字段；客户端 `handleChat`/`updatePlayerList`/`renderTableList` 改 `textContent` 或统一转义（**同批**，否则双重转义显示 `&amp;`）。
- 客户端：`switch` 补 `playerDisconnected`/`playerReplacedByAI`/`default`；`onmessage` 加 `try/catch`；`send()` 改**发送队列**（未连时入队，重连后 flush，超时给出可见提示）。
- 重连退避加**随机抖动**（`delay * (0.5 + Math.random()*0.5)`）与 `visibilitychange`/`online` 立即重试。

**P9 连接上限与限流（FIX-002）**
- `new WebSocket.Server({ server, maxPayload: 64 * 1024 })`（改前先量最大单帧：观战/重连的 `hands` 全手牌量级几十 KB，上限过小会把大广播踢成 1009 关闭 → 建议先 256KB，实测后再降）。
- 每连接消息频率限制（OWASP 起点 100 条/分钟）+ 房间数/连接数上限。

**P10 自重启治理（FIX-012）**
- 让位判据从"环境变量值"改为**显式开关**（`GD_NO_SELF_RESTART=1`，或写进 `nodemonConfig.env`），覆盖 `dev`/`dev:verbose`/`dev:watch` 全部脚本。
- 内置自重启分支**不再 `spawn(detached+unref)`**（游离进程会占着 8081 不被回收）：改为 `process.exit(0)` 交由外部（nodemon/bat 的 `--watch`）拉起，或同进程 re-listen。

**P11 文档与规则对齐（FIX-010）**

| 改动 | 内容 |
|---|---|
| 版本单一来源 | 统一 v2.1.3（改 `package.json` 或文档引用 package.json） |
| 规则描述改文档 | C-4 进贡仅排除红心级牌、C-5 抗贡=两个大王、C-9 补"必须打自己级牌且双赢" |
| 规则补代码 | C-3 连对/飞机补 A 作 1 模式（`AA2233`/`AAA222`） |
| 无统一口径标注 | C-6 还贡禁级牌、C-5 双下抗贡两说 → 文档注明"本实现采用 X，与竞技规则差异 Y" |
| 失效文件 | 删/改 `kill_node.bat`（硬编码 `pid 22300`） |
| 双链修复 | 把 `掼蛋.md` 从 `.claude/worktrees/agent-a4894e66/AI库/小游戏/掼蛋/` 取回正式库，`[[掼蛋]]` 才不断 |
| 排查指引 | 明写"服务器只打控制台、`server.log` 是 4 月遗留可删" |

> 📚 **技术来源**（实现依据，全部为官方/权威文档）：
> - [ws README · How to detect and close broken connections](https://github.com/websockets/ws) —— 30s `isAlive`/`ping`/`terminate` 官方写法
> - [ws doc/ws.md](https://github.com/websockets/ws/blob/master/doc/ws.md) —— `maxPayload` 默认 104857600、`clientTracking`、`closeTimeout`、`verifyClient` 已弃用
> - [ws README · Client authentication](https://github.com/websockets/ws) —— 在 `upgrade` 里鉴权，失败回 401 + `socket.destroy()`
> - [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html) —— Origin 白名单、每动作鉴权、`maxPayload` 64KB 建议、100 条/分钟限流起点
> - [CWE-1385 Missing Origin Validation in WebSockets](https://cwe.mitre.org/data/definitions/1385.html)
> - [MDN WebSocket() constructor](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket) —— 构造函数只有 url/protocols，不能自定义头
> - [AWS Architecture Blog: Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) ／[AWS SDK Retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) —— 指数退避+抖动
> - [websocket.org Reconnection 指南](https://websocket.org/guides/reconnection/) —— 重连期发送队列
> - [MDN visibilitychange](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) ／[MDN online event](https://developer.mozilla.org/en-US/docs/Web/API/Window/online_event)
> - [Node.js fs.watch Caveats](https://nodejs.org/api/fs.html) —— "not 100% consistent across platforms"
> - [Node.js net.html server.listen / EADDRINUSE](https://nodejs.org/api/net.html) —— "another server is already listening on the requested port"
> - [nodemon issue 1778（constant EADDRINUSE）](https://github.com/remy/nodemon/issues/1778)
> - [WHATWG WebSockets Standard](https://websockets.spec.whatwg.org/) ／[MDN Origin header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin) —— `file://` 页面 `new WebSocket('ws://')` **同步抛 SyntaxError**（本工程已实测），`Origin: null`

**▍ 2.4 风险评估**

**影响范围**

- 直接影响：`guandan-server.js`（消息入口 2477-2750、`close` 2753-2865、`createRoom/joinRoom/spectateRoom` 2483-2660、`GameRoom` 生命周期与结算路径）、`guandan-lan.html`（`send()` 6618、7 处发送点、`handleMessage` 分支、渲染转义点、重连逻辑）。
- 间接影响：`ai-players-test.js`（按 `playerId` 直发 `play` → **身份绑定改造后它会首个碎掉**，必须同步改）；`guandan.test.js`（内含牌型引擎的**第二份实现**，不引用服务端代码 → 改服务端引擎时必须同步该副本，否则两份实现分叉）；`局域网版使用说明.md`（协议/行为变化需同步）。

**副作用分析**

| 风险 | 说明 | 缓解 |
|---|---|---|
| 老标签页变砖 | 旧页面无 token，重连被拒 | 过渡窗口：无 token 的首次 join 放行；重连必须带 token；客户端失败时清缓存并提示"请刷新页面" |
| `myInfo` 泄漏新字段 | `getPlayerGameState` 用 `...player` 展开，新增 token 会随 `myInfo` 下发本人 | 改为显式挑字段（同时修 A-21） |
| `playerId` 广播面收缩的连锁 | 前端 30+ 处按 `p.id === playerId` 比对；`switchViewPlayer` 更把 `playerId` 塞进 `spectatorId` | 保留 `playerList` 里的 `id`（只读展示用），但**服务端不再以此鉴权**；先修 `switchViewPlayer` |
| 心跳误杀 | 手机切后台可能丢 pong | 30s 间隔 + 允许一次未响应；客户端加 `visibilitychange` 回前台立即补 pong（浏览器自动回 pong，无需业务代码） |
| `maxPayload` 误伤 | 观战/重连大帧被踢 1009 | 先设 256KB，实测最大帧后再收紧到 64KB |
| 一致性/顺序 | 身份绑定 + 令牌 + 状态机三批联动 | 按 3.1 的串行链 B1→B2→B3→B4 落地，每批保持可玩 |

**回滚方案**

1. **改前必备份**（沿用本工程既有约定，**备份放库外**避免被 obsidian-git 提交）：
   `mkdir -p "F:/HFF/_backup/掼蛋/<时间戳>" && cp guandan-server.js guandan-lan.html "F:/HFF/_backup/掼蛋/<时间戳>/"`
2. **单批回滚**：每批（Batch）只改少数函数，用 `git diff` 定向回滚该批触及的文件；台账（`本地文件/掼蛋/掼蛋-改动台账-*.md`）逐条记录「改哪里 / 怎么回滚」。
3. **整体回滚**：`git checkout -- "AI库/小游戏/掼蛋/guandan-server.js" "AI库/小游戏/掼蛋/guandan-lan.html"`（或 `cp` 回备份）→ `touch guandan-server.js` 触发 nodemon 重启 → 客户端 F5。
4. **协议级回滚**：身份绑定与令牌是"服务端拒权"型改动，回滚只需服务端恢复"信任 `data.playerId`"；客户端多带的 token 字段被忽略即可 → **兼容性可逆**。
5. **回滚验收**：回滚后必须确认「单实例 hold 8081 + 能正常开房开局」，避免留下游离 node 进程。

---

**■ 三、Agent 任务拆分**

**▍ 3.1 批次规划**

| Batch | 内容 | 依赖 | 并行度 | 风险 |
|---|---|---|---|---|
| **B0** | FIX-001 出牌完整性 · FIX-002 连接上限/限流 · FIX-003 结算数据复位 · **FIX-011 牌型 A 作 1（D-1）** · FIX-012 自重启治理 | 无 | 最多 2 并发（001/011 同域串行；002/003/012 可并行） | 低-中 |
| **B1** | FIX-004 房间/连接生命周期基座（定时器登记表 + 心跳 + 号池 + 单身份 + 解散判据统一） | 无（FIX-002 是加分前置） | 单任务 | 高 |
| **B2** | FIX-005 断线/重连/AI 接管（令牌 + 句柄 + 位置解析统一） | B1 | 单任务 | 高 |
| **B3** | FIX-006 身份绑定与令牌下发（P0） | B2 | 单任务（客户端改动可并行开发，同批发布） | 高 |
| **B4** | FIX-007a 观战鉴权 · FIX-007b 管理消息门禁 | B3 | 2 并发 | 中高 |
| **B5** | FIX-008 局面状态机 | B1（与 B4 并行） | 单任务 | 中高 |
| **B6** | FIX-009 转义 + 客户端协议健壮性（收尾，需错误码/消息字段定稿） | B3/B4/B5 | 2 并发（服务端转义 / 客户端渲染与队列） | 中 |
| **B7** | FIX-010 文档与规则对齐（含 `掼蛋.md` 归位、`package.json` 版本统一、`kill_node.bat` 清理） | 无（可随时做） | 1 | 低 |

**▍ 3.2 任务依赖关系图**

```
B0 (001/002/003/011/012 独立)
        │
        ▼
B1 (004 基座: 定时器/心跳/号池/单身份/判据)
        │
        ▼
B2 (005 重连与接管)
        │
        ▼
B3 (006 身份绑定+令牌) ── 客户端同批发布
        │
        ├──────────► B4 (007a 观战鉴权 ‖ 007b 管理门禁)
        │
B1 ─────┴──────────► B5 (008 局面状态机)
        │
        └──────────► B6 (009 转义+客户端协议) ← 需 B3/B4/B5 错误码定稿
B7 (010 文档) 全程可并行
```

**▍ 3.3 Agent 任务卡**

**▍ Agent 任务: FIX-001 出牌与手牌完整性（去重 + 下标校验）**

**基本信息**：级别 P1 · 影响模块 服务端出牌链路 · 依赖 无 · 风险 中

**问题描述**：`playCards` 收集 `actualCards` 时 `findIndex` 命中但不占用下标 → 同一张牌重复提交 4 次被判为炸弹；移除阶段 `hand.splice(-1,1)` 在 `idx===-1` 时删掉手牌最后一张，导致服务端与前端 `myHand` 错位（`server:786-803`）。

**修复方案**：用"下标占用集合"去重；数量必须等于 `cards.length`；移除改按已确定下标一次性删除；任一非法下标 → `playError` 回执（保持客户端 `pendingPlayCards` 恢复链路语义不变）。

**输入**：`guandan-server.js`（`playCards` 771-827、`validatePlay` 450-738 只读参考）；备份到 `F:/HFF/_backup/掼蛋/<时间戳>/`

**输出**：`guandan-server.js` 修复后的 `playCards`；`本地文件/掼蛋/掼蛋-改动台账-<日期>.md` 追加一条

**执行步骤**：① 备份 ② 建分支/改前记录 diff ③ 实现去重与下标校验 ④ `node --check` ⑤ 代码审查准备

**验收标准（不含测试）**
- [ ] 同一张牌重复提交不再被判为有效牌型（根因已消除）
- [ ] 移除阶段严格按已占用下标执行，服务端手牌张数与 `cards.length` 一致
- [ ] `node --check guandan-server.js` 通过；无新增语法/运行告警
- [ ] 既有 `playError` 回执语义未变（客户端恢复已选牌的链路不变）

**▍ Agent 任务: FIX-002 连接与消息硬上限**

**基本信息**：级别 P2 · 影响模块 连接层 · 依赖 无 · 风险 低

**问题描述**：ws `maxPayload` 默认 100 MiB（`server:39`），无频率限制、无房间/连接上限。

**修复方案**：`new WebSocket.Server({ server, maxPayload: 256*1024 })`（实测最大帧后再评估降到 64KB）；加每连接消息频率限制与房间/连接数上限；超限回可见错误而非静默丢弃。

**输入/输出**：`guandan-server.js`（39 行附近 + 消息入口加限流）；台账追加

**执行步骤**：① 先统计运行中最大单帧字节数（观战/重连场景）② 配置 `maxPayload` ③ 加轻量令牌桶 ④ `node --check`

**验收标准（不含测试）**
- [ ] `maxPayload` 生效且正常广播（含全手牌量级消息）不被误杀
- [ ] 超频连接收到明确错误码；房间数/连接数达上限时拒绝新连接
- [ ] `node --check` 通过

**▍ Agent 任务: FIX-003 结算数据复位（失败局 previousLevel）**

**基本信息**：级别 P2 · 影响模块 结算与通关判定 · 依赖 无 · 风险 低

**问题描述**：`levelUp=0`（失败局）不更新 `previousLevel/previousLevelTeam` → 下一局打 A 的通关判定读到陈值（`server:1646-1661` vs `2321-2327`）。

**修复方案**：每局结算**先行重置** `previousLevel/previousLevelTeam`，再统一写入本局结果（所有分支都写）。

**验收标准（不含测试）**：`levelUp=0` 路径也写入本局 level 信息；通关判定不再读陈值；`node --check` 通过。

**▍ Agent 任务: FIX-004 房间/连接生命周期基座（本批最重）**

**基本信息**：级别 P1 · 影响模块 房间生命周期、定时器、心跳、号池、身份清理 · 依赖 无 · 风险 高

**问题描述**：定时器散落（`turnTimer`/`dealInterval`/30 秒接管）无法统一清理；`close` 首个匹配即 `break` 导致映射残留；自定义号与自增号无交集检查；无心跳致僵尸房；解散判据两处口径不一致（`server:378/2852/2486-2524/39/2796-2808` vs `2494-2498`）。

**修复方案**：
1. 新增 `room.timers = {turn, deal, takeover}` 登记表 + 唯一销毁函数 `disposeRoom(roomId)`（清三个定时器 → 清 `playerToRoom` 全部匹配 → `rooms.delete` → `broadcastRoomList`）。
2. 心跳照抄 ws 官方 FAQ（30s `isAlive`/`ping`/`terminate`，`wss.on('close')` 清 interval）。
3. 统一号池 `usedTableNumbers`（自定义与自增都进池、都查重）；僵尸回收改由心跳驱动的定时扫描主动执行。
4. 单身份约束：`createRoom/joinRoom/spectateRoom` 前先解绑旧身份并清理旧房；`close` 遍历全部匹配。
5. `isRoomDisposable(room)` 统一判据（无在线真人 ∧ 无在线观战者）。

**验收标准（不含测试）**
- [ ] 房间销毁后三个定时器均不再触发（无对已删房间的广播）
- [ ] 心跳 30s 生效：半开连接一周期内被 `terminate` 并走断线清理
- [ ] 同一 ws 反复开房/进房后 `playerToRoom` 与 `rooms` 无残留（多次操作后两表一致）
- [ ] 号池保证任意时刻 `tableNumber` 全局唯一
- [ ] `node --check` 通过；无新增告警

**▍ Agent 任务: FIX-005 断线/重连/AI 接管**

**基本信息**：级别 P1 · 影响模块 断线链路 · 依赖 FIX-004 · 风险 高

**问题描述**：重连仅凭玩家名可顶座看牌（`server:2571-2581`）；30 秒接管回调不复查对局状态、句柄不可取消（`2778-2813`）；位置解析混用插入序与 playerNum 序（`2816-2817` vs `90-94`）。

**修复方案**：① 重连凭证改为 token（与 FIX-006 同源），成功后重新绑定 ws↔身份；② 接管句柄登记 `room.timers.takeover`，回调内三重复查（房间在 ∧ `phase==='playing'` ∧ 仍未回连），房间销毁即取消；③ 统一 `getSortedPlayerIds()`。

**验收标准（不含测试）**：无 token 的重连被拒；对局中回连可恢复原手牌与座位；结算/新局期不产生任何 AI 接管副作用；无残留定时器；`node --check` 通过。

**▍ Agent 任务: FIX-006 身份绑定与令牌下发（P0 核心）**

**基本信息**：级别 **P0** · 影响模块 消息入口 + 客户端协议 · 依赖 FIX-005 · 风险 高

**问题描述**：服务端只信 `data.playerId`，且 `broadcastPlayerList` 广播全员 id → 可替他人出牌/发言/开新局（`server:2456-2458/2662-2734`）。

**修复方案**：
1. `server.on('upgrade')` 里做握手鉴权与绑定（不用已弃用的 `verifyClient`）；失败回 `401` + `socket.destroy()`。
2. 服务端维护 `ws → {type, id, roomId}`；7 个动作 handler 一律使用绑定身份，`data.playerId` 仅做一致性校验。
3. `roomCreated/roomJoined/reconnected` 下发 token；客户端存入 localStorage，重连与后续消息携带。
4. 过渡窗口：无 token 的首次 join 放行，无 token 的 reconnect 拒绝（老标签页提示刷新）。

**输入**：`guandan-server.js`（消息入口 2477-2750、`createRoom/joinRoom` 2483-2561、`reconnect` 2563-2616）；`guandan-lan.html`（`send()` 6618、发送点 5538/5601-5625/6597/6609、`savePlayerInfo` 2991、`tryReconnect` 3007-3021）
**输出**：两个源文件 + 台账；`ai-players-test.js` 如被破坏需同步改为带 token（同批）

**执行步骤**：① 备份 ② 服务端绑定与鉴权 ③ 客户端携带 token 与失败提示 ④ `node --check`（服务端 + 抽取内联脚本）⑤ 代码审查准备

**验收标准（不含测试）**
- [ ] 用他人 `playerId` 发 `play/pass/ready/newRound/chat` 一律被拒并返回明确错误
- [ ] 房内全员 `id` 仍可用于展示（列表不破），但不再具备鉴权效力
- [ ] 无 token 的 `reconnect` 被拒；带 token 的正常重连可恢复
- [ ] 服务端与客户端内联脚本 `node --check` 均通过；无新增告警

> 测试验证见 `test-strategy.md`，本文档不含测试内容。

**▍ Agent 任务: FIX-007a 观战鉴权 / FIX-007b 管理消息门禁**

**基本信息**：级别 P2/P2（组合风险 中高） · 依赖 FIX-006 · 风险 中

**问题描述**：`spectatorViewPlayer` 信任自报 `spectatorId`、`viewPlayerId` 无范围校验 → 拿 sid 即可拉任意人手牌（`server:2647-2658`）；`addAI`/`testWin` 无鉴权且 `roomId` 自报 → 可给他人房间塞 AI / 强制结束他人对局（`2666-2686/2713-2721`）。

**修复方案**：观战身份与 ws 绑定、类型显式区分（P/S/AI）、`viewPlayerId` 必须属于本房玩家；`addAI`/`testWin` 仅房主且限定阶段；客户端 `switchViewPlayer`（`client:3655-3660`）改用服务端下发的 sid。

**验收标准（不含测试）**：伪造 sid 无法拉取他人手牌；非房主调用 `addAI`/`testWin` 被拒；观战视角切换在客户端仍可用；`node --check` 通过。

**▍ Agent 任务: FIX-008 局面状态机（phase 化）**

**基本信息**：级别 P1 · 影响模块 结算/开局/新局 · 依赖 FIX-004（与 FIX-007 并行） · 风险 中高

**问题描述**：回合结束不复位 `started`/不清 `turnTimer`（`1582-1674/1491/2313/2762`）；局间过渡期再 `ready` 会二次 `startGame()` 抹掉升级进度（`250-255/331`）；`newRound` 无校验可打断对局、通关分支清态不完整（`2708-2712/1528-1543`）。

**修复方案**：引入 `phase`（lobby/dealing/playing/tribute/roundEnd），`started` 由 phase 派生；三条退出路径统一复位并清定时器；`checkStartGame` 只在 `phase==='lobby'` 允许开局；`newRound` 校验房主 + `phase==='roundEnd'`；通关分支完整清 `roundWinner/levelUp/previousLevel*`。

**验收标准（不含测试）**：结算/发牌期断线不产生 AI 接管；过渡期连点准备不会二次开局或重置等级；非房主 `newRound` 被拒；通关只广播一次 `gameOver`；`node --check` 通过。

**▍ Agent 任务: FIX-009 转义与客户端协议健壮性（收尾）**

**基本信息**：级别 P2 · 影响模块 服务端广播字段 + 客户端渲染/协议 · 依赖 FIX-006/007/008 · 风险 中

**问题描述**：昵称与聊天经 `innerHTML` 注入（全房 XSS，`server:2739/2744` + `client:5442-5451`）；客户端 `switch` 缺 `playerDisconnected`/`playerReplacedByAI` 与 `default`（`client:2548-2690`）；`JSON.parse` 无 try/catch（`2482-2485`）；`send()` 静默丢包（`6618-6622`）。

**修复方案**：服务端 `sanitizeText()`（限长 32 + 去控制字符）+ `escapeHtml()`；客户端渲染改 `textContent`/统一转义（**与上文同批**）；补 `case` 与 `default`；`onmessage` 包 `try/catch`；`send()` 改发送队列 + 失败可见提示；重连退避加抖动与 `visibilitychange`/`online` 立即重试。

**验收标准（不含测试）**：含 HTML 的昵称/聊天在页面按文本显示（不产生任何脚本执行）；断线/被接管有可见提示；坏帧不再抛未捕获异常；未连接时操作有明确提示而非静默；`node --check` 通过。

**▍ Agent 任务: FIX-010 文档与规则对齐**

**基本信息**：级别 P2 · 影响模块 文档 · 依赖 无 · 风险 低

**修复方案**：按表 B/表 C 与 1.6 裁定执行——版本单一来源；**改文档**：进贡只排除红心级牌（D-3）、抗贡条件按 D-2 重写（单贡=进贡人本人持两张大王；双贡=两张大王都在进贡方两人手上合计）、通关描述补"必须打自己级牌且双赢"；**改代码**：仅连对/飞机 A 作 1（D-1，见 FIX-011）——抗贡口径与进贡排除范围**代码已符合，不要改**（留证见 3.4）；用户未裁定的口径（还贡是否禁级牌、无成文安庆地方规则）按"实现 + 注明差异"处理；删/改失效的 `kill_node.bat`；把 `掼蛋.md` 从 `.claude/worktrees/agent-a4894e66/AI库/小游戏/掼蛋/` 取回正式库（修复 `[[掼蛋]]` 双链）；补「服务器只打控制台」一节。

**验收标准（不含测试）**：说明文档与代码/`package.json` 版本一致；表 B 的 15 条全部闭环；表 C 的 8 条不一致全部有明确归属（改码或改文档或标注口径）；`[[掼蛋]]` 在正式库可解析；文档保持库内排版规范（■/▍、无半角井号）。

**▍ Agent 任务: FIX-011 牌型补齐 A 作 1（引擎）**

**基本信息**：级别 P2 · 影响模块 牌型判定 · 依赖 无（与 FIX-001 同域，建议串行） · 风险 中

**问题描述**：`pairPatterns` 自 `[2,3,4]` 起、`planePatterns` 自 `[2,3]` 起，注释写死"A 只能当 14" → 漏判 `AA2233`（三连对）与 `AAA222`（二连三）—— 与"世界2025 竞赛规则 A 可作 1"冲突。

**修复方案**：按 **D-1** 裁定补 A 作 1 模式 —— `pairPatterns` 头部补 `[14, 2, 3]`（即 `AA2233`，天然取 `value = pattern[2] = 3`，是最小连对）、`planePatterns` 头部补 `[14, 2]`（即 `AAA222`，`value = pattern[1] = 2`）；两处都沿用既有 `needTrump`/逢人配补齐逻辑，不新增分支。`guandan.test.js` 内含引擎的**第二份实现**，必须同步补齐同一批牌型模式（否则两份实现分叉）。

**验收标准（不含测试）**：`AA2233`/`AAA222` 被判定为合法牌型；既有 5 张顺子/连对/飞机判定无回归；服务端与副本引擎**内容同源**（新增牌型在本文件与副本中都存在）；`node --check` 通过。

**▍ Agent 任务: FIX-012 自重启治理**

**基本信息**：级别 P1 · 影响模块 启动/重启链 · 依赖 无（建议与 FIX-004 同批前置） · 风险 低-中

**问题描述**：让位判据 `npm_lifecycle_event === 'dev'` 在 `npm run dev:verbose` 下失效（值为 `dev:verbose`）→ 双重重启抢 8081；内置分支用 `spawn(detached+unref)` 起游离进程，失败后仍占端口。

**修复方案**：改显式开关（`GD_NO_SELF_RESTART=1` 或写进 `nodemonConfig.env`），覆盖所有 nodemon 脚本；内置自重启分支不再 `spawn(detached+unref)`，改 `process.exit(0)` 交外部拉起或同进程 re-listen。

**验收标准（不含测试）**：`npm run dev`、`npm run dev:verbose`、`npm start`、直接 `node guandan-server.js` 四种启动方式下，一次文件保存**只产生一个** node 进程、无 `EADDRINUSE`、无游离进程占用 8081。

---

**▍ 3.4 规则裁定中「已核对无需改动」的项（留证 · 别顺手改坏）**

> 结论来自对 `guandan-server.js` 的**逐行核对**（非转述）：D-2、D-3 的代码**已经是对的**，只有文档写错。改动这两处只会引入回归。

| 裁定 | 核对结论 | 证据（现行代码） |
|---|---|---|
| **D-2 抗贡口径** | **已符合**：单贡只看该进贡人自己；双贡只看**进贡方（双下方两人）手上合计** —— 代码里**不存在**"全桌/两队合计"的统计 | 单贡：`canResistTribute(playerId)` server:1795-1799（`hand.filter(c => c.rank === '大王').length >= 2`）；双贡：`checkDoubleDownResistWithRanks(lastRanks)` server:1776-1791（`const losers = lastRanks.filter(p => p.team === loserTeam)`，只累加输家队两人的大王） |
| **D-3 进贡排除范围** | **已符合**：进贡取"除红心级牌外最大的一张"，**王与其他花色级牌均可进贡**；红心级牌（逢人配）永不被取 | `getMaxNonTrumpCardForPlayer(playerId)` server:1803-1813（只过滤 `c.suit === '♥' && c.rank === trumpRank`，再取 value 最大） |

> 这两项不需要代码改动，只需把说明文档改对（见 FIX-010）。对应的验证用例（`test-strategy.md` 的 UT-11/UT-12、IT-09、V-014/V-015）定位为**规则符合性回归守卫** —— 防止后续改牌型/进贡链路时把这两处改坏。

---

**■ 四、实施计划**

**▍ 4.1 阶段划分**

| 阶段 | 任务 | 产出（实现层） |
|---|---|---|
| 阶段1（B0） | FIX-001、FIX-011、FIX-002、FIX-003、FIX-012 | 出牌完整性、牌型补齐（D-1）、连接上限、结算复位、重启链治理 |
| 阶段2（B1） | FIX-004 | 房间/连接生命周期基座（定时器登记表、心跳、号池、单身份、判据统一） |
| 阶段3（B2） | FIX-005 | 重连令牌 + 接管回调复查与取消 + 位置解析统一 |
| 阶段4（B3） | FIX-006 | 身份绑定与令牌下发（P0 关闭） |
| 阶段5（B4/B5） | FIX-007a、FIX-007b、FIX-008 | 观战鉴权、管理消息门禁、局面状态机 phase 化 |
| 阶段6（B6） | FIX-009 | 转义与客户端协议健壮性 |
| 阶段7（B7） | FIX-010 | 文档与规则对齐（可与阶段1 并行启动，收尾前完成） |

**▍ 4.2 发布计划**

- **发布形态**：本工程为局域网自托管，**客户端由服务器在 `/` 直吐** → 服务端更新后用户 **F5** 即拿到同版本客户端，天然同批。
- **发布窗口**：每次改动都会触发 nodemon 重启并**清空所有房间** —— 必须在无人在玩时发（或提前告知玩家"会掉线，页面会自动重连但房间要重建"）。
- **分批发布顺序**：B0、B1 可独立发布（对玩家无感）；**B2+B3 必须同批发布**（协议变更，客户端与服务端强耦合）；B4/B5/B6 可分开发布但每批之间都要保证"仍能正常开房开局"。
- **发布后自检**（实现层）：单实例 hold 8081、能开房/进房/开局、`roomList` 无僵尸房、控制台无 `EADDRINUSE`。
- **回滚触发条件**：出现无法开房/开局、服务端异常退出、游离进程占端口 → 立即按 2.4 回滚该批。

> 各阶段对应的测试计划（单元/集成/回归/场景）、验收通过标准与 FIX 映射，见 `test-strategy.md`。
