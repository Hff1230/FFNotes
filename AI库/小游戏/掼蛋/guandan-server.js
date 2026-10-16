// 掼蛋局域网服务器 - 支持HTTP和WebSocket
// 运行方式: node guandan-server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 8081;

// ==================== FIX-002: 连接与消息硬上限（可调常量） ====================
// ws 的 maxPayload 默认 100MiB（ws 文档默认 104857600）——局域网小游戏不需要这么大。
// OWASP WebSocket Cheat Sheet 的建议值是 64KB；但观战/重连会下发含「全部手牌」的大帧，
// 上限过小会把正常大广播踢成 1009 关闭，所以先取 256KB 留余量。
//   ▶ 先量后定（离线构造的真实形状量测，2026-10-16）：
//       全场状态+全手牌(4 家 x 27 张, 观战/重连最坏帧) = 11.1 KB
//       roundEnd 结算广播 = 0.3 KB；仅 4 家手牌数组 = 9.7 KB
//       → 最大单帧 ≈11 KB，256KB 上限余量 ≈23x；64KB（OWASP 值）余量也有 ≈5.7x。
//   ▶ 收紧到 64KB 的判据与做法（需实机复测运行峰值，别只看离线值）：
//       a) 在 wss.on('connection') 的 message 入口临时打印 msg.length；或
//       b) 在 broadcast() 里统计 JSON.stringify 后的字节数峰值（含观战/重连下发）；
//       c) 实机峰值若仍 < 32KB，即可把 MAX_WS_PAYLOAD_BYTES 收紧到 64 * 1024（OWASP 建议值）。
const MAX_WS_PAYLOAD_BYTES = 256 * 1024;   // 单帧硬上限（先 256KB，实测后可收紧到 64KB）
const MAX_ROOMS = 200;                     // 房间数上限（rooms 是单进程内存态 Map）
const MAX_CONNECTIONS = 200;               // 同时在线连接数上限（含观战连接）
const MSG_RATE_PER_MINUTE = 100;           // 每连接消息频率上限（OWASP 起点：100 条/分钟）
const MSG_RATE_BURST = 60;                 // 令牌桶突发容量（够一局内正常出牌/聊天连发）
const MSG_RATE_REFILL_PER_SEC = MSG_RATE_PER_MINUTE / 60; // 令牌补充速率 ≈1.667 个/秒

// ==================== FIX-009: 用户输入清洗 / 转义 ====================
// 昵称、聊天等一切「用户可控文本」在**入口**统一清洗：限长 + 去控制字符（NUL/CR/LF、
// 零宽字符、双向控制符等），避免超长串打爆广播帧、控制字符污染终端日志与前端布局。
const MAX_NAME_LEN = 16;   // 昵称上限
const MAX_CHAT_LEN = 200;  // 聊天单条上限

function sanitizeText(text, maxLen = MAX_NAME_LEN) {
    if (text === null || text === undefined) return '';
    let s = String(text);
    // ① 换行/制表等「空白类」控制字符折成单个空格（避免把两个词粘成一个）
    s = s.replace(/[\r\n\t\v\f\u0085\u2028\u2029]+/g, ' ');
    // ② 其余控制字符（C0/C1）与零宽/双向控制符直接删除（保留可打印字符与 emoji）
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
    // ③ 折叠连续空格 → trim → 限长
    s = s.replace(/ {2,}/g, ' ').trim();
    if (s.length > maxLen) s = s.slice(0, maxLen);
    return s;
}

// HTML 转义：作用在**出线那一层**（见 chat 广播）。转义后线路上就是 HTML 失活文本，
// 任何消费者（含不许改的老页面 / 非本客户端）拿到都不会执行 —— 与客户端的 textContent
// 构成两层防护（客户端只对自己的渲染负责，服务端对这串字节负责）。
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==================== HTTP服务器 ====================
const server = http.createServer((req, res) => {
    console.log(`HTTP请求: ${req.url}`);

    if (req.url === '/' || req.url === '/index.html') {
        // 返回游戏页面
        const htmlPath = path.join(__dirname, 'guandan-lan.html');
        fs.readFile(htmlPath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('游戏文件未找到');
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            res.end(data);
        });
    } else if (req.url === '/favicon.ico') {
        res.writeHead(204);
        res.end();
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// ==================== WebSocket服务器 ====================
// FIX-006: 改 noServer —— 握手鉴权必须自持 server.on('upgrade')（ws 官方推荐，verifyClient 已弃用）。
// maxPayload 上限（FIX-002）与 clientTracking 等行为不变，只是握手改由下方 upgradeAuth 把关。
// FIX-012b: wss 的构造与事件挂载抽成 createWebSocketServer() —— 同进程原地重启必须
// 「关掉旧 wss → 重新 new 一个」（WebSocket.Server 一旦 close 就不能再复用），
// 所以这里改为 let，并把连接处理器写成具名函数 onWsConnection（函数声明提升，下方定义）。
let wss = createWebSocketServer();

function createWebSocketServer() {
    const s = new WebSocket.Server({ noServer: true, maxPayload: MAX_WS_PAYLOAD_BYTES });
    s.on('connection', onWsConnection);
    // 心跳定时器随 wss 生命周期收口：wss 关闭即停表（原地重启时会重新挂一张新表）
    s.on('close', () => {
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    });
    return s;
}

// ==================== FIX-006: 握手(upgrade)阶段鉴权与绑定 ====================
// ws 官方明确不推荐已弃用的 verifyClient，推荐在 server.on('upgrade') 里做鉴权（方案 A）。
// 浏览器 WebSocket 构造函数**不能自定义请求头**，所以令牌只能放在握手 URL 的查询串里。
// 决策（完整结论见台账「协议变更说明」）：
//   ① 无 token          → 放行。过渡窗口：首次 createRoom/joinRoom 之前本来就没有令牌。
//   ② token 格式非法     → 401 + socket.destroy()（伪造令牌的硬拒绝路径）。
//   ③ 格式合法但未登记   → 放行并标记 stale。原因：本工程 nodemon 每次保存源码都重启，内存态
//      令牌必然全部失效；若此处也硬 401，客户端会陷入「连不上 → 自动重连 → 又 401」的死循环，
//      页面永远回不来。真正的拒绝发生在 reconnect（AUTH_FAILED，且不下发任何手牌）与动作鉴权。
//   ④ Origin            → 只记录、不拒绝（Origin 不是安全边界且可伪造；file:// 页面本就连不上
//      ws://（构造函数同步抛错、客户端已弹红条拦截）；局域网 IP 访问的 Origin 需枚举本机全部 IP，
//      白名单极易误杀正常用户。真正的门禁是令牌 + ws↔身份绑定）。
function upgradeAuth(req) {
    const origin = (req.headers && req.headers.origin) ? req.headers.origin : null;
    let q = {};
    try {
        const u = new URL(req.url || '/', 'http://localhost');
        q = Object.fromEntries(u.searchParams.entries());
    } catch (e) { q = {}; }
    const token = (typeof q.token === 'string' && q.token) ? q.token : null;
    if (!token) return { ok: true, mode: 'anon', origin, token: null, ident: null };
    if (!UUID_RE.test(token)) {
        return { ok: false, code: 'BAD_TOKEN_FORMAT', message: '令牌格式非法', origin, token };
    }
    const ent = sessionTokens.get(token);
    if (!ent) return { ok: true, mode: 'stale-token', origin, token, ident: null };
    return {
        ok: true, mode: 'token', origin, token,
        ident: { type: ent.type, id: ent.id, roomId: ent.roomId }
    };
}

server.on('upgrade', (req, socket, head) => {
    const gate = upgradeAuth(req);
    if (!gate.ok) {
        console.log(`⛔ 握手被拒(${gate.code}): url=${req.url} origin=${gate.origin || 'null'}`);
        try {
            socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
        } catch (e) { /* socket 可能已断 */ }
        socket.destroy();
        return;
    }
    if (gate.mode === 'token') {
        console.log(`✅ 握手鉴权通过: ${gate.ident.type} ${gate.ident.id} @ ${gate.ident.roomId} origin=${gate.origin || 'null'}`);
    } else if (gate.mode === 'stale-token') {
        console.log(`⚠️ 握手放行(令牌未登记/已过期，将在 reconnect 阶段拒绝): origin=${gate.origin || 'null'}`);
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
        ws.__upgradeAuth = gate;
        wss.emit('connection', ws, req);
    });
});



// 游戏房间管理
const rooms = new Map();
const playerToRoom = new Map();
let roomCounter = 0; // 房间计数器

// ==================== FIX-004: 房间/连接生命周期基座 ====================
// 包间号池：自定义号与自增号共用同一集合，保证任意时刻 tableNumber 全局唯一。
// （原实现里自增计数器 roomCounter 与自定义号互不知情，会出现两个同号房间。）
const usedTableNumbers = new Set();
const HEARTBEAT_INTERVAL_MS = 30000; // 心跳周期（ws 官方 FAQ 推荐 30s）

// 房间级定时器登记表：任何绑定到房间的 setInterval/setTimeout 都必须经此登记，
// 以便 destroyRoom 一次性全部清理（避免定时器在房间已销毁后继续广播）。
function registerTimer(room, kind, fn, ms, repeat = false) {
    const handle = repeat ? setInterval(fn, ms) : setTimeout(fn, ms);
    if (room) {
        if (!room.timers) room.timers = new Set();
        if (!room.timersByKind) room.timersByKind = { turn: null, deal: null, takeover: null };
        room.timers.add(handle);
        if (kind) room.timersByKind[kind] = handle;
    }
    return handle;
}

// 注销单个已登记句柄（clearTimeout/clearInterval 在 Node 中可互换使用）
function unregisterTimer(room, handle) {
    if (!handle) return;
    clearTimeout(handle);
    clearInterval(handle);
    if (room) {
        if (room.timers) room.timers.delete(handle);
        if (room.timersByKind) {
            for (const k of Object.keys(room.timersByKind)) {
                if (room.timersByKind[k] === handle) room.timersByKind[k] = null;
            }
        }
    }
}

// 清空房间上登记的全部定时器（销毁房间的第一步）
function clearRoomTimers(room) {
    if (!room) return;
    if (room.timers) {
        for (const h of Array.from(room.timers)) {
            clearTimeout(h);
            clearInterval(h);
        }
        room.timers.clear();
    }
    if (room.timersByKind) {
        room.timersByKind.turn = null;
        room.timersByKind.deal = null;
        room.timersByKind.takeover = null;
    }
    room.turnTimer = null;
}

// 包间号是否已被占用（号池 + 现存房间双查，防两表漂移）
function isTableNumberTaken(n) {
    if (n === null || n === undefined) return false;
    if (usedTableNumbers.has(n)) return true;
    for (const room of rooms.values()) {
        if (room.tableNumber === n) return true;
    }
    return false;
}

// 唯一包间号分配入口：自定义号直接入池；自动号跳过所有已占号（含自定义号与空洞号）
function allocTableNumber(customTableNumber = null) {
    if (customTableNumber) {
        usedTableNumbers.add(customTableNumber);
        if (customTableNumber > roomCounter) roomCounter = customTableNumber;
        return customTableNumber;
    }
    let n = roomCounter;
    do { n += 1; } while (isTableNumberTaken(n));
    roomCounter = n;
    usedTableNumbers.add(n);
    return n;
}

// 释放包间号（房间销毁时调用）
function releaseTableNumber(n) {
    if (n) usedTableNumbers.delete(n);
}

// FIX-004: 统一解散判据 —— 「无在线真人玩家 ∧ 无在线观战者」。
// 注意：allPlayersAreAI() 只表示「AI 是否接管完毕」，不再单独决定解散
//（原实现用它判解散 → 有在线观战者时房间被静默销毁）。
function isRoomDisposable(room) {
    if (!room) return true;
    const hasLiveHuman = Array.from(room.players.values())
        .some(p => !p.isAI && p.ws && p.ws.readyState === WebSocket.OPEN);
    if (hasLiveHuman) return false;
    const hasLiveSpectator = Array.from(room.spectators.values())
        .some(s => s.ws && s.ws.readyState === WebSocket.OPEN);
    if (hasLiveSpectator) return false;
    return true;
}

// FIX-005(2): 局面是否处于「对局中且未结算」。
// 优先用显式 phase（FIX-008 引入后自动接管），否则用 gameState 派生：
//   started=true（对局中）∧ 未结算（roundWinner/levelUp 均未写入）。
// 接管回调据此避免在结算/新局期产生 AI 接管副作用（修 A-17）。
function isRoomInPlay(room) {
    if (!room) return false;
    if (typeof room.phase === 'string') return room.phase === 'playing';
    const gs = room.gameState;
    if (!gs || !gs.started) return false;
    if (gs.roundWinner || gs.levelUp) return false; // 已结算（roundEnd）
    return true;
}

// FIX-005: 断线等待重连的宽限期 —— 超过该时间仍未回连就不再视为「房间必须保留」，
// 防止「断线后房间永久滞留」（FIX-004 台账已预留此改法给 FIX-005）。
const RECONNECT_GRACE_MS = 60000;

// 房间是否还挂着「等待重连的真人」：这类房间在线真人为 0，但不该被解散。
function hasPendingReconnect(room) {
    if (!room) return false;
    const now = Date.now();
    const withinGrace = (p) => !p.disconnectTime || now - p.disconnectTime < RECONNECT_GRACE_MS;
    return Array.from(room.players.values()).some(p =>
        // ①（原口径）真人已断线、本人尚未回来（还没到 30 秒接管点）。
        (!p.isAI && p.disconnected && !p.ws && withinGrace(p)) ||
        // ② FIX-B8-1(F1): 原本是真人、已被 AI 接管（wasHuman）—— 「被接管」不等于「人不要了」。
        //    只要仍在同一个 60 秒宽限窗口内（以本人断线时刻 disconnectTime 起算），房间就必须保留，
        //    原主人才能凭 token 认领回原座位与手牌。超出宽限后本项自动失效 → 房可被正常回收
        //    （不会治出僵尸房）。原实现的 ① 在接管瞬间就为假（isAI 已置 true）→ 宽限守卫失效。
        (p.isAI && p.wasHuman === true && !p.ws && !!p.disconnectTime &&
            now - p.disconnectTime < RECONNECT_GRACE_MS));
}

// 唯一的房间销毁函数（收口）：清定时器 → 清 playerToRoom 全部匹配 → 释放包间号
// → rooms.delete → 广播 roomList。
function destroyRoom(roomId, reason = '') {
    const room = rooms.get(roomId);
    const hadRoom = !!room;
    if (room) {
        clearRoomTimers(room);
        releaseTableNumber(room.tableNumber);
    }
    // 即便房间已不在，也要清掉可能残留的身份映射（保底，防内存泄漏）
    for (const [pid, rid] of Array.from(playerToRoom.entries())) {
        if (rid === roomId) playerToRoom.delete(pid);
    }
    // FIX-006: 房间销毁 → 该房间下发的全部会话令牌一并吊销（令牌不跨房间存活）
    const revokedTokens = revokeRoomTokens(roomId);
    if (revokedTokens) console.log(`🔑 已吊销房间 ${roomId} 的 ${revokedTokens} 个会话令牌`);
    if (hadRoom) {
        rooms.delete(roomId);
        broadcastRoomList();
        console.log(`🧹 房间销毁: 包间${room.tableNumber}(${roomId})${reason ? ' - ' + reason : ''}`);
    }
    return hadRoom;
}
// 兼容 fix-plan 中的命名（disposeRoom 与 destroyRoom 是同一实现）
const disposeRoom = destroyRoom;

// 解散判据的带守卫版本：满足 isRoomDisposable 且无「等待重连的真人」时才真正销毁。
// (a) close 之后、(b) 回合/对局结束时、(c) 撞号回收 —— 三处统一走这里。
function maybeDestroyRoom(roomId, reason = '') {
    const room = rooms.get(roomId);
    if (!room) return false;
    if (!isRoomDisposable(room)) return false;
    if (hasPendingReconnect(room)) return false;
    return destroyRoom(roomId, reason);
}

// FIX-004: 单身份约束 —— 同一 ws 再次 createRoom/joinRoom/spectateRoom 前先解绑它
// 此前挂载的身份，绝不让一个连接同时挂在多个房间的 players/playerToRoom 上。
// 返回受影响的房间 id 集合（调用方决定是否回收因此变空的房间）。
function detachWsIdentity(ws) {
    const affected = new Set();
    for (const [pid, rid] of Array.from(playerToRoom.entries())) {
        const room = rooms.get(rid);
        if (!room) { playerToRoom.delete(pid); continue; }
        const p = room.players.get(pid);
        const s = room.spectators.get(pid);
        if (p && p.ws === ws) {
            room.players.delete(pid);
            playerToRoom.delete(pid);
            affected.add(rid);
            // FIX-006: 座位被解绑 → 该座位的会话令牌一并吊销
            revokeSessionToken(pid, rid);
            console.log(`🔀 单身份约束：解绑旧玩家身份 ${p.name} @ ${rid}`);
        } else if (s && s.ws === ws) {
            room.spectators.delete(pid);
            playerToRoom.delete(pid);
            affected.add(rid);
            // FIX-006: 座位被解绑 → 该座位的会话令牌一并吊销
            revokeSessionToken(pid, rid);
            console.log(`🔀 单身份约束：解绑旧观战身份 ${s.name} @ ${rid}`);
        }
    }
    for (const rid of affected) {
        const room = rooms.get(rid);
        if (room) room.broadcastPlayerList();
    }
    // FIX-006: 真的解绑过身份 → 清掉该连接上的旧绑定（调用方随后会重新 bind）
    if (affected.size) ws.__identity = null;
    return affected;
}

// FIX-005: 「断线 → 30 秒 AI 接管」的唯一挂载入口。
// 句柄同时登记到 room.timers（房间销毁即取消）与 player.takeoverTimer（可按座位单独取消，
// 解决 FIX-004 单槽 timersByKind.takeover 在多人同时断线时互相覆盖、无法精确取消的问题）。
// 回调执行前**二次复查**（三重复查）：① 房间仍在 ② 局面仍在对局中且未结算 ③ 该玩家仍未回连；
// 任一不满足即放弃接管（修 A-17：回合已结束/房间已删仍把真人永久改 AI）。
function armTakeoverTimer(room, playerId, ms = 30000) {
    if (!room) return null;
    const player = room.players.get(playerId);
    if (!player || player.isAI) return null;
    if (player.takeoverTimer) return player.takeoverTimer; // 已在等待，不重复挂
    player.takeoverTimer = registerTimer(room, 'takeover', () => {
        player.takeoverTimer = null;
        // ① 房间仍在（未被销毁）
        if (rooms.get(room.id) !== room) return;
        // ② 局面仍在对局中且未结算
        if (!isRoomInPlay(room)) return;
        // ③ 该玩家仍未回连
        const p = room.players.get(playerId);
        if (!p || p.isAI || !p.disconnected || p.ws) return;

        const baseName = p.name.replace('🤖 ', '');
        console.log(`${baseName} 超时未重连，由AI接管`);
        p.isAI = true;
        p.wasHuman = true;       // 标记「原真人座位」→ 本人日后回连可认领（见 findReconnectSeat）
        p.disconnected = false;
        // FIX-B8-1(F1): 不再清空 disconnectTime —— 宽限期以「本人断线时刻」起算，
        // 30 秒接管之后仍要保留该时间戳，hasPendingReconnect 的 ② 项才能算出剩余宽限，
        // 房间才会继续保留到断线后第 60 秒（原实现清空 → 接管瞬间宽限守卫失效 → 房被立刻回收，
        // 35 秒回连得到「房间不存在」）。takeoverAt 仅作排查用。
        p.takeoverAt = Date.now();
        p.name = '🤖 ' + baseName;
        p.ready = true;

        room.broadcast({
            type: 'playerReplacedByAI',
            playerId,
            playerName: p.name,
            message: `${baseName} 超时未重连，由AI接管`
        });
        room.broadcastPlayerList();

        // 统一判据 —— 无在线真人 ∧ 无在线观战者才解散
        if (!maybeDestroyRoom(room.id, '玩家全部离线')) {
            const ids = room.getSortedPlayerIds();
            if (ids[room.gameState.currentPlayer] === playerId) {
                registerTimer(room, 'deal', () => room.aiPlayCards(playerId), room.getAIRandomDelay());
            }
        }
    }, ms);
    return player.takeoverTimer;
}

// FIX-005: 取消某座位待接管定时器（玩家回连时调用；幂等）。返回是否真的取消了一个待接管。
function cancelTakeoverTimer(room, playerId) {
    if (!room) return false;
    const player = room.players.get(playerId);
    if (!player || !player.takeoverTimer) return false;
    unregisterTimer(room, player.takeoverTimer); // 内部会同步清 room.timers 与 timersByKind
    player.takeoverTimer = null;
    return true;
}

// FIX-005: 重连座位查找的【唯一入口】。
// 只认两种座位，避免「张冠李戴」与「误占真 AI 座位」（修 A-16 的同名风险面）：
//   ① 真人已断线、正在等待重连的座位；
//   ② 曾被 AI 接管、原主人回来认领的座位（凭 wasHuman 标记）。
function findReconnectSeat(room, playerName) {
    if (!room || !playerName) return null;
    for (const [pid, p] of room.players.entries()) {
        if (p.name !== playerName && p.name.replace('🤖 ', '') !== playerName) continue;
        if (!p.isAI && p.disconnected === true) return { pid, player: p };
        if (p.isAI && p.wasHuman === true && !p.ws) return { pid, player: p };
    }
    return null;
}

// FIX-007b: 管理类消息（addAI / testWin / newRound）的【房主判据唯一入口】。
// 判据：① 房间登记的房主座位仍是在线真人 → 只有该座位本人算房主；
//       ② 房主座位不在场（已离开 / 断线被 AI 接管后一直没回来）→ 顺位给「座位号最小的在线真人」，
//          避免出现「房主一走，房内再没人能点新局/加 AI」的死局。
// 注意：本函数只回答「是不是房主」；阶段门禁（未开局 / 对局中 / 结算期）由各 handler 另判。
function isRoomHost(room, ident) {
    if (!room || !ident || ident.type !== 'player') return false;
    const hostSeat = room.players.get(room.hostId);
    const hostIsLiveHuman = !!hostSeat && !hostSeat.isAI && !!hostSeat.ws && hostSeat.ws.readyState === WebSocket.OPEN;
    if (hostIsLiveHuman) return room.hostId === ident.id;
    const fallback = room.getSortedPlayerIds()
        .map(pid => room.players.get(pid))
        .find(p => p && !p.isAI && p.ws && p.ws.readyState === WebSocket.OPEN);
    return !!fallback && fallback.id === ident.id;
}

// B6-1（收尾小修）: 供客户端 UI 使用的「当前有效房主座位 id」。
// 判据与 isRoomHost **完全同源**（① 登记的房主座位是在线真人 → 就是本人；
// ② 房主不在场 → 座位号最小的在线真人；③ 都没有 → null），
// 因此客户端据此灰按钮与服务端鉴权结论一致（例如房主断线期间顺位房主的按钮会自己亮起来）。
// 仅用于下发展示，不参与任何鉴权判定 —— 权威判据仍然是 isRoomHost()。
function getEffectiveHostId(room) {
    if (!room) return null;
    const hostSeat = room.players.get(room.hostId);
    const hostIsLiveHuman = !!hostSeat && !hostSeat.isAI && !!hostSeat.ws && hostSeat.ws.readyState === WebSocket.OPEN;
    if (hostIsLiveHuman) return room.hostId;
    const fallback = room.getSortedPlayerIds()
        .map(pid => room.players.get(pid))
        .find(p => p && !p.isAI && p.ws && p.ws.readyState === WebSocket.OPEN);
    return fallback ? fallback.id : null;
}

// ==================== FIX-006: 身份绑定与令牌下发（P0 核心） ====================
// 漏洞（改动前）：服务端只信任消息体里的 data.playerId，而 broadcastPlayerList 把含 AI 在内的
// 全员 id 广播给所有人 → 任意连接都能用别人的 id 发 play/pass/ready/setAutoPlay/newRound/
// returnTribute/chat，替他人出牌、冒名发言；无 token 即可用他人名字 reconnect 顶座看牌。
// 本批建立「连接 → 身份」权威映射：所有动作类消息一律按【连接身份】鉴权，data.playerId 只做
// 一致性校验（不再具备任何鉴权效力）。令牌用 crypto.randomUUID()，随 roomCreated/roomJoined/
// reconnected/spectatorJoined 下发，客户端存 localStorage 并在后续每条消息里带回。
// 令牌登记在 sessionTokens 里而**不**挂在 player 对象上 —— 避免被 getPlayerGameState 的
// `...player` 展开（myInfo）把令牌泄漏给本人/他人（该项与 fix-plan §2.4 的 A-21 同源）。
const crypto = require('crypto');
const sessionTokens = new Map();   // token -> { type:'player'|'spectator', id, roomId }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 下发一个座位级 session token（同一座位重新下发时自动作废旧 token）
function issueSessionToken(type, id, roomId) {
    for (const [tok, ent] of Array.from(sessionTokens.entries())) {
        if (ent.id === id && ent.roomId === roomId) sessionTokens.delete(tok);
    }
    const token = crypto.randomUUID();
    sessionTokens.set(token, { type, id, roomId });
    return token;
}

// 吊销某个身份的令牌（座位被移除时调用）。roomId 省略则吊销该 id 的全部令牌。
function revokeSessionToken(id, roomId) {
    let n = 0;
    for (const [tok, ent] of Array.from(sessionTokens.entries())) {
        if (ent.id === id && (roomId === undefined || ent.roomId === roomId)) {
            sessionTokens.delete(tok);
            n += 1;
        }
    }
    return n;
}

// 吊销整个房间的令牌（destroyRoom 收口时调用；令牌不跨房间存活）
function revokeRoomTokens(roomId) {
    let n = 0;
    for (const [tok, ent] of Array.from(sessionTokens.entries())) {
        if (ent.roomId === roomId) {
            sessionTokens.delete(tok);
            n += 1;
        }
    }
    return n;
}

// token 是否已登记且与 (id, roomId) 匹配
function tokenMatches(token, id, roomId) {
    if (!token || typeof token !== 'string') return false;
    const ent = sessionTokens.get(token);
    if (!ent) return false;
    if (id !== undefined && id !== null && ent.id !== id) return false;
    if (roomId !== undefined && roomId !== null && ent.roomId !== roomId) return false;
    return true;
}

// ws → 身份 绑定的唯一写入入口
function bindWsIdentity(ws, type, id, roomId, token) {
    ws.__identity = { type, id, roomId, token: token || null };
    return ws.__identity;
}
// 读取 ws 上的绑定身份（未绑定返回 null）
function getWsIdentity(ws) {
    return (ws && ws.__identity) ? ws.__identity : null;
}

// 动作类消息的【统一鉴权入口】。返回 { ok:true, ident } 或 { ok:false, code, message }。
// 规则：
//   ① 未绑定身份                     → NOT_BOUND
//   ② data.playerId 与绑定身份不符   → IDENTITY_MISMATCH（P0 漏洞正落在这里）
//   ③ data.roomId   与绑定房间不符   → ROOM_MISMATCH
//   ④ data.token    与绑定令牌不符   → TOKEN_MISMATCH
//   ⑤ 玩家身份的动作消息必须携带令牌 → TOKEN_REQUIRED（旧标签页在此被拒，提示刷新）
function authorizeAction(ws, data, opts) {
    const o = opts || {};
    const ident = getWsIdentity(ws);
    if (!ident) {
        return { ok: false, code: 'NOT_BOUND', message: '当前连接尚未绑定身份，请先创建或加入房间' };
    }
    if (data && data.playerId && data.playerId !== ident.id) {
        return { ok: false, code: 'IDENTITY_MISMATCH', message: '身份校验失败：消息中的 playerId 与当前连接身份不一致' };
    }
    if (data && data.roomId && ident.roomId && data.roomId !== ident.roomId) {
        return { ok: false, code: 'ROOM_MISMATCH', message: '房间校验失败：只能操作自己所在的房间' };
    }
    if (data && data.token && data.token !== ident.token) {
        return { ok: false, code: 'TOKEN_MISMATCH', message: '令牌校验失败：会话令牌与当前连接不符，请按 F5 刷新页面后重试' };
    }
    if (ident.type === 'player' && o.requireToken !== false && !(data && data.token)) {
        return { ok: false, code: 'TOKEN_REQUIRED', message: '缺少会话令牌：请按 F5 刷新页面后重新加入房间' };
    }
    return { ok: true, ident };
}

// 统一回【可读错误】（带明确 code），绝不静默丢弃
function sendAuthError(ws, res) {
    try {
        ws.send(JSON.stringify({ type: 'error', code: res.code, message: res.message }));
    } catch (e) { /* 连接可能已关闭 */ }
    return false;
}

// 牌面常量
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
    '小王': 15, '大王': 16
};

// 级别转换为牌面
const LEVEL_TO_RANK = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
    10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

// 房间类
class GameRoom {
    constructor(id, mode = 'normal', allowSpectator = false, tableNumber = 0) {
        this.id = id;
        this.tableNumber = tableNumber; // 桌号
        this.mode = mode; // 'fast' 或 'normal'
        this.allowSpectator = allowSpectator; // 是否允许观战
        // FIX-008: 显式局面状态机（房间级、唯一权威）。
        //   waiting   房内待开局（可 ready 触发 startGame）
        //   dealing   首次发牌动画中
        //   tribute   进贡/还贡阶段
        //   newRound  新一局发牌动画中
        //   playing   对局进行中（isRoomInPlay 只认这一个）
        //   settling  本局已结算、等待新局
        // 三个收口点：① isRoomInPlay 只认 playing（封死结算/新局期被 AI 接管，修 A-17）
        //             ② checkStartGame 只允许 waiting 开局（封死局间过渡期重复 startGame，修 A-8）
        //             ③ newRound 只允许 settling（封死过渡期打断对局，修 A-9）
        // 注意：gameState.started 按兼容口径原样保留（对局期间含发牌/进贡），仅作展示与旧链路兼容；
        //       新增门禁一律以 phase 为准。
        this.phase = 'waiting';
        // FIX-007b: 房主（管理类消息门禁的判据来源）—— createRoom 时写入创建者座位 id
        this.hostId = null;
        this.players = new Map();
        this.spectators = new Map(); // 观战者
        this.maxPlayers = 4;
        this.turnTimeout = mode === 'fast' ? 15 : 30; // 出牌时间
        this.turnTimer = null;
        // FIX-004: 房间级定时器登记表（所有 setTimeout/setInterval 都要登记到此）
        this.timers = new Set();
        this.timersByKind = { turn: null, deal: null, takeover: null };
        this.gameState = {
            started: false,
            currentPlayer: 0,
            lastPlay: null,
            lastPlayer: null,
            passedPlayers: [],
            teamLevels: { 1: 2, 2: 2 },
            currentLevelTeam: 1,
            deck: [],
            hands: {},
            roundWinner: null,
            levelUp: 0,
            // FIX-008: 本局结算写入值快照（startNewRound 的通关判定只读它，避免读到陈值/残留值）
            lastSettle: null,
            turnTimeLeft: this.turnTimeout
        };
    }

    // FIX-008: phase 的唯一写入入口（顺带按兼容口径同步 started，避免两处各写一半）。
    setPhase(p) {
        this.phase = p;
        if (p === 'playing') this.gameState.started = true;
        return this.phase;
    }

    // FIX-005: 座位/上下游/进贡顺序的【唯一入口】。
    // 按 playerNum（座位号）升序排列 —— 与客户端各处 playerList.sort((a,b)=>a.playerNum-b.playerNum) 完全一致。
    // 所有位置语义（currentPlayer 索引、接风对家、进贡/还贡顺序、"是否轮到本人"）都必须经由本函数取序，
    // 禁止再用 players Map 的插入序（Array.from(players.keys())）——修 A-18。
    getSortedPlayerIds() {
        return Array.from(this.players.entries())
            .sort((a, b) => a[1].playerNum - b[1].playerNum)
            .map(([id]) => id);
    }

    addPlayer(ws, playerId, playerName, seatNum = null) {
        if (this.players.size >= this.maxPlayers) return false;

        // 如果指定了座位号，使用指定的；否则找第一个空位
        let playerNum;
        if (seatNum !== null && seatNum >= 1 && seatNum <= 4) {
            // 检查该座位是否已被占用
            const occupied = Array.from(this.players.values()).some(p => p.playerNum === seatNum);
            if (occupied) return false;
            playerNum = seatNum;
        } else {
            // 找第一个空位
            const occupiedSeats = new Set(Array.from(this.players.values()).map(p => p.playerNum));
            for (let i = 1; i <= 4; i++) {
                if (!occupiedSeats.has(i)) {
                    playerNum = i;
                    break;
                }
            }
        }

        // 逆时针座位：1、3号位红队（对家），2、4号位蓝队（对家）
        const team = (playerNum % 2 === 1) ? 1 : 2;

        this.players.set(playerId, {
            ws, id: playerId, name: playerName,
            playerNum, team, ready: false,
            finished: false, rank: 0, isAI: false,
            autoPlay: false, // 托管状态
            timeoutCount: 0 // 连续超时计数
        });
        return true;
    }

    // 添加AI玩家
    addAIPlayer(playerId, playerName, seatNum = null) {
        if (this.players.size >= this.maxPlayers) return false;

        let playerNum;
        if (seatNum !== null && seatNum >= 1 && seatNum <= 4) {
            const occupied = Array.from(this.players.values()).some(p => p.playerNum === seatNum);
            if (occupied) return false;
            playerNum = seatNum;
        } else {
            const occupiedSeats = new Set(Array.from(this.players.values()).map(p => p.playerNum));
            for (let i = 1; i <= 4; i++) {
                if (!occupiedSeats.has(i)) {
                    playerNum = i;
                    break;
                }
            }
        }

        const team = (playerNum % 2 === 1) ? 1 : 2;

        this.players.set(playerId, {
            ws: null, id: playerId, name: playerName,
            playerNum, team, ready: true, // AI默认准备
            finished: false, rank: 0, isAI: true
        });
        return true;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        return this.players.size === 0;
    }

    // 检查是否所有玩家都是AI
    allPlayersAreAI() {
        if (this.players.size === 0) return true;
        for (const player of this.players.values()) {
            if (!player.isAI) return false;
        }
        return true;
    }

    // 添加观战者
    // FIX-007a: 初始 viewPlayerId 同样做范围校验 —— 非本房玩家 id 一律不写入（回落默认视角）。
    addSpectator(ws, spectatorId, spectatorName, viewPlayerId = null) {
        this.spectators.set(spectatorId, {
            ws, id: spectatorId, name: spectatorName,
            viewPlayerId: (viewPlayerId && this.players.has(viewPlayerId)) ? viewPlayerId : null
        });
        return true;
    }

    // 移除观战者
    removeSpectator(spectatorId) {
        this.spectators.delete(spectatorId);
        return this.spectators.size === 0 && this.players.size === 0;
    }

    // 获取观战者视角的游戏状态（只能看到一个玩家的手牌）
    // FIX-007a: 范围校验【兜底层】—— viewPlayerId 必须落在本房玩家集合内，否则一律不采信
    //（不回显、不返回其手牌），回落默认视角（当前出牌玩家）。即使调用方漏判也拿不到房外手牌。
    getSpectatorGameState(viewPlayerId = null) {
        const playerIds = this.getSortedPlayerIds();
        const allHands = {};
        const playerInfo = {};

        // 范围校验：只认本房玩家；越界/伪造 id 一律丢弃
        const safeViewId = (viewPlayerId && playerIds.includes(viewPlayerId)) ? viewPlayerId : null;
        if (viewPlayerId && !safeViewId) {
            console.log(`⚠️ 观战视角越界被夹回默认视角: viewPlayerId=${viewPlayerId} 不在本房玩家集合内`);
        }

        // 如果没有指定观看的玩家，默认观看当前出牌玩家
        let targetPid = safeViewId;
        if (!targetPid && playerIds.length > 0) {
            targetPid = playerIds[this.gameState.currentPlayer] || playerIds[0];
        }

        for (let i = 0; i < 4; i++) {
            const pid = playerIds[i];
            const player = this.players.get(pid);
            // 只有目标玩家可以看到手牌，其他玩家只能看到牌数
            if (pid === targetPid) {
                allHands[pid] = {
                    cards: this.gameState.hands[pid] || [],
                    count: this.gameState.hands[pid]?.length || 0,
                    visible: true
                };
            } else {
                allHands[pid] = {
                    cards: [],
                    count: this.gameState.hands[pid]?.length || 0,
                    visible: false
                };
            }
            playerInfo[pid] = {
                name: player?.name || '',
                team: player?.team || 1,
                playerNum: player?.playerNum || (i + 1)
            };
        }

        return {
            started: this.gameState.started,
            currentPlayer: this.gameState.currentPlayer,
            lastPlay: this.gameState.lastPlay,
            lastPlayer: this.gameState.lastPlayer,
            teamLevels: this.gameState.teamLevels,
            currentLevelTeam: this.gameState.currentLevelTeam,
            trumpRank: this.getCurrentLevelRank(),
            hands: allHands,
            playerInfo: playerInfo,
            passedPlayers: this.gameState.passedPlayers,
            roundWinner: this.gameState.roundWinner,
            levelUp: this.gameState.levelUp,
            isSpectator: true,
            viewPlayerId: targetPid
        };
    }

    setPlayerReady(playerId, ready) {
        const player = this.players.get(playerId);
        if (player) {
            player.ready = ready;
            this.broadcastPlayerList();
            this.checkStartGame();
        }
    }

    checkStartGame() {
        const allReady = Array.from(this.players.values()).every(p => p.ready);
        // FIX-008: 开局只允许从 waiting 出发。
        // 原判据只看 !gameState.started —— 局间过渡期（结算后/新局发牌中）再点一次「准备」
        // 就会二次 startGame()，把 teamLevels 抹回 {1:2,2:2} 并重发牌，抹掉升级进度（修 A-8）。
        if (allReady && this.players.size === 4 && this.phase === 'waiting') {
            this.startGame();
        }
    }

    getCurrentLevelRank() {
        return LEVEL_TO_RANK[this.gameState.teamLevels[this.gameState.currentLevelTeam]];
    }

    createDeck() {
        const deck = [];
        const trumpRank = this.getCurrentLevelRank();

        for (let i = 0; i < 2; i++) {
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    // 所有花色的级牌value=14.5（比A大，比王小）
                    const isLevelCard = rank === trumpRank;
                    const cardValue = isLevelCard ? 14.5 : RANK_VALUES[rank];
                    deck.push({
                        suit, rank, value: cardValue,
                        isJoker: false,
                        isTrump: suit === '♥' && rank === trumpRank, // 只有红桃级牌是逢人配
                        isLevelCard: isLevelCard // 标记是否是级牌
                    });
                }
            }
        }

        for (let i = 0; i < 2; i++) {
            deck.push({ suit: '🃏', rank: '小王', value: 15, isJoker: true, isTrump: false, isLevelCard: false });
            deck.push({ suit: '🃏', rank: '大王', value: 16, isJoker: true, isTrump: false, isLevelCard: false });
        }
        return deck;
    }

    shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    dealCards() {
        const deck = this.shuffle(this.createDeck());
        const hands = {};
        const playerIds = this.getSortedPlayerIds();

        for (let i = 0; i < 4; i++) {
            hands[playerIds[i]] = deck.slice(i * 27, (i + 1) * 27);
            this.sortHand(hands[playerIds[i]]);
        }
        return hands;
    }

    sortHand(hand) {
        const trumpRank = this.getCurrentLevelRank();

        hand.sort((a, b) => {
            // 计算排序值：大王=16, 小王=15, 级牌=14.5, A=14, K=13...
            const getSortValue = (card) => {
                // 王牌保持原值
                if (card.isJoker) return card.value;
                // 所有级牌（含红桃）排在王和A之间
                if (card.rank === trumpRank) return 14.5;
                return card.value;
            };

            const aVal = getSortValue(a);
            const bVal = getSortValue(b);

            if (aVal !== bVal) return bVal - aVal;
            return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        });
    }

    startGame() {
        this.gameState.started = true;
        // FIX-008: 进入「首次发牌」状态；发牌动画结束（animateDealCards）再转 playing。
        this.setPhase('dealing');
        this.gameState.lastSettle = null; // FIX-008: 全新一局，清掉上一局结算快照
        this.gameState.teamLevels = { 1: 2, 2: 2 };
        this.gameState.currentLevelTeam = 1;
        this.gameState.hands = this.dealCards();
        this.gameState.currentPlayer = 0;
        this.gameState.lastPlay = null;
        this.gameState.lastPlayer = null;
        this.gameState.passedPlayers = [];
        this.gameState.roundWinner = null;
        this.gameState.levelUp = 0;

        for (let player of this.players.values()) {
            player.finished = false;
            player.rank = 0;
        }

        const playerIds = this.getSortedPlayerIds();
        for (let i = 0; i < 4; i++) {
            const hand = this.gameState.hands[playerIds[i]];
            if (hand.some(card => card.suit === '♥' && card.rank === '3')) {
                this.gameState.currentPlayer = i;
                break;
            }
        }

        // 先广播消息让前端切换到游戏区域
        this.broadcast({ type: 'showGameArea', gameState: this.getPublicGameState() });

        // 执行逐张发牌动画
        this.animateDealCards(playerIds);

        console.log(`房间 ${this.id} 游戏开始`);
    }

    // 逐张发牌动画
    animateDealCards(playerIds) {
        const allCards = [];
        // 按顺序收集所有牌（每个玩家27张，轮流发）
        for (let i = 0; i < 27; i++) {
            for (let p = 0; p < 4; p++) {
                const hand = this.gameState.hands[playerIds[p]];
                if (hand[i]) {
                    allCards.push({ playerIndex: p, card: hand[i] });
                }
            }
        }

        let cardIndex = 0;
        const dealInterval = registerTimer(this, 'deal', () => {
            if (cardIndex < allCards.length) {
                const { playerIndex, card } = allCards[cardIndex];
                this.broadcast({
                    type: 'dealCard',
                    playerIndex: playerIndex,
                    card: card
                });
                cardIndex++;
            } else {
                unregisterTimer(this, dealInterval);
                // FIX-008: 首次发牌动画结束 = 真正进入对局中（isRoomInPlay 只认 playing）
                this.setPhase('playing');
                // 发牌完成，广播游戏开始
                this.broadcast({ type: 'gameStart', gameState: this.getPublicGameState() });

                // 如果轮到AI玩家，延迟后自动出牌
                const currentPlayerId = playerIds[this.gameState.currentPlayer];
                const currentPlayer = this.players.get(currentPlayerId);
                if (currentPlayer && currentPlayer.isAI) {
                    const delay = 1000 + Math.random() * 1000; // 随机1-2秒
                    registerTimer(this, 'deal', () => this.aiPlayCards(currentPlayerId), delay);
                }
            }
        }, 30, true); // 每30ms发一张牌
    }

    // 获取AI出牌随机延迟（1-2秒）
    getAIRandomDelay() {
        return 1000 + Math.random() * 1000;
    }

    getPublicGameState() {
        const playerIds = this.getSortedPlayerIds();
        const publicHands = {};
        const playerInfo = {};

        for (let i = 0; i < 4; i++) {
            const pid = playerIds[i];
            const player = this.players.get(pid);
            publicHands[pid] = { count: this.gameState.hands[pid]?.length || 0 };
            playerInfo[pid] = {
                name: player?.name || '',
                team: player?.team || 1,
                playerNum: player?.playerNum || (i + 1),
                finished: player?.finished || false,
                rank: player?.rank || 0
            };
        }

        return {
            started: this.gameState.started,
            currentPlayer: this.gameState.currentPlayer,
            lastPlay: this.gameState.lastPlay,
            lastPlayer: this.gameState.lastPlayer,
            teamLevels: this.gameState.teamLevels,
            currentLevelTeam: this.gameState.currentLevelTeam,
            trumpRank: this.getCurrentLevelRank(),
            hands: publicHands,
            playerInfo: playerInfo,
            passedPlayers: this.gameState.passedPlayers,
            roundWinner: this.gameState.roundWinner,
            levelUp: this.gameState.levelUp
        };
    }

    getPlayerGameState(playerId) {
        return {
            ...this.getPublicGameState(),
            myHand: this.gameState.hands[playerId] || [],
            myInfo: { id: playerId, ...this.players.get(playerId) }
        };
    }

    validatePlay(cards) {
        if (!cards || cards.length === 0) return { valid: false, type: null };
        const sorted = [...cards].sort((a, b) => a.value - b.value);

        // 分离逢人配和普通牌
        const trumpCards = cards.filter(c => c.isTrump); // 逢人配（红桃级牌）
        const normalCards = cards.filter(c => !c.isTrump && !c.isJoker);
        const hasJoker = cards.some(c => c.isJoker);

        // 获取牌的原始值
        const getValue = (c) => RANK_VALUES[c.rank] || c.value;

        // 单张
        if (cards.length === 1) return { valid: true, type: 'single', value: cards[0].value };

        // 对子：两张相同，或一张普通牌+一张逢人配
        if (cards.length === 2) {
            // 两张大王或两张小王可以作为对子
            const bigJokers = cards.filter(c => c.rank === '大王');
            const smallJokers = cards.filter(c => c.rank === '小王');
            if (bigJokers.length === 2) {
                return { valid: true, type: 'pair', value: 16.5 };
            }
            if (smallJokers.length === 2) {
                return { valid: true, type: 'pair', value: 15.5 };
            }

            if (!hasJoker) {
                if (trumpCards.length === 2) {
                    // 两张逢人配变成最大的对子
                    return { valid: true, type: 'pair', value: 14.5 };
                }
                if (trumpCards.length === 1) {
                    // 一张逢人配 + 一张普通牌 = 该普通牌的对子
                    return { valid: true, type: 'pair', value: normalCards[0].value };
                }
                if (normalCards.length === 2 && normalCards[0].value === normalCards[1].value) {
                    return { valid: true, type: 'pair', value: normalCards[0].value };
                }
            }
        }

        // 王炸
        if (cards.length === 4 && cards.filter(c => c.rank === '大王').length === 2 && cards.filter(c => c.rank === '小王').length === 2) {
            return { valid: true, type: 'rocket', value: 100 };
        }

        // 三张：三张相同，或2张普通牌+1张逢人配，或1张普通牌+2张逢人配
        if (cards.length === 3 && !hasJoker) {
            if (trumpCards.length === 3) {
                return { valid: true, type: 'triple', value: 14.5 };
            }
            if (trumpCards.length === 2) {
                return { valid: true, type: 'triple', value: normalCards[0].value };
            }
            if (trumpCards.length === 1 && normalCards.length === 2 && normalCards[0].value === normalCards[1].value) {
                return { valid: true, type: 'triple', value: normalCards[0].value };
            }
            if (normalCards.length === 3 && normalCards[0].value === normalCards[1].value && normalCards[1].value === normalCards[2].value) {
                return { valid: true, type: 'triple', value: normalCards[0].value };
            }
        }

        // 三带二：逢人配可以参与，"二"可以是对王
        if (cards.length === 5) {
            // 统计普通牌的值（使用card.value以正确处理级牌）
            const valueCounts = {};
            normalCards.forEach(c => {
                const v = c.value; // 使用实际value，级牌会是14.5
                valueCounts[v] = (valueCounts[v] || 0) + 1;
            });

            // 统计王
            const bigJokers = cards.filter(c => c.rank === '大王');
            const smallJokers = cards.filter(c => c.rank === '小王');

            // 尝试所有可能的三带二组合（普通牌）
            // 收集所有可行组合，然后选择三张value最大的
            if (!hasJoker || (bigJokers.length < 2 && smallJokers.length < 2)) {
                let bestResult = null;
                let bestTripleValue = -1;

                for (const tripleVal of Object.keys(valueCounts)) {
                    for (const pairVal of Object.keys(valueCounts)) {
                        if (tripleVal === pairVal) continue;

                        const tripleCount = valueCounts[tripleVal];
                        const pairCount = valueCounts[pairVal];

                        // 计算需要多少逢人配
                        const needForTriple = Math.max(0, 3 - tripleCount);
                        const needForPair = Math.max(0, 2 - pairCount);

                        if (needForTriple + needForPair <= trumpCards.length) {
                            const tripleValueNum = parseFloat(tripleVal);
                            // 选择三张value最大的组合
                            if (tripleValueNum > bestTripleValue) {
                                bestTripleValue = tripleValueNum;
                                bestResult = { valid: true, type: 'tripleWithPair', value: tripleValueNum };
                            }
                        }
                    }
                }

                if (bestResult) return bestResult;
            }

            // 三张普通牌/逢人配 + 对王
            if (bigJokers.length === 2 || smallJokers.length === 2) {
                const jokers = bigJokers.length === 2 ? bigJokers : smallJokers;
                const nonJokers = cards.filter(c => !c.isJoker);
                // 非王牌需要能组成三张（可以是普通牌+逢人配）
                if (nonJokers.length === 3 || (nonJokers.length >= 1 && nonJokers.length + trumpCards.length >= 3)) {
                    // 找出三张的主值
                    let tripleValue = 14.5; // 默认逢人配
                    for (const c of nonJokers) {
                        if (!trumpCards.includes(c)) {
                            tripleValue = c.value;
                            break;
                        }
                    }
                    return { valid: true, type: 'tripleWithPair', value: tripleValue };
                }
            }

            // 纯逢人配三带二
            if (trumpCards.length >= 5 && !hasJoker) {
                return { valid: true, type: 'tripleWithPair', value: 14.5 };
            }
            // 4张逢人配 + 1张普通牌
            if (trumpCards.length === 4 && normalCards.length === 1 && !hasJoker) {
                return { valid: true, type: 'tripleWithPair', value: normalCards[0].value };
            }
        }

        // 炸弹：4张或以上相同的牌，逢人配可以加入
        if (cards.length >= 4) {
            const hasJoker = cards.some(c => c.isJoker);
            if (!hasJoker) {
                // 纯逢人配炸弹（4张逢人配）
                if (trumpCards.length === cards.length && cards.length >= 4) {
                    return { valid: true, type: 'bomb', value: 14.5, length: cards.length };
                }
                // 混合炸弹：普通牌 + 逢人配
                if (normalCards.length > 0 && trumpCards.length > 0) {
                    const baseValue = normalCards[0].value;
                    const allSameValue = normalCards.every(c => c.value === baseValue);
                    if (allSameValue && (normalCards.length + trumpCards.length === cards.length)) {
                        return { valid: true, type: 'bomb', value: baseValue, length: cards.length };
                    }
                }
                // 纯普通牌炸弹
                if (normalCards.length === cards.length) {
                    const baseValue = normalCards[0].value;
                    const allSameValue = normalCards.every(c => c.value === baseValue);
                    if (allSameValue) {
                        return { valid: true, type: 'bomb', value: baseValue, length: cards.length };
                    }
                }
            }
        }

        // 顺子和同花顺：5张连续单牌（逢人配可以替代任意牌）
        if (cards.length === 5 && !cards.some(c => c.isJoker)) {
            // 分离逢人配和其他牌
            const trumpCards = cards.filter(c => c.isTrump);
            const normalCards = cards.filter(c => !c.isTrump);

            // 获取牌的顺子值：使用原始rank值
            const getValue = (c) => RANK_VALUES[c.rank] || c.value;
            const normalValues = normalCards.map(c => getValue(c));

            // 检查普通牌没有重复
            const uniqueVals = [...new Set(normalValues)];
            if (uniqueVals.length === normalValues.length) {
                // 尝试所有可能的顺子：A2345(最小) 到 10JQKA(最大)
                const straights = [
                    [14, 2, 3, 4, 5], // A2345 (A当1用)
                    [2, 3, 4, 5, 6],
                    [3, 4, 5, 6, 7],
                    [4, 5, 6, 7, 8],
                    [5, 6, 7, 8, 9],
                    [6, 7, 8, 9, 10],
                    [7, 8, 9, 10, 11],
                    [8, 9, 10, 11, 12],
                    [9, 10, 11, 12, 13],
                    [10, 11, 12, 13, 14] // 10JQKA
                ];

                for (let i = 0; i < straights.length; i++) {
                    const pattern = straights[i];
                    // 检查普通牌有多少匹配这个pattern
                    let matched = 0;
                    for (const v of normalValues) {
                        if (pattern.includes(v)) matched++;
                    }
                    // 需要的逢人配数量
                    const needed = 5 - matched;
                    if (needed <= trumpCards.length && needed >= 0) {
                        // 匹配成功
                        const straightValue = i === 0 ? 5 : pattern[4]; // A2345的value是5

                        // 检查是否同花顺
                        const normalSuits = [...new Set(normalCards.map(c => c.suit))];
                        if (normalSuits.length === 1 || normalCards.length === 0) {
                            return { valid: true, type: 'straightFlush', value: straightValue, length: 5 };
                        }
                        return { valid: true, type: 'straight', value: straightValue, length: 5 };
                    }
                }
            }
        }

        // 连对：3对连续对子（逢人配可以参与）
        if (cards.length === 6 && !hasJoker) {
            // 统计普通牌每个值有多少张
            const valueCounts = {};
            normalCards.forEach(c => {
                const v = getValue(c);
                valueCounts[v] = (valueCounts[v] || 0) + 1;
            });

            // 尝试所有可能的连续3对：AA2233(A当1) 到 QQKKAA
            // 连对的值范围：AA2233(A当1), 223344, 334455, ..., QQKKAA（A可当14，也可当1）
            const pairPatterns = [
                [14, 2, 3],
                [2, 3, 4],
                [3, 4, 5],
                [4, 5, 6],
                [5, 6, 7],
                [6, 7, 8],
                [7, 8, 9],
                [8, 9, 10],
                [9, 10, 11],
                [10, 11, 12],
                [11, 12, 13],
                [12, 13, 14]
            ];

            for (const pattern of pairPatterns) {
                let needTrump = 0;
                for (const v of pattern) {
                    const have = valueCounts[v] || 0;
                    needTrump += Math.max(0, 2 - have);
                }
                if (needTrump <= trumpCards.length) {
                    return { valid: true, type: 'pairStraight', value: pattern[2], length: 3 };
                }
            }
        }

        // 飞机：2组连续三张（逢人配可以参与）
        if (cards.length === 6 && !hasJoker) {
            // 统计普通牌每个值有多少张
            const valueCounts = {};
            normalCards.forEach(c => {
                const v = getValue(c);
                valueCounts[v] = (valueCounts[v] || 0) + 1;
            });

            // 尝试所有可能的连续2组三张：AAA222(A当1) 到 KKAAA
            const planePatterns = [
                [14, 2],
                [2, 3],
                [3, 4],
                [4, 5],
                [5, 6],
                [6, 7],
                [7, 8],
                [8, 9],
                [9, 10],
                [10, 11],
                [11, 12],
                [12, 13],
                [13, 14]
            ];

            for (const pattern of planePatterns) {
                let needTrump = 0;
                for (const v of pattern) {
                    const have = valueCounts[v] || 0;
                    needTrump += Math.max(0, 3 - have);
                }
                if (needTrump <= trumpCards.length) {
                    return { valid: true, type: 'plane', value: pattern[1], length: 2 };
                }
            }
        }

        return { valid: false, type: null };
    }

    comparePlay(newPlay, lastPlay) {
        if (!lastPlay) return true;
        if (newPlay.type === 'rocket') return true;
        if (lastPlay.type === 'rocket') return false;

        // 同花顺作为炸弹，可以压普通牌型
        if (newPlay.type === 'straightFlush' && lastPlay.type !== 'bomb' && lastPlay.type !== 'straightFlush' && lastPlay.type !== 'rocket') {
            return true;
        }

        // 同花顺 vs 炸弹：6张炸弹 > 同花顺 > 5张炸弹
        if (newPlay.type === 'straightFlush' && lastPlay.type === 'bomb') {
            return lastPlay.length < 6; // 同花顺能压5张炸弹，压不了6张炸弹
        }
        if (lastPlay.type === 'straightFlush' && newPlay.type === 'bomb') {
            return newPlay.length >= 6; // 只有6张及以上的炸弹能压同花顺
        }

        if (newPlay.type === 'bomb' && lastPlay.type !== 'bomb' && lastPlay.type !== 'straightFlush') return true;
        if (lastPlay.type === 'bomb' && newPlay.type !== 'bomb' && newPlay.type !== 'straightFlush') return false;

        if (newPlay.type === lastPlay.type) {
            if (newPlay.type === 'bomb') {
                if (newPlay.length > lastPlay.length) return true;
                if (newPlay.length < lastPlay.length) return false;
            }
            return newPlay.value > lastPlay.value;
        }
        return false;
    }

    playCards(playerId, cards) {
        if (!this.gameState.started) return { success: false, message: '游戏未开始' };

        const playerIds = this.getSortedPlayerIds();
        if (playerIds[this.gameState.currentPlayer] !== playerId) return { success: false, message: '不是你的回合' };

        // 清除回合计时器
        this.clearTurnTimer();

        const player = this.players.get(playerId);
        if (player.finished) return { success: false, message: '你已经出完牌了' };

        // 从服务端手牌中获取实际的牌（确保value正确）
        const hand = this.gameState.hands[playerId];
        const actualCards = [];
        const usedIndexes = new Set(); // FIX-001：已占用的手牌下标，同一张牌不能重复提交
        for (const card of cards) {
            // FIX-001：findIndex 跳过已被占用的下标，实现"按手牌下标占用"去重
            const idx = hand.findIndex((c, i) => !usedIndexes.has(i) && c.suit === card.suit && c.rank === card.rank);
            if (idx === -1) return { success: false, message: '你没有这张牌' };
            usedIndexes.add(idx);
            actualCards.push(hand[idx]);
        }
        // FIX-001：去重后张数必须严格等于提交张数（重复提交同一张牌不再成立）
        if (actualCards.length !== cards.length) return { success: false, message: '你没有这张牌' };

        const result = this.validatePlay(actualCards);
        if (!result.valid) return { success: false, message: '无效的牌型' };

        if (this.gameState.lastPlay && this.gameState.lastPlayer !== playerId) {
            if (!this.comparePlay(result, this.gameState.lastPlay)) return { success: false, message: '牌不够大' };
        }

        // 从手牌中移除（FIX-001：按已确定的下标集合一次性删除；任一非法下标则拒绝）
        for (const idx of usedIndexes) {
            if (idx === -1 || idx >= hand.length) return { success: false, message: '你没有这张牌' };
        }
        for (const idx of [...usedIndexes].sort((a, b) => b - a)) {
            hand.splice(idx, 1);
        }

        this.gameState.lastPlay = result;
        this.gameState.lastPlay.cards = actualCards;
        this.gameState.lastPlayer = playerId;
        this.gameState.passedPlayers = [];

        if (hand.length === 0) {
            // 先计算名次（在设置finished之前）
            player.rank = this.getFinishedCount() + 1;
            player.finished = true;
            this.broadcast({ type: 'playerFinished', playerId, playerName: player.name, rank: player.rank });
        }

        // 检查双赢（同一队获得1、2名）→ 游戏立即结束
        if (this.checkDoubleWin()) {
            this.endRoundWithDoubleWin();
        } else if (this.checkRoundEnd()) {
            this.endRound();
        } else {
            this.nextPlayer();
        }

        return { success: true };
    }

    pass(playerId, broadcastPass = true) {
        if (!this.gameState.started) return { success: false, message: '游戏未开始' };
        const playerIds = this.getSortedPlayerIds();
        if (playerIds[this.gameState.currentPlayer] !== playerId) return { success: false, message: '不是你的回合' };

        // 清除回合计时器
        this.clearTurnTimer();

        const player = this.players.get(playerId);
        if (player.finished) return { success: false, message: '你已经出完牌了' };
        if (!this.gameState.lastPlay || this.gameState.lastPlayer === playerId) return { success: false, message: '你必须出牌' };

        this.gameState.passedPlayers.push(playerId);

        // 广播pass消息（用于显示"过"气泡）- AI已提前广播，这里只对真实玩家广播
        if (broadcastPass && !player.isAI) {
            this.broadcast({ type: 'playerPass', playerId: playerId, playerName: player.name });
        }

        this.nextPlayer();
        return { success: true };
    }

    nextPlayer() {
        const playerIds = this.getSortedPlayerIds();

        // 检查是否所有人都pass了
        const active = Array.from(this.players.values()).filter(p => !p.finished);
        if (this.gameState.passedPlayers.length >= active.length - 1) {
            // 找到最后出牌者
            const lastPlayerIndex = playerIds.indexOf(this.gameState.lastPlayer);
            const lastPlayer = this.players.get(this.gameState.lastPlayer);

            // 只有当最后出牌者已经出完牌时，才让对家接风
            // 否则，最后出牌者继续领出新牌
            if (lastPlayer && lastPlayer.finished) {
                // 接风：由最后出牌者的对家接风
                // 对家索引 = (当前索引 + 2) % 4
                let partnerIndex = (lastPlayerIndex + 2) % 4;

                // 如果对家已经出完牌，按顺时针找下一个未出完的玩家
                let tries = 0;
                while (this.players.get(playerIds[partnerIndex]).finished && tries < 4) {
                    partnerIndex = (partnerIndex + 1) % 4;
                    tries++;
                }

                // 广播接风消息
                const partner = this.players.get(playerIds[partnerIndex]);
                this.broadcast({ type: 'jieFeng', playerName: partner.name });

                this.gameState.currentPlayer = partnerIndex;
            } else {
                // 最后出牌者还有手牌，继续领出新牌
                this.gameState.currentPlayer = lastPlayerIndex;
            }

            this.gameState.lastPlay = null;
            this.gameState.lastPlayer = null;
            this.gameState.passedPlayers = [];
        } else {
            // 正常轮转：下一个玩家
            let next = (this.gameState.currentPlayer + 1) % 4;
            let tries = 0;

            while (tries < 4) {
                if (!this.players.get(playerIds[next]).finished) {
                    this.gameState.currentPlayer = next;
                    break;
                }
                next = (next + 1) % 4;
                tries++;
            }
        }
        this.broadcastGameState();

        // 如果轮到AI玩家，延迟后自动出牌
        const currentPlayerId = playerIds[this.gameState.currentPlayer];
        const currentPlayer = this.players.get(currentPlayerId);
        if (currentPlayer && currentPlayer.isAI && !currentPlayer.finished) {
            setTimeout(() => this.aiPlayCards(currentPlayerId), this.getAIRandomDelay());
        } else if (currentPlayer && !currentPlayer.isAI && !currentPlayer.finished) {
            // 真实玩家
            if (currentPlayer.autoPlay) {
                // 托管玩家，5秒后自动出牌
                this.startTurnTimer(currentPlayerId, 5);
            } else {
                // 非托管玩家，正常倒计时
                this.startTurnTimer(currentPlayerId);
            }
        }
    }

    // 启动回合超时计时器
    startTurnTimer(playerId, customTimeout = null) {
        this.clearTurnTimer();
        this.gameState.turnTimeLeft = customTimeout !== null ? customTimeout : this.turnTimeout;

        // 每秒更新倒计时
        this.turnTimer = registerTimer(this, 'turn', () => {
            this.gameState.turnTimeLeft--;
            this.broadcast({ type: 'turnTimeUpdate', timeLeft: this.gameState.turnTimeLeft });

            if (this.gameState.turnTimeLeft <= 0) {
                this.clearTurnTimer();
                this.handleTurnTimeout(playerId);
            }
        }, 1000, true);

        // 立即广播初始时间
        this.broadcast({ type: 'turnTimeUpdate', timeLeft: this.gameState.turnTimeLeft });
    }

    // 清除回合计时器
    clearTurnTimer() {
        if (this.turnTimer) {
            unregisterTimer(this, this.turnTimer);
            this.turnTimer = null;
        }
    }

    // 处理回合超时
    handleTurnTimeout(playerId) {
        const playerIds = this.getSortedPlayerIds();
        if (playerIds[this.gameState.currentPlayer] !== playerId) return;

        const player = this.players.get(playerId);
        if (!player || player.finished) return;

        console.log(`玩家 ${player.name} 超时未出牌`);

        // 增加超时计数（非托管状态下）
        if (!player.autoPlay) {
            player.timeoutCount++;
            console.log(`玩家 ${player.name} 连续超时 ${player.timeoutCount} 次`);

            // 连续超时2次自动开启托管
            if (player.timeoutCount >= 2) {
                player.autoPlay = true;
                this.broadcast({
                    type: 'autoPlayChanged',
                    playerId: playerId,
                    playerName: player.name,
                    autoPlay: true,
                    reason: 'timeout'
                });
                console.log(`玩家 ${player.name} 因连续超时自动开启托管`);
            }
        }

        // 使用AI逻辑自动出牌
        this.aiPlayCards(playerId);
    }

    // 设置玩家托管状态
    setAutoPlay(playerId, autoPlay) {
        const player = this.players.get(playerId);
        if (!player || player.isAI) return false;

        player.autoPlay = autoPlay;
        if (!autoPlay) {
            // 关闭托管时重置超时计数
            player.timeoutCount = 0;
        }

        this.broadcast({
            type: 'autoPlayChanged',
            playerId: playerId,
            playerName: player.name,
            autoPlay: autoPlay,
            reason: 'manual'
        });

        // 如果开启托管且轮到该玩家，启动5秒倒计时
        if (autoPlay) {
            const playerIds = this.getSortedPlayerIds();
            if (playerIds[this.gameState.currentPlayer] === playerId) {
                this.startTurnTimer(playerId, 5);
            }
        }

        return true;
    }

    // AI出牌逻辑
    aiPlayCards(playerId) {
        console.log(`aiPlayCards 被调用, playerId: ${playerId}`);
        if (!this.gameState.started) {
            console.log('aiPlayCards: 游戏未开始');
            return;
        }
        const playerIds = this.getSortedPlayerIds();
        if (playerIds[this.gameState.currentPlayer] !== playerId) {
            console.log(`aiPlayCards: 不是当前玩家, current: ${playerIds[this.gameState.currentPlayer]}`);
            return;
        }

        const player = this.players.get(playerId);
        if (player.finished) {
            console.log('aiPlayCards: 玩家已结束');
            return;
        }

        const hand = this.gameState.hands[playerId];
        if (!hand || hand.length === 0) {
            console.log('aiPlayCards: 手牌为空');
            return;
        }

        console.log(`aiPlayCards: ${player.name} 手牌数 ${hand.length}, lastPlay: ${this.gameState.lastPlay ? this.gameState.lastPlay.type : 'null'}`);

        // 找出可以打的牌
        const cards = this.selectAICards(hand);

        console.log(`aiPlayCards: 选牌结果 ${cards ? cards.length : 'null'}`);

        if (cards && cards.length > 0) {
            // 打印选中的牌
            console.log(`aiPlayCards: 选中的牌 [${cards.map(c => c.suit + c.rank).join(', ')}]`);
            const result = this.playCards(playerId, cards);
            console.log(`aiPlayCards: playCards 结果 ${JSON.stringify(result)}`);
            // 如果出牌失败，尝试pass
            if (!result || !result.success) {
                console.log(`[错误检测] AI ${player.name} 出牌失败: ${result?.message || '未知错误'}`);
                const passResult = this.pass(playerId, false);
                console.log(`aiPlayCards: pass 结果 ${JSON.stringify(passResult)}`);
                // 如果pass也失败，说明可能卡住了
                if (!passResult || !passResult.success) {
                    console.error(`[严重错误] AI ${player.name} 出牌和pass都失败！执行强制恢复`);
                    this.forceNextPlayer(playerId);
                }
            }
        } else {
            // 先广播AI要pass的消息，让客户端显示"过"气泡
            this.broadcast({ type: 'playerPass', playerId: playerId, playerName: player.name });
            // 延迟后执行pass（立即执行，不再延迟，因为aiPlayCards本身已经是延迟调用的）
            const passResult = this.pass(playerId, false);
            console.log(`aiPlayCards: pass 结果 ${JSON.stringify(passResult)}`);
            // 如果pass失败且lastPlay为null，说明是新一轮必须出牌
            if (!passResult || !passResult.success) {
                console.error(`[错误检测] AI ${player.name} 无法pass，尝试强制出牌`);
                // 强制出最小的单张
                const forcedCard = [hand[hand.length - 1]];
                console.log(`aiPlayCards: 强制出牌 [${forcedCard.map(c => c.suit + c.rank).join(', ')}]`);
                const forceResult = this.playCards(playerId, forcedCard);
                console.log(`aiPlayCards: 强制出牌结果 ${JSON.stringify(forceResult)}`);
                if (!forceResult || !forceResult.success) {
                    console.error(`[严重错误] AI ${player.name} 强制出牌也失败，执行强制恢复`);
                    this.forceNextPlayer(playerId);
                }
            }
        }
    }

    // 强制跳到下一个玩家（用于错误恢复）
    forceNextPlayer(currentPlayerId) {
        console.log(`[错误恢复] 强制跳过玩家 ${currentPlayerId}`);
        this.clearTurnTimer();
        const playerIds = this.getSortedPlayerIds();
        let next = (this.gameState.currentPlayer + 1) % 4;
        let tries = 0;
        while (tries < 4) {
            const nextPlayer = this.players.get(playerIds[next]);
            if (nextPlayer && !nextPlayer.finished) {
                this.gameState.currentPlayer = next;
                break;
            }
            next = (next + 1) % 4;
            tries++;
        }
        // 重置出牌状态
        this.gameState.lastPlay = null;
        this.gameState.lastPlayer = null;
        this.gameState.passedPlayers = [];
        this.broadcastGameState();

        // 触发下一个玩家出牌
        const nextPlayerId = playerIds[this.gameState.currentPlayer];
        const nextPlayer = this.players.get(nextPlayerId);
        if (nextPlayer && nextPlayer.isAI && !nextPlayer.finished) {
            setTimeout(() => this.aiPlayCards(nextPlayerId), this.getAIRandomDelay());
        }
    }

    // AI选牌逻辑 - 智能策略
    selectAICards(hand) {
        // 如果没有上家出牌或新一轮，智能选择出牌
        if (!this.gameState.lastPlay || this.gameState.lastPlayer === this.getCurrentPlayerId()) {
            return this.selectFreePlay(hand);
        }

        // 检查上家是否是队友，如果是队友就pass（不压队友）
        const lastPlayer = this.players.get(this.gameState.lastPlayer);
        const currentPlayer = this.players.get(this.getCurrentPlayerId());
        if (lastPlayer && currentPlayer && lastPlayer.team === currentPlayer.team) {
            // 队友出的牌，不压，让队友做大
            return null;
        }

        const lastPlay = this.gameState.lastPlay;

        // 尝试跟牌
        if (lastPlay.type === 'single') {
            // 找一张比上家大的牌
            for (let i = hand.length - 1; i >= 0; i--) {
                if (hand[i].value > lastPlay.value) {
                    return [hand[i]];
                }
            }
        } else if (lastPlay.type === 'pair') {
            // 找一对比上家大的对子
            const pairs = this.findPairs(hand);
            for (const pair of pairs) {
                if (pair[0].value > lastPlay.value) {
                    return pair;
                }
            }
        } else if (lastPlay.type === 'triple') {
            // 找三张
            const triples = this.findTriples(hand);
            for (const triple of triples) {
                if (triple[0].value > lastPlay.value) {
                    return triple;
                }
            }
        } else if (lastPlay.type === 'tripleWithPair') {
            // 找三带二
            const triplesWithPairs = this.findTriplesWithPairs(hand);
            for (const twp of triplesWithPairs) {
                if (twp.tripleValue > lastPlay.value) {
                    return [...twp.triple, ...twp.pair];
                }
            }
        }

        // 尝试用炸弹或同花顺
        if (lastPlay.type !== 'rocket') {
            // 先尝试找同花顺（可以压任何普通牌型和5张炸弹）
            const straightFlushes = this.findStraightFlushes(hand);
            const rankToValue = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
            const getCardValue = (c) => c.isLevelCard ? rankToValue[c.rank] : c.value;

            for (const sf of straightFlushes) {
                // 计算同花顺的最大牌值
                const sfValue = Math.max(...sf.map(c => getCardValue(c)));

                if (lastPlay.type === 'straightFlush') {
                    // 同花顺压同花顺需要value更大
                    if (sfValue > lastPlay.value) {
                        return sf;
                    }
                } else if (lastPlay.type === 'bomb') {
                    // 同花顺能压5张炸弹，压不了6张炸弹
                    if (lastPlay.length < 6) {
                        return sf;
                    }
                } else {
                    // 同花顺可以压任何普通牌型
                    return sf;
                }
            }

            // 尝试找炸弹
            const bombs = this.findBombs(hand);
            for (const bomb of bombs) {
                if (lastPlay.type === 'straightFlush') {
                    // 只有6张及以上的炸弹能压同花顺
                    if (bomb.length >= 6) {
                        return bomb;
                    }
                } else if (lastPlay.type === 'bomb') {
                    // 炸弹压炸弹：张数更多或同张数value更大
                    if (bomb.length > lastPlay.length ||
                        (bomb.length === lastPlay.length && bomb[0].value > lastPlay.value)) {
                        return bomb;
                    }
                } else {
                    // 炸弹可以压任何普通牌型
                    return bomb;
                }
            }

            // 检查王炸
            const rocket = this.findRocket(hand);
            if (rocket) return rocket;
        }

        // 无法出牌，返回null表示pass
        return null;
    }

    // AI自由出牌策略（新一轮或自己出完后的自由出牌）
    selectFreePlay(hand) {
        const trumpRank = this.getCurrentLevelRank();

        // 统计手牌
        const counts = {};
        hand.forEach(c => {
            if (!counts[c.value]) counts[c.value] = [];
            counts[c.value].push(c);
        });

        // 0. 优先出10以下非级牌的真实单牌（小牌先走）
        const smallSingleCards = [];
        Object.entries(counts).forEach(([value, cards]) => {
            if (cards.length === 1) {
                const card = cards[0];
                // 检查是否是10以下、非级牌、非王牌
                if (!card.isJoker && card.rank !== trumpRank && card.value <= 10) {
                    smallSingleCards.push(card);
                }
            }
        });
        if (smallSingleCards.length > 0) {
            // 选择最小的一张
            smallSingleCards.sort((a, b) => a.value - b.value);
            return [smallSingleCards[0]];
        }

        // 1. 优先出三带二（如果有三张且有对子）
        const triples = [];
        const pairs = [];
        Object.entries(counts).forEach(([value, cards]) => {
            if (cards.length >= 3) triples.push({ value: parseInt(value), cards: cards.slice(0, 3) });
            if (cards.length >= 2) pairs.push({ value: parseInt(value), cards: cards.slice(0, 2) });
        });

        if (triples.length > 0 && pairs.length > 0) {
            // 找最小的三张和不同value的最小对子
            triples.sort((a, b) => a.value - b.value);
            const smallestTriple = triples[0];
            const validPair = pairs.find(p => p.value !== smallestTriple.value);
            if (validPair) {
                return [...smallestTriple.cards, ...validPair.cards];
            }
        }

        // 2. 出三张（如果有的话）
        if (triples.length > 0) {
            triples.sort((a, b) => a.value - b.value);
            return triples[0].cards;
        }

        // 3. 出对子（如果有的话）
        if (pairs.length > 0) {
            pairs.sort((a, b) => a.value - b.value);
            return pairs[0].cards;
        }

        // 4. 出最小的单张
        return [hand[hand.length - 1]];
    }

    getCurrentPlayerId() {
        const playerIds = this.getSortedPlayerIds();
        return playerIds[this.gameState.currentPlayer];
    }

    findPairs(hand) {
        const pairs = [];
        const counts = {};
        hand.forEach(c => {
            if (!counts[c.value]) counts[c.value] = [];
            counts[c.value].push(c);
        });
        Object.values(counts).forEach(cards => {
            if (cards.length >= 2) {
                pairs.push([cards[0], cards[1]]);
            }
        });
        return pairs.sort((a, b) => a[0].value - b[0].value);
    }

    findTriples(hand) {
        const triples = [];
        const counts = {};
        hand.forEach(c => {
            if (!counts[c.value]) counts[c.value] = [];
            counts[c.value].push(c);
        });
        Object.values(counts).forEach(cards => {
            if (cards.length >= 3) {
                triples.push([cards[0], cards[1], cards[2]]);
            }
        });
        return triples.sort((a, b) => a[0].value - b[0].value);
    }

    findTriplesWithPairs(hand) {
        const results = [];
        const counts = {};
        hand.forEach(c => {
            if (!counts[c.value]) counts[c.value] = [];
            counts[c.value].push(c);
        });

        const tripleValues = Object.keys(counts).filter(v => counts[v].length >= 3);
        const pairValues = Object.keys(counts).filter(v => counts[v].length >= 2);

        tripleValues.forEach(tv => {
            pairValues.forEach(pv => {
                if (tv !== pv) {
                    results.push({
                        triple: [counts[tv][0], counts[tv][1], counts[tv][2]],
                        pair: [counts[pv][0], counts[pv][1]],
                        tripleValue: parseInt(tv)
                    });
                }
            });
        });
        return results.sort((a, b) => a.tripleValue - b.tripleValue);
    }

    findStraightFlushes(hand) {
        const results = [];
        const rankToValue = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
        const trumpRank = this.getCurrentLevelRank();

        // 分离逢人配和其他牌
        const trumpCards = hand.filter(c => c.isTrump);
        const normalCards = hand.filter(c => !c.isJoker && !c.isTrump);

        // 获取牌的顺子值：级牌用原始rank值
        const getSeqValue = (c) => c.isLevelCard ? rankToValue[c.rank] : c.value;

        // 按花色分组
        const suitGroups = {};
        normalCards.forEach(c => {
            if (!suitGroups[c.suit]) suitGroups[c.suit] = [];
            suitGroups[c.suit].push(c);
        });

        // 顺子模式：10JQKA 到 A2345（从大到小遍历，优先匹配大的）
        const straights = [
            [10, 11, 12, 13, 14], // 10JQKA（最大）
            [9, 10, 11, 12, 13],
            [8, 9, 10, 11, 12],
            [7, 8, 9, 10, 11],
            [6, 7, 8, 9, 10],
            [5, 6, 7, 8, 9],
            [4, 5, 6, 7, 8],
            [3, 4, 5, 6, 7],
            [2, 3, 4, 5, 6],
            [14, 2, 3, 4, 5] // A2345（最小）
        ];

        // 对每个花色找同花顺
        for (const suit in suitGroups) {
            const suitCards = suitGroups[suit];
            const values = [...new Set(suitCards.map(c => getSeqValue(c)))];

            for (let i = 0; i < straights.length; i++) {
                const pattern = straights[i];
                let matchCount = 0;
                const usedCards = [];

                for (const v of pattern) {
                    const card = suitCards.find(c => getSeqValue(c) === v && !usedCards.includes(c));
                    if (card) {
                        matchCount++;
                        usedCards.push(card);
                    }
                }

                const needed = 5 - matchCount;
                if (needed <= trumpCards.length) {
                    // 可以组成同花顺
                    const sf = [...usedCards];
                    for (let j = 0; j < needed; j++) {
                        sf.push(trumpCards[j]);
                    }
                    if (sf.length === 5) {
                        results.push(sf);
                    }
                }
            }
        }

        // 按value排序（从大到小）
        return results.sort((a, b) => {
            const aMax = Math.max(...a.map(c => getSeqValue(c)));
            const bMax = Math.max(...b.map(c => getSeqValue(c)));
            return bMax - aMax;
        });
    }

    findBombs(hand) {
        const bombs = [];
        // 分离逢人配和普通牌
        const trumpCards = hand.filter(c => c.isTrump); // 逢人配（红心级牌）
        const normalCards = hand.filter(c => !c.isTrump && !c.isJoker);

        // 统计普通牌每个点数的数量
        const counts = {};
        normalCards.forEach(c => {
            if (!counts[c.value]) counts[c.value] = [];
            counts[c.value].push(c);
        });

        // 纯逢人配炸弹（4张逢人配）
        if (trumpCards.length >= 4) {
            bombs.push(trumpCards.slice(0, 4));
        }

        // 对于每个点数，检查是否能和逢人配组成炸弹
        Object.values(counts).forEach(cards => {
            // 纯普通牌炸弹
            if (cards.length >= 4) {
                bombs.push(cards.slice(0, 4));
            }
            // 混合炸弹：普通牌 + 逢人配
            else if (cards.length >= 1 && cards.length + trumpCards.length >= 4) {
                // 需要的逢人配数量
                const neededTrumps = 4 - cards.length;
                if (trumpCards.length >= neededTrumps) {
                    const bomb = [...cards, ...trumpCards.slice(0, neededTrumps)];
                    bombs.push(bomb);
                }
            }
        });

        // 按炸弹价值排序（value小的排前面）
        return bombs.sort((a, b) => {
            const getBombValue = (cards) => {
                const normal = cards.filter(c => !c.isTrump);
                return normal.length > 0 ? normal[0].value : 14.5; // 纯逢人配炸弹价值14.5
            };
            return getBombValue(a) - getBombValue(b);
        });
    }

    findRocket(hand) {
        const smallJokers = hand.filter(c => c.rank === '小王');
        const bigJokers = hand.filter(c => c.rank === '大王');
        if (smallJokers.length >= 2 && bigJokers.length >= 2) {
            return [smallJokers[0], smallJokers[1], bigJokers[0], bigJokers[1]];
        }
        return null;
    }

    getFinishedCount() {
        return Array.from(this.players.values()).filter(p => p.finished).length;
    }

    checkRoundEnd() {
        return this.getFinishedCount() >= 3;
    }

    // 检查双赢：同一队获得1、2名
    checkDoubleWin() {
        const finished = Array.from(this.players.values()).filter(p => p.finished);
        if (finished.length < 2) return false;

        const team1Ranks = finished.filter(p => p.team === 1).map(p => p.rank);
        const team2Ranks = finished.filter(p => p.team === 2).map(p => p.rank);

        // 检查是否有队伍同时获得1、2名
        return (team1Ranks.includes(1) && team1Ranks.includes(2)) ||
               (team2Ranks.includes(1) && team2Ranks.includes(2));
    }

    // 双赢结束这一局
    endRoundWithDoubleWin() {
        // FIX-008: 结算幂等（同 endRound）
        if (this.phase === 'settling') {
            console.log(`⚠️ 房间 ${this.id} 重复结算被忽略（phase 已是 settling）`);
            return;
        }
        // FIX-008: 进入结算期
        this.setPhase('settling');
        // 确定输的一方
        const t1 = Array.from(this.players.values()).filter(p => p.team === 1);
        const t2 = Array.from(this.players.values()).filter(p => p.team === 2);
        const t1r = t1.map(p => p.rank);
        const t2r = t2.map(p => p.rank);
        const winner = (t1r.includes(1) && t1r.includes(2)) ? 1 : 2;
        const loserTeam = winner === 1 ? 2 : 1;

        // 给输的一方的两个玩家随机分配3、4名
        const loserPlayers = Array.from(this.players.values()).filter(p => p.team === loserTeam);
        const shuffled = loserPlayers.sort(() => Math.random() - 0.5);
        shuffled[0].rank = 3;
        shuffled[0].finished = true;
        shuffled[1].rank = 4;
        shuffled[1].finished = true;

        const winnerTeam = winner === 1 ? '红队' : '蓝队';

        this.gameState.roundWinner = winner;
        this.gameState.levelUp = 3; // 双赢升3级

        // FIX-003: 与 endRound 同口径——结算先行复位，再统一写入本局结果。
        // （双赢路径原本就会无条件写，这里显式复位只为让「每局结算先复位」的不变式在两条结算入口上完全一致。）
        this.gameState.previousLevel = null;
        this.gameState.previousLevelTeam = null;

        // 在进贡阶段前更新级牌（赢的队伍升级）
        const currentLevel = this.gameState.teamLevels[winner];
        // 保存本局结算前的级别（用于判断是否是打A时的双赢）
        this.gameState.previousLevel = currentLevel;
        // 保存本局结算前的级牌队伍（用于判断是否是打自己的级牌）
        this.gameState.previousLevelTeam = this.gameState.currentLevelTeam;

        // FIX-008: 记录本局结算写入值快照（与 endRound 同口径）
        this.gameState.lastSettle = {
            winner, levelUp: 3,
            previousLevel: this.gameState.previousLevel,
            previousLevelTeam: this.gameState.previousLevelTeam,
            teamLevels: { ...this.gameState.teamLevels },
            at: Date.now()
        };

        // 检查是否满足通关条件（在发送消息前判断）
        // 1. 升级前就是A（14级）
        // 2. 是打自己的级牌（双赢前的 currentLevelTeam === winner）
        const isPlayingOwnLevel = this.gameState.currentLevelTeam === winner;
        const canPass = currentLevel === 14 && isPlayingOwnLevel;

        console.log(`房间 ${this.id} 双赢通关检查: winner=${winner}, currentLevel=${currentLevel}, currentLevelTeam=${this.gameState.currentLevelTeam}, isPlayingOwnLevel=${isPlayingOwnLevel}, canPass=${canPass}`);

        if (canPass) {
            // 满足通关条件，直接发送游戏结束消息（不发送roundEnd）
            this.broadcast({ type: 'gameOver', winner, message: '恭喜通关A！游戏结束' });
            // 重置双方级别到2
            this.gameState.teamLevels = { 1: 2, 2: 2 };
            this.gameState.started = false;
            // 重置玩家状态
            for (let p of this.players.values()) {
                p.finished = false;
                p.rank = 0;
                p.ready = p.isAI ? true : false;
            }
            this.broadcastPlayerList();
            // FIX-008: 通关分支完整清态 + 回 waiting（修 A-20）
            // 清 roundWinner/levelUp/previousLevel*/lastSettle —— 否则下一局的通关判定会读到上一局残留值；
            // phase 回 waiting 后，全员准备即可重新开局（checkStartGame 只认 waiting）。
            this.gameState.roundWinner = null;
            this.gameState.levelUp = 0;
            this.gameState.previousLevel = null;
            this.gameState.previousLevelTeam = null;
            this.gameState.lastSettle = null;
            this.setPhase('waiting');
            console.log(`房间 ${this.id} 通关！队伍${winner}双赢通关A！`);
            return;
        }

        // 不满足通关条件，正常升级并发送回合结束消息
        if (currentLevel < 14) {
            let newLevel = currentLevel + 3;
            if (newLevel > 14) {
                newLevel = 14;
            }
            this.gameState.teamLevels[winner] = newLevel;
        }
        // 更新当前级牌队伍为赢家队伍
        this.gameState.currentLevelTeam = winner;

        // 发送回合结束消息（不是游戏结束）
        this.broadcast({
            type: 'roundEnd',
            winner,
            levelUp: 3,
            loser: winner === 1 ? 2 : 1,
            ranks: Array.from(this.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                rank: p.rank,
                team: p.team
            })),
            teamLevels: this.gameState.teamLevels,
            previousLevel: this.gameState.previousLevel,
            previousLevelTeam: this.gameState.previousLevelTeam,
            message: `🎊 ${winnerTeam}双赢！升3级`
        });

        console.log(`房间 ${this.id} 双赢！队伍${winner}升3级`);

        this.gameState.started = false;

        // 广播状态更新
        this.broadcastGameState();

        // FIX-004(b): 对局结束时按统一判据检查是否该解散
        maybeDestroyRoom(this.id, '对局结束');
    }

    endRound() {
        // FIX-008: 结算幂等 —— 已处于结算态就忽略重复调用，保证「每局只广播一次 roundEnd /
        // 通关只广播一次 gameOver、只升级一次」（原实现无任何保护）。
        if (this.phase === 'settling') {
            console.log(`⚠️ 房间 ${this.id} 重复结算被忽略（phase 已是 settling）`);
            return;
        }
        // FIX-008: 进入结算期 —— 此后 isRoomInPlay=false，断线不再触发 AI 接管（修 A-17 毫秒窗口）
        this.setPhase('settling');
        // 给未出完牌的玩家分配第4名
        for (let player of this.players.values()) {
            if (!player.finished) {
                player.rank = 4;
                player.finished = true;
            }
        }

        const t1 = Array.from(this.players.values()).filter(p => p.team === 1);
        const t2 = Array.from(this.players.values()).filter(p => p.team === 2);
        const t1r = t1.map(p => p.rank);
        const t2r = t2.map(p => p.rank);

        let levelUp = 0, winner = null;
        let isGameOver = false; // 标记是否游戏结束

        // 获得第1名的队伍
        const firstPlaceTeam = t1r.includes(1) ? 1 : 2;

        // 检查双赢（搭档双方为一二名）→ 游戏结束
        if ((t1r.includes(1) && t1r.includes(2)) || (t2r.includes(1) && t2r.includes(2))) {
            winner = firstPlaceTeam;
            levelUp = 3; // 双赢升3级
            isGameOver = false; // 双赢只是结束这一局，不是游戏结束

            // 另一方随机分配3、4名
            const loserTeam = winner === 1 ? 2 : 1;
            const loserPlayers = (loserTeam === 1 ? t1 : t2).filter(p => !p.rank || p.rank === 0);
            if (loserPlayers.length === 2) {
                // 随机分配3、4名
                const shuffled = loserPlayers.sort(() => Math.random() - 0.5);
                shuffled[0].rank = 3;
                shuffled[1].rank = 4;
                // 更新玩家对象的rank
                for (const p of this.players.values()) {
                    const matched = loserPlayers.find(lp => lp.id === p.id);
                    if (matched) {
                        p.rank = matched.rank;
                    }
                }
            }
        }
        // 检查中赢（搭档双方为一三名）
        else if ((t1r.includes(1) && t1r.includes(3)) || (t2r.includes(1) && t2r.includes(3))) {
            levelUp = 2;
            winner = firstPlaceTeam;
        }
        // 检查小赢（搭档双方为一四名）
        else if ((t1r.includes(1) && t1r.includes(4)) || (t2r.includes(1) && t2r.includes(4))) {
            levelUp = 1;
            winner = firstPlaceTeam;
        }
        // 失败（搭档双方为二三、二四、三四名）
        else {
            levelUp = 0;
            // 获得第1名的队伍获胜，失败方改打对方级牌
            winner = firstPlaceTeam;
        }

        this.gameState.roundWinner = winner;
        this.gameState.levelUp = levelUp;

        // FIX-003: 每局结算**先行复位**通关判定用的两个字段，再统一写入本局结果（所有分支都写）。
        // 原实现只在 winner && levelUp > 0 时写 → levelUp=0（失败局）会留着上一局的旧值，
        // 下一局的 startNewRound 通关判定读到陈值（previousLevel===14 且 levelUp===3）就可能误判通关。
        this.gameState.previousLevel = null;
        this.gameState.previousLevelTeam = null;

        // 在进贡阶段前更新级牌（赢的队伍升级）
        if (winner) {
            const currentLevel = this.gameState.teamLevels[winner];
            // 保存本局结算前的级别（用于判断是否是打A时的双赢）
            this.gameState.previousLevel = currentLevel;
            // 保存本局结算前的级牌队伍（用于判断是否是打自己的级牌）
            this.gameState.previousLevelTeam = this.gameState.currentLevelTeam;
        }

        // 仅升级局才改动级牌与级牌队伍（失败局 levelUp=0 保持原状，维持原有行为不变）
        if (winner && levelUp > 0) {
            const currentLevel = this.gameState.teamLevels[winner];
            if (currentLevel < 14) {
                let newLevel = currentLevel + levelUp;
                if (newLevel > 14) {
                    newLevel = 14;
                }
                this.gameState.teamLevels[winner] = newLevel;
            }
            // 更新当前级牌队伍为赢家队伍
            this.gameState.currentLevelTeam = winner;
        }

        // FIX-008: 记录【本局结算写入的值】快照 —— startNewRound 的通关判定只读这份快照，
        // 保证读到的一定是本局结算写入的 winner/levelUp/previousLevel/previousLevelTeam。
        this.gameState.lastSettle = {
            winner, levelUp,
            previousLevel: this.gameState.previousLevel,
            previousLevelTeam: this.gameState.previousLevelTeam,
            teamLevels: { ...this.gameState.teamLevels },
            at: Date.now()
        };

        // 发送回合结束消息
        this.broadcast({
            type: 'roundEnd', winner, levelUp,
            loser: winner === 1 ? 2 : 1,
            ranks: Array.from(this.players.values()).map(p => ({ name: p.name, team: p.team, rank: p.rank })),
            teamLevels: this.gameState.teamLevels,
            previousLevel: this.gameState.previousLevel || this.gameState.teamLevels[winner]
        });

        const resultText = levelUp === 3 ? '双赢' : levelUp === 2 ? '中赢' : levelUp === 1 ? '小赢' : '失败';
        console.log(`房间 ${this.id} 回合结束，队伍${winner}${resultText}，升级${levelUp}级`);

        // FIX-004(b): 回合结束时按统一判据检查是否该解散
        maybeDestroyRoom(this.id, '回合结束');
    }

    // 新局发牌动画（带进贡标记）
    animateDealCardsNewRound(playerIds, lastRanks, isDoubleWin, lastLevelUp) {
        const allCards = [];
        // 按顺序收集所有牌（每个玩家27张，轮流发）
        for (let i = 0; i < 27; i++) {
            for (let p = 0; p < 4; p++) {
                const hand = this.gameState.hands[playerIds[p]];
                if (hand[i]) {
                    allCards.push({ playerIndex: p, card: hand[i] });
                }
            }
        }

        // 计算需要进贡的玩家
        const tributePlayers = this.calculateTributePlayers(lastRanks, isDoubleWin, lastLevelUp);

        // 找到每个进贡玩家需要进贡的牌
        const tributeCards = {};
        for (const tp of tributePlayers) {
            const card = this.getMaxNonTrumpCardForPlayer(playerIds[tp.playerIndex]);
            if (card) {
                tributeCards[`${tp.playerIndex}-${card.suit}-${card.rank}`] = true;
            }
        }

        let cardIndex = 0;
        const dealInterval = registerTimer(this, 'deal', () => {
            if (cardIndex < allCards.length) {
                const { playerIndex, card } = allCards[cardIndex];
                const cardKey = `${playerIndex}-${card.suit}-${card.rank}`;
                const isTributeCard = tributeCards[cardKey] || false;
                this.broadcast({
                    type: 'dealCard',
                    playerIndex: playerIndex,
                    card: card,
                    isTributeCard: isTributeCard
                });
                cardIndex++;
            } else {
                unregisterTimer(this, dealInterval);
                // 发牌完成，2秒后进入进贡阶段
                registerTimer(this, 'deal', () => {
                    this.processTributePhase(playerIds, lastRanks, isDoubleWin, lastLevelUp);
                }, 2000);
            }
        }, 30, true); // 每30ms发一张牌
    }

    // 计算需要进贡的玩家
    calculateTributePlayers(lastRanks, isDoubleWin, lastLevelUp) {
        const player3 = lastRanks.find(p => p.rank === 3);
        const player4 = lastRanks.find(p => p.rank === 4);
        const player1 = lastRanks.find(p => p.rank === 1);
        const player2 = lastRanks.find(p => p.rank === 2);

        // 获取排序后的玩家ID列表
        const sortedPlayerIds = this.getSortedPlayerIds();

        // 获取玩家索引
        const getPlayerIndex = (player) => {
            return sortedPlayerIds.indexOf(player.id);
        };

        const tributePlayers = [];

        // 检查双下抗贡
        const doubleDownResist = isDoubleWin && this.checkDoubleDownResistWithRanks(lastRanks);
        if (doubleDownResist) {
            // 双下抗贡成功，不需要进贡
            return [];
        }

        if (isDoubleWin) {
            // 双赢情况：3名和4名都进贡
            if (player3) {
                const p3Resist = this.canResistTribute(player3.id);
                if (!p3Resist) {
                    tributePlayers.push({ playerIndex: getPlayerIndex(player3), player: player3 });
                }
            }
            if (player4) {
                const p4Resist = this.canResistTribute(player4.id);
                if (!p4Resist) {
                    tributePlayers.push({ playerIndex: getPlayerIndex(player4), player: player4 });
                }
            }
        } else {
            // 非双赢情况：只有4名进贡
            if (player4) {
                const p4Resist = this.canResistTribute(player4.id);
                if (!p4Resist) {
                    tributePlayers.push({ playerIndex: getPlayerIndex(player4), player: player4 });
                }
            }
        }

        return tributePlayers;
    }

    // 检查双下抗贡（使用lastRanks参数）
    checkDoubleDownResistWithRanks(lastRanks) {
        if (!lastRanks) return false;
        const player3 = lastRanks.find(p => p.rank === 3);
        const player4 = lastRanks.find(p => p.rank === 4);
        if (!player3 || !player4) return false;
        const loserTeam = player3.team;
        // 获取输家队的所有玩家
        const losers = lastRanks.filter(p => p.team === loserTeam);
        let totalBigJokers = 0;
        for (const loser of losers) {
            const hand = this.gameState.hands[loser.id];
            if (hand) {
                totalBigJokers += hand.filter(c => c.rank === '大王').length;
            }
        }
        return totalBigJokers >= 2;
    }

    // 检查玩家是否能抗贡
    canResistTribute(playerId) {
        const hand = this.gameState.hands[playerId];
        if (!hand) return false;
        const bigJokers = hand.filter(c => c.rank === '大王');
        return bigJokers.length >= 2;
    }

    // 获取玩家最大的非逢人配牌
    getMaxNonTrumpCardForPlayer(playerId) {
        const trumpRank = this.getCurrentLevelRank();
        const hand = this.gameState.hands[playerId];
        if (!hand) return null;
        // 过滤掉逢人配（红桃级牌）
        const nonTrumpCards = hand.filter(c => !(c.suit === '♥' && c.rank === trumpRank));
        if (nonTrumpCards.length === 0) return null;
        // 按value排序，返回最大的
        nonTrumpCards.sort((a, b) => b.value - a.value);
        return nonTrumpCards[0];
    }

    // 进贡阶段处理
    processTributePhase(playerIds, lastRanks, isDoubleWin, lastLevelUp) {
        // FIX-008: 进贡/还贡是显式状态（该阶段不得被 AI 接管、不得开局）
        this.setPhase('tribute');
        const player1 = lastRanks.find(p => p.rank === 1);
        const player2 = lastRanks.find(p => p.rank === 2);
        const player3 = lastRanks.find(p => p.rank === 3);
        const player4 = lastRanks.find(p => p.rank === 4);
        const trumpRank = this.getCurrentLevelRank();

        // 检查双下抗贡
        const doubleDownResist = isDoubleWin && this.checkDoubleDownResistWithRanks(lastRanks);

        if (doubleDownResist) {
            console.log(`房间 ${this.id} 双下抗贡成功，无需进贡`);
            this.broadcast({ type: 'tributeResist', playerId: player3.id, playerName: `${player3.name}和${player4.name}双下抗贡` });
        }

        // 获取最大的非逢人配牌
        const getMaxNonTrumpCard = (playerId) => {
            return this.getMaxNonTrumpCardForPlayer(playerId);
        };

        // 从手牌中移除一张牌
        const removeCardFromHand = (playerId, card) => {
            const hand = this.gameState.hands[playerId];
            if (!hand || !card) return;
            const idx = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
            if (idx !== -1) {
                hand.splice(idx, 1);
            }
        };

        // 添加牌到手牌
        const addCardToHand = (playerId, card) => {
            const hand = this.gameState.hands[playerId];
            if (hand && card) {
                hand.push(card);
            }
        };

        // 初始化还贡阶段状态
        this.gameState.returnPhase = {
            pending: [], // 待还贡的玩家列表 [{returnFromId, returnToId, tributeCard, tributeFromName}]
            completed: [] // 已完成的还贡
        };

        // 执行进贡
        if (!doubleDownResist && isDoubleWin && player3 && player4 && player1 && player2) {
            // 双赢：3、4名都进贡，1名拿最大的，2名拿另一张
            console.log(`房间 ${this.id} 双赢进贡：3名和4名进贡，1名拿最大的，2名拿另一张`);
            const p3Resist = this.canResistTribute(player3.id);
            const p4Resist = this.canResistTribute(player4.id);
            let tribute3 = null, tribute4 = null;

            // 3名进贡
            if (!p3Resist) {
                tribute3 = getMaxNonTrumpCard(player3.id);
                if (tribute3) {
                    this.broadcast({
                        type: 'tributePhase',
                        tributeFrom: player3.id,
                        tributeFromName: player3.name,
                        tributeTo: player1.id,
                        tributeToName: player1.name,
                        canResistTribute: false
                    });
                    removeCardFromHand(player3.id, tribute3);
                    this.broadcast({
                        type: 'tributeDone',
                        playerId: player3.id,
                        playerName: player3.name,
                        card: tribute3,
                        toName: '待定'
                    });
                }
            } else {
                this.broadcast({ type: 'tributeResist', playerId: player3.id, playerName: player3.name });
            }

            // 4名进贡
            if (!p4Resist) {
                tribute4 = getMaxNonTrumpCard(player4.id);
                if (tribute4) {
                    this.broadcast({
                        type: 'tributePhase',
                        tributeFrom: player4.id,
                        tributeFromName: player4.name,
                        tributeTo: player2.id,
                        tributeToName: player2.name,
                        canResistTribute: false
                    });
                    removeCardFromHand(player4.id, tribute4);
                    this.broadcast({
                        type: 'tributeDone',
                        playerId: player4.id,
                        playerName: player4.name,
                        card: tribute4,
                        toName: '待定'
                    });
                }
            } else {
                this.broadcast({ type: 'tributeResist', playerId: player4.id, playerName: player4.name });
            }

            // 比较两张牌，1名拿最大的，2名拿另一张
            if (tribute3 && tribute4) {
                if (tribute3.value >= tribute4.value) {
                    addCardToHand(player1.id, tribute3);
                    addCardToHand(player2.id, tribute4);
                    this.broadcast({ type: 'tributeDone', playerId: player3.id, playerName: player3.name, card: tribute3, toName: player1.name });
                    this.broadcast({ type: 'tributeDone', playerId: player4.id, playerName: player4.name, card: tribute4, toName: player2.name });
                    // 设置还贡等待
                    this.gameState.returnPhase.pending.push({ returnFromId: player1.id, returnToId: player3.id, tributeCard: tribute3, tributeFromName: player3.name });
                    this.gameState.returnPhase.pending.push({ returnFromId: player2.id, returnToId: player4.id, tributeCard: tribute4, tributeFromName: player4.name });
                } else {
                    addCardToHand(player1.id, tribute4);
                    addCardToHand(player2.id, tribute3);
                    this.broadcast({ type: 'tributeDone', playerId: player4.id, playerName: player4.name, card: tribute4, toName: player1.name });
                    this.broadcast({ type: 'tributeDone', playerId: player3.id, playerName: player3.name, card: tribute3, toName: player2.name });
                    // 设置还贡等待
                    this.gameState.returnPhase.pending.push({ returnFromId: player1.id, returnToId: player4.id, tributeCard: tribute4, tributeFromName: player4.name });
                    this.gameState.returnPhase.pending.push({ returnFromId: player2.id, returnToId: player3.id, tributeCard: tribute3, tributeFromName: player3.name });
                }
            } else if (tribute3) {
                addCardToHand(player1.id, tribute3);
                this.broadcast({ type: 'tributeDone', playerId: player3.id, playerName: player3.name, card: tribute3, toName: player1.name });
                this.gameState.returnPhase.pending.push({ returnFromId: player1.id, returnToId: player3.id, tributeCard: tribute3, tributeFromName: player3.name });
            } else if (tribute4) {
                addCardToHand(player1.id, tribute4);
                this.broadcast({ type: 'tributeDone', playerId: player4.id, playerName: player4.name, card: tribute4, toName: player1.name });
                this.gameState.returnPhase.pending.push({ returnFromId: player1.id, returnToId: player4.id, tributeCard: tribute4, tributeFromName: player4.name });
            }

            // 进贡给头游的玩家先出牌
            let firstPlayer = null;
            if (tribute3 && tribute4) {
                if (tribute3.value >= tribute4.value) {
                    firstPlayer = player3;
                } else {
                    firstPlayer = player4;
                }
            } else if (tribute3) {
                firstPlayer = player3;
            } else if (tribute4) {
                firstPlayer = player4;
            } else {
                firstPlayer = player1;
            }
            this.gameState.currentPlayer = playerIds.indexOf(firstPlayer.id);
        } else if (!doubleDownResist && !isDoubleWin && player4 && player1) {
            // 非双赢：4名进贡给1名
            console.log(`房间 ${this.id} 单贡：4名->1名`);
            const p4Resist = this.canResistTribute(player4.id);
            if (!p4Resist) {
                const tribute4 = getMaxNonTrumpCard(player4.id);
                if (tribute4) {
                    this.broadcast({
                        type: 'tributePhase',
                        tributeFrom: player4.id,
                        tributeFromName: player4.name,
                        tributeTo: player1.id,
                        tributeToName: player1.name,
                        canResistTribute: false
                    });
                    removeCardFromHand(player4.id, tribute4);
                    addCardToHand(player1.id, tribute4);
                    this.broadcast({ type: 'tributeDone', playerId: player4.id, playerName: player4.name, card: tribute4, toName: player1.name });
                    // 设置还贡等待
                    this.gameState.returnPhase.pending.push({ returnFromId: player1.id, returnToId: player4.id, tributeCard: tribute4, tributeFromName: player4.name });
                }
            } else {
                this.broadcast({ type: 'tributeResist', playerId: player4.id, playerName: player4.name });
            }
            // 进贡方先出牌
            this.gameState.currentPlayer = playerIds.indexOf(player4.id);
        } else {
            // 抗贡局或第一局
            if (player1) {
                // 抗贡局：上一局头游先出牌
                this.gameState.currentPlayer = playerIds.indexOf(player1.id);
                console.log(`房间 ${this.id} 抗贡局：头游 ${player1.name} 先出牌`);
            } else {
                // 第一局：按红桃3确定首出
                for (let i = 0; i < 4; i++) {
                    if (this.gameState.hands[playerIds[i]].some(c => c.suit === '♥' && c.rank === '3')) {
                        this.gameState.currentPlayer = i;
                        break;
                    }
                }
            }
        }

        // 如果有待还贡的玩家，进入还贡阶段
        if (this.gameState.returnPhase.pending.length > 0) {
            // 收集需要还贡的人类玩家ID（用于后续排除广播）
            const returnPlayerIds = new Set();

            // 为每个需要还贡的人类玩家单独发送还贡阶段消息（包含更新后的手牌）
            for (const pending of this.gameState.returnPhase.pending) {
                const player = this.players.get(pending.returnFromId);
                if (player && !player.isAI) {
                    returnPlayerIds.add(pending.returnFromId);

                    // 检查玩家是否托管，托管则自动还贡
                    if (player.autoPlay) {
                        console.log(`房间 ${this.id} 托管玩家 ${pending.returnFromId} 自动还贡`);
                        setTimeout(() => this.aiReturnTribute(pending.returnFromId), 1500);
                    } else if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                        // 非托管玩家，发送包含手牌的消息让其手工选择
                        player.ws.send(JSON.stringify({
                            type: 'returnPhaseStart',
                            pendingReturns: this.gameState.returnPhase.pending.map(p => ({
                                returnFromId: p.returnFromId,
                                returnToId: p.returnToId,
                                tributeCard: p.tributeCard,
                                tributeFromName: p.tributeFromName
                            })),
                            myHand: this.gameState.hands[pending.returnFromId]
                        }));
                        console.log(`房间 ${this.id} 发送还贡阶段消息给玩家 ${pending.returnFromId}，等待手工选择`);
                    }
                }
            }

            // 广播还贡阶段开始给其他玩家（排除已单独发送的玩家）
            const msg = JSON.stringify({
                type: 'returnPhaseStart',
                pendingReturns: this.gameState.returnPhase.pending.map(p => ({
                    returnFromId: p.returnFromId,
                    returnToId: p.returnToId,
                    tributeCard: p.tributeCard,
                    tributeFromName: p.tributeFromName
                }))
            });
            this.players.forEach((p, pid) => {
                // 排除已单独发送的玩家
                if (returnPlayerIds.has(pid)) return;
                if (p.ws && p.ws.readyState === WebSocket.OPEN) {
                    p.ws.send(msg);
                }
            });
            // 观战者也发送
            this.spectators.forEach((s, sid) => {
                if (s.ws && s.ws.readyState === WebSocket.OPEN) {
                    s.ws.send(msg);
                }
            });

            // 为AI玩家自动执行还贡
            for (const pending of this.gameState.returnPhase.pending) {
                const player = this.players.get(pending.returnFromId);
                if (player && player.isAI) {
                    // AI玩家延迟后自动还贡
                    setTimeout(() => this.aiReturnTribute(pending.returnFromId), 1500);
                }
            }
        } else {
            // 无需还贡，直接开始出牌阶段
            this.broadcast({ type: 'tributeExchange', records: [] });
            setTimeout(() => {
                this.startPlayPhase();
            }, 2000);
        }
    }

    // AI玩家自动还贡（选择除级牌以外最小的单牌）
    aiReturnTribute(playerId) {
        const pending = this.gameState.returnPhase?.pending.find(p => p.returnFromId === playerId);
        if (!pending) return;

        const trumpRank = this.getCurrentLevelRank();
        const hand = this.gameState.hands[playerId];
        if (!hand) return;

        // 过滤出可以还贡的牌（非级牌，10及以下）
        const validCards = hand.filter(c => {
            if (c.isJoker) return false; // 不能还王
            if (c.rank === trumpRank) return false; // 不能还级牌
            if (c.value > 10) return false; // 只能还10及以下
            return true;
        });

        if (validCards.length === 0) {
            // 没有可还贡的牌，跳过
            console.log(`房间 ${this.id} AI玩家 ${playerId} 没有可还贡的牌`);
            this.completeReturnTribute(playerId, null);
            return;
        }

        // 选择最小的牌
        validCards.sort((a, b) => a.value - b.value);
        const returnCard = validCards[0];

        // 执行还贡
        this.executeReturnTribute(playerId, returnCard);
    }

    // 执行还贡操作
    executeReturnTribute(playerId, card) {
        const pending = this.gameState.returnPhase?.pending.find(p => p.returnFromId === playerId);
        if (!pending) return { success: false, message: '无需还贡' };

        // 从手牌中移除
        const hand = this.gameState.hands[playerId];
        const idx = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
        if (idx === -1) return { success: false, message: '手牌中没有这张牌' };
        hand.splice(idx, 1);

        // 添加到目标玩家手牌
        const targetHand = this.gameState.hands[pending.returnToId];
        if (targetHand) {
            targetHand.push(card);
        }

        // 广播还贡完成
        const player = this.players.get(playerId);
        this.broadcast({
            type: 'returnDone',
            playerId: playerId,
            playerName: player ? player.name : '玩家',
            card: card,
            tributeFromName: pending.tributeFromName
        });

        // 记录完成的还贡
        this.gameState.returnPhase.completed.push({
            ...pending,
            returnCard: card
        });

        // 从待处理列表中移除
        this.gameState.returnPhase.pending = this.gameState.returnPhase.pending.filter(p => p.returnFromId !== playerId);

        // 检查是否所有还贡都完成
        this.checkAllReturnsComplete();

        return { success: true };
    }

    // 处理玩家还贡请求
    handleReturnTribute(playerId, cardIndex) {
        const pending = this.gameState.returnPhase?.pending.find(p => p.returnFromId === playerId);
        if (!pending) {
            return { success: false, message: '无需还贡' };
        }

        const hand = this.gameState.hands[playerId];
        if (!hand || cardIndex < 0 || cardIndex >= hand.length) {
            return { success: false, message: '无效的牌' };
        }

        const card = hand[cardIndex];
        const trumpRank = this.getCurrentLevelRank();

        // 验证还贡牌是否合法
        if (card.isJoker) {
            return { success: false, message: '不能还贡王' };
        }
        // 检查级牌：使用isLevelCard属性或rank等于级牌
        if (card.isLevelCard || card.rank === trumpRank) {
            return { success: false, message: '不能还贡级牌' };
        }
        if (card.value > 10) {
            return { success: false, message: '只能还贡10及以下的牌' };
        }

        return this.executeReturnTribute(playerId, card);
    }

    // 检查所有还贡是否完成
    checkAllReturnsComplete() {
        if (this.gameState.returnPhase?.pending.length === 0) {
            // 所有还贡完成，广播交换完成
            const tributeRecords = this.gameState.returnPhase.completed.map(c => ({
                fromName: c.tributeFromName,
                toName: this.players.get(c.returnFromId)?.name || '玩家',
                tributeCard: c.tributeCard,
                returnCard: c.returnCard
            }));

            this.broadcast({ type: 'tributeExchange', records: tributeRecords });

            // 延迟后直接开始出牌阶段（牌已经发过了，不需要重新发牌）
            setTimeout(() => {
                this.startPlayPhase();
            }, 2000);
        }
    }

    // 开始出牌阶段（进贡/还贡完成后）
    startPlayPhase() {
        this.gameState.started = true;
        // FIX-008: 进贡结束 = 正式对局中（此后 isRoomInPlay 放行，下面补挂的接管才有效）
        this.setPhase('playing');

        // FIX-005: 新一局进入对局中时，为仍处于断线状态的真人座位补挂 30 秒接管
        //（结算期挂的接管会被 isRoomInPlay 复查放弃，故在真正开打时补挂，避免断线座位永久卡住）。
        for (const [pid, p] of this.players.entries()) {
            if (!p.isAI && p.disconnected && !p.ws) armTakeoverTimer(this, pid, 30000);
        }

        const playerIds = this.getSortedPlayerIds();

        // 只有当 currentPlayer 未设置或无效时，才按红桃3确定首出
        // （抗贡局已在 processTributePhase 中正确设置了首出玩家）
        if (this.gameState.currentPlayer < 0 || this.gameState.currentPlayer >= 4) {
            for (let i = 0; i < 4; i++) {
                const hand = this.gameState.hands[playerIds[i]];
                if (hand.some(card => card.suit === '♥' && card.rank === '3')) {
                    this.gameState.currentPlayer = i;
                    break;
                }
            }
        }

        // 广播游戏开始
        this.broadcast({ type: 'gameStart', gameState: this.getPublicGameState() });

        console.log(`房间 ${this.id} 进贡完成，开始出牌，首出玩家索引: ${this.gameState.currentPlayer}`);

        // 如果轮到AI玩家，延迟后自动出牌
        const currentPlayerId = playerIds[this.gameState.currentPlayer];
        const currentPlayer = this.players.get(currentPlayerId);
        if (currentPlayer && currentPlayer.isAI) {
            const delay = 1000 + Math.random() * 1000;
            setTimeout(() => this.aiPlayCards(currentPlayerId), delay);
        }
    }

    // 测试模式：模拟胜利场景
    testWinScenario(winType) {
        console.log(`房间 ${this.id} testWinScenario 开始: ${winType}`);
        const playerList = Array.from(this.players.values());
        const team1 = playerList.filter(p => p.team === 1);
        const team2 = playerList.filter(p => p.team === 2);

        console.log(`team1: ${team1.map(p => p.name).join(', ')}`);
        console.log(`team2: ${team2.map(p => p.name).join(', ')}`);

        // 重置所有玩家的状态
        for (let p of playerList) {
            p.finished = false;
            p.rank = 0;
        }

        switch(winType) {
            case 'double':
                // 红队双赢：红队1、2名
                team1[0].rank = 1;
                team1[0].finished = true;
                team1[1].rank = 2;
                team1[1].finished = true;
                team2[0].rank = 3;
                team2[0].finished = true;
                team2[1].rank = 4;
                team2[1].finished = true;
                break;
            case 'medium':
                // 红队中赢：红队1、3名
                team1[0].rank = 1;
                team1[0].finished = true;
                team2[0].rank = 2;
                team2[0].finished = true;
                team1[1].rank = 3;
                team1[1].finished = true;
                team2[1].rank = 4;
                team2[1].finished = true;
                break;
            case 'small':
                // 红队小赢：红队1、4名
                team1[0].rank = 1;
                team1[0].finished = true;
                team2[0].rank = 2;
                team2[0].finished = true;
                team2[1].rank = 3;
                team2[1].finished = true;
                team1[1].rank = 4;
                team1[1].finished = true;
                break;
            case 'fail':
                // 蓝队双赢：蓝队1、2名（红队失败）
                team2[0].rank = 1;
                team2[0].finished = true;
                team2[1].rank = 2;
                team2[1].finished = true;
                team1[0].rank = 3;
                team1[0].finished = true;
                team1[1].rank = 4;
                team1[1].finished = true;
                break;
        }

        console.log(`名次分配完成，准备结束回合`);

        // 检查双赢并结束回合
        const isDoubleWin = this.checkDoubleWin();
        console.log(`checkDoubleWin 结果: ${isDoubleWin}`);

        if (isDoubleWin) {
            this.endRoundWithDoubleWin();
        } else {
            this.endRound();
        }

        console.log(`房间 ${this.id} 测试模式完成: ${winType}`);
    }

    startNewRound() {
        // FIX-008: 通关判定只读【本局结算写入的快照】(lastSettle)，不再读会被中间步骤改写/残留的
        // gameState.roundWinner / previousLevel 等字段。原实现用 `|| 2` / `|| winner` 兜底，
        // 恰好会把「并没有结算过」的场合伪造成一个合法局面 → 可能误判通关（修 A-20）。
        const settle = this.gameState.lastSettle;
        if (!settle) {
            console.log(`⚠️ 房间 ${this.id} 新局被拒：缺少本局结算快照（lastSettle 为空）`);
            return;
        }
        const winner = settle.winner;
        const levelUp = settle.levelUp;

        // A级别通关条件：
        // 1. 升级前就是A（14级）
        // 2. 双赢（levelUp === 3）
        // 3. 是打自己的级牌（双赢前的 currentLevelTeam === winner）
        const previousLevel = settle.previousLevel;
        const previousLevelTeam = settle.previousLevelTeam;
        const isPlayingOwnLevel = previousLevelTeam === winner;

        console.log(`房间 ${this.id} 通关检查: winner=${winner}, previousLevel=${previousLevel}, levelUp=${levelUp}, previousLevelTeam=${previousLevelTeam}, isPlayingOwnLevel=${isPlayingOwnLevel}`);

        if (winner && previousLevel === 14 && levelUp === 3 && isPlayingOwnLevel) {
            // 满足所有通关条件，游戏结束
            this.broadcast({ type: 'gameOver', winner, message: '恭喜通关A！游戏结束' });
            // 重置双方级别到2
            this.gameState.teamLevels = { 1: 2, 2: 2 };
            this.gameState.started = false;
            // 重置玩家状态
            for (let p of this.players.values()) {
                p.finished = false;
                p.rank = 0;
                p.ready = p.isAI ? true : false;
            }
            this.broadcastPlayerList();
            // FIX-008: 通关分支完整清态 + 回 waiting（修 A-20，同双赢入口）
            this.gameState.roundWinner = null;
            this.gameState.levelUp = 0;
            this.gameState.previousLevel = null;
            this.gameState.previousLevelTeam = null;
            this.gameState.lastSettle = null;
            this.setPhase('waiting');
            return;
        }

        // 如果刚升到A，继续打A
        if (this.gameState.teamLevels[winner] === 14) {
            console.log(`房间 ${this.id} 升级到A，继续打A`);
        }

        // 级牌已在endRound中更新，这里不再重复升级

        for (let p of this.players.values()) {
            p.finished = false;
            p.ready = p.isAI ? true : false; // AI玩家自动准备
        }

        // 保存上一局的名次信息（在重置rank之前）
        const lastRanks = Array.from(this.players.values()).map(p => ({ id: p.id, name: p.name, rank: p.rank, team: p.team }));
        const player1 = lastRanks.find(p => p.rank === 1);
        const player2 = lastRanks.find(p => p.rank === 2);
        const player3 = lastRanks.find(p => p.rank === 3);
        const player4 = lastRanks.find(p => p.rank === 4);

        // 判断是否双赢（在重置levelUp之前）
        const lastLevelUp = this.gameState.levelUp;
        const isDoubleWin = lastLevelUp === 3;

        // 现在重置rank和levelUp
        for (let p of this.players.values()) {
            p.rank = 0;
        }
        this.gameState.levelUp = 0;

        this.gameState.hands = this.dealCards();
        this.gameState.currentPlayer = 0;
        this.gameState.lastPlay = null;
        this.gameState.lastPlayer = null;
        this.gameState.passedPlayers = [];
        this.gameState.roundWinner = null;

        // 获取排序后的玩家ID列表
        const playerIds = this.getSortedPlayerIds();

        // FIX-008: 进入「新一局发牌」状态（该阶段不得被 AI 接管；发牌 → tribute → playing）
        this.setPhase('newRound');

        // 先关闭结算界面
        this.broadcast({ type: 'closeRoundEndModal' });

        // 通知客户端新一局开始（重置记牌器等）
        this.broadcast({ type: 'newRound' });

        // 执行逐张发牌动画（带进贡标记），发牌完成后自动进入进贡阶段
        this.animateDealCardsNewRound(playerIds, lastRanks, isDoubleWin, lastLevelUp);
        console.log(`房间 ${this.id} 新一局开始发牌`);
    }

    broadcast(msg) {
        const data = JSON.stringify(msg);
        // 向玩家发送（跳过AI玩家，他们没有ws连接）
        this.players.forEach((p, pid) => {
            if (p.ws && p.ws.readyState === WebSocket.OPEN) {
                if (msg.type === 'gameStart' || msg.type === 'gameState' || msg.type === 'newRound' || msg.type === 'showGameArea') {
                    p.ws.send(JSON.stringify({ ...msg, gameState: this.getPlayerGameState(pid) }));
                } else {
                    p.ws.send(data);
                }
            }
        });
        // 向观战者发送（保持每个观战者当前查看的玩家）
        this.spectators.forEach((s, sid) => {
            if (s.ws.readyState === WebSocket.OPEN) {
                if (msg.type === 'gameStart' || msg.type === 'gameState' || msg.type === 'newRound' || msg.type === 'showGameArea') {
                    // 默认查看当前出牌玩家（FIX-007a: 只认本房玩家 id，越界一律回落默认视角）
                    const playerIds = this.getSortedPlayerIds();
                    const viewPid = (s.viewPlayerId && playerIds.includes(s.viewPlayerId))
                        ? s.viewPlayerId
                        : (playerIds[this.gameState.currentPlayer] || playerIds[0]);
                    s.ws.send(JSON.stringify({ ...msg, gameState: this.getSpectatorGameState(viewPid) }));
                } else {
                    s.ws.send(data);
                }
            }
        });
    }

    // 设置观战者查看的玩家
    // FIX-007a: 范围校验 —— 只能看本房玩家的手牌；越界/伪造 id 返回 false 且**不改**状态。
    setSpectatorViewPlayer(spectatorId, viewPlayerId) {
        const spectator = this.spectators.get(spectatorId);
        if (!spectator) return false;
        if (!this.players.has(viewPlayerId)) {
            console.log(`⚠️ 观战者 ${spectatorId} 请求越界视角被拒: viewPlayerId=${viewPlayerId}`);
            return false;
        }
        spectator.viewPlayerId = viewPlayerId;
        return true;
    }

    broadcastGameState() {
        // 为每个玩家发送包含其手牌的游戏状态
        for (const [playerId, player] of this.players) {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                    type: 'gameState',
                    gameState: this.getPlayerGameState(playerId)
                }));
            }
        }
        // 观战者发送公共状态
        for (const [spectatorId, spectator] of this.spectators) {
            if (spectator.ws && spectator.ws.readyState === WebSocket.OPEN) {
                spectator.ws.send(JSON.stringify({
                    type: 'gameState',
                    gameState: {
                        ...this.getPublicGameState(),
                        isSpectator: true,
                        viewPlayerId: spectator.viewPlayerId || this.getSortedPlayerIds()[0]
                    }
                }));
            }
        }
    }

    broadcastPlayerList() {
        // FIX-005: 统一按座位序（getSortedPlayerIds）下发 —— 消除「有的接口插入序、有的座位序」的口径差异。
        // 客户端按 playerNum 定位座位，本改动对显示无影响，仅保证协议层顺序唯一（修 A-18）。
        const ids = this.getSortedPlayerIds();
        this.broadcast({
            type: 'playerList',
            // B6-1（收尾小修）: 下发「当前有效房主座位 id」——客户端据此把「添加AI / 测试模式 / 新局」
            // 三个管理入口对非房主置灰（FIX-007b 的服务端鉴权本体一字未改，这里只是让客户端提前知道谁是房主）。
            // 取 getEffectiveHostId（与 isRoomHost 同源）而非裸 room.hostId，避免房主断线顺位期间客户端与服务端结论不一致。
            hostId: getEffectiveHostId(this),
            players: ids.map(id => {
                const p = this.players.get(id);
                return { id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready, isAI: p.isAI };
            })
        });
    }
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ==================== FIX-002: 每连接消息频率限制（轻量令牌桶） ====================
// 平均速率按 MSG_RATE_PER_MINUTE（OWASP 起点 100 条/分钟）放行，MSG_RATE_BURST 允许短时连发。
// 超频时回**可见错误**（code=RATE_LIMITED）而不是静默丢包；告警最多 1 次/秒，避免错误本身放大流量。
function consumeMessageToken(ws) {
    const now = Date.now();
    let b = ws.__msgBucket;
    if (!b) {
        b = { tokens: MSG_RATE_BURST, last: now, warnedAt: 0 };
        ws.__msgBucket = b;
    }
    b.tokens = Math.min(MSG_RATE_BURST, b.tokens + (now - b.last) / 1000 * MSG_RATE_REFILL_PER_SEC);
    b.last = now;
    if (b.tokens < 1) {
        if (now - b.warnedAt > 1000) {
            b.warnedAt = now;
            ws.send(JSON.stringify({
                type: 'error',
                code: 'RATE_LIMITED',
                message: `消息发送过于频繁（上限 ${MSG_RATE_PER_MINUTE} 条/分钟），请稍后再试`
            }));
        }
        return false;
    }
    b.tokens -= 1;
    return true;
}

// ==================== FIX-004: 心跳（ws 官方 FAQ 写法） ====================
// 每 30 秒一轮：上一轮未收到 pong（isAlive === false）→ 判为半开连接，用
// terminate()（不是 close()）硬回收；terminate 会触发 close 事件，从而走全量清理链。
// 否则置 isAlive = false 后 ping。顺带每轮做一次僵尸房扫描（主动回收，替代原「撞号
// 才被动触发」的回收方式）。
// FIX-012b: 心跳挂载抽成 armHeartbeat() —— 原地重启换上新 wss 后必须重新挂表
// （旧 wss 的 'close' 会把上一张表清掉，见 createWebSocketServer）。
let heartbeatTimer = null;

function armHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    heartbeatTimer = setInterval(() => {
        wss.clients.forEach((client) => {
            if (client.isAlive === false) {
                console.log('💀 心跳超时（30s 无 pong），回收半开连接');
                return client.terminate();
            }
            client.isAlive = false;
            try { client.ping(); } catch (e) { /* 连接已损坏，下一轮 terminate */ }
        });
        for (const [rid] of Array.from(rooms.entries())) {
            maybeDestroyRoom(rid, '心跳扫描：无人在线');
        }
    }, HEARTBEAT_INTERVAL_MS);
    return heartbeatTimer;
}

armHeartbeat();

// WebSocket处理
// FIX-012b: 连接处理器改为具名函数（原来是 wss.on 的匿名箭头）—— createWebSocketServer
// 里挂载它，原地重启后新 wss 复用同一份实现，不会复制第二份逻辑。
function onWsConnection(ws) {
    console.log('新客户端连接');

    // FIX-004: 心跳标记（配合上方 30s 心跳定时器）
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // FIX-006: 若握手阶段已验出身份（令牌登记有效）且座位仍在 → 连接入口即完成 ws↔身份 预绑定。
    // 后续 reconnect / 动作消息仍各做一次令牌一致性校验（这里是「连接即绑定」的前半段）。
    const gateInfo = ws.__upgradeAuth;
    if (gateInfo && gateInfo.ident) {
        const gateRoom = rooms.get(gateInfo.ident.roomId);
        const gateSeat = gateRoom && (gateRoom.players.get(gateInfo.ident.id) || gateRoom.spectators.get(gateInfo.ident.id));
        if (gateSeat) {
            bindWsIdentity(ws, gateInfo.ident.type, gateInfo.ident.id, gateInfo.ident.roomId, gateInfo.token);
            console.log(`🔗 握手阶段完成 ws↔身份绑定: ${gateInfo.ident.type} ${gateInfo.ident.id} @ ${gateInfo.ident.roomId}`);
        } else {
            console.log(`⚠️ 握手令牌有效但座位已不存在(${gateInfo.ident.id} @ ${gateInfo.ident.roomId})，不做预绑定`);
        }
    }

    // FIX-002: 连接数硬上限（wss.clients 此刻已把本连接算进去，故用 > 判断）
    if (wss.clients.size > MAX_CONNECTIONS) {
        console.log(`⚠️ 连接被拒：在线连接数 ${wss.clients.size} 已超过上限 ${MAX_CONNECTIONS}`);
        try {
            ws.send(JSON.stringify({
                type: 'error',
                code: 'TOO_MANY_CONNECTIONS',
                message: `服务器连接数已达上限（${MAX_CONNECTIONS}），请稍后重试`
            }));
        } catch (e) { /* 连接可能已关闭，忽略 */ }
        ws.close(1013, '服务器连接数已达上限');
        return;
    }

    // 发送当前房间列表
    ws.send(JSON.stringify({
        type: 'roomList',
        rooms: getRoomList()
    }));

    ws.on('message', (msg) => {
        // FIX-002: 频率限制放在 JSON.parse 之前（超频连接不该再消耗解析开销）
        if (!consumeMessageToken(ws)) {
            return;
        }
        try {
            const data = JSON.parse(msg);
            // 记录所有收到的消息类型
            console.log(`收到消息: type=${data.type}`);
            switch(data.type) {
                case 'createRoom': {
                    // FIX-002: 房间数硬上限
                    if (rooms.size >= MAX_ROOMS) {
                        console.log(`⚠️ 开房被拒：房间数 ${rooms.size} 已达上限 ${MAX_ROOMS}`);
                        ws.send(JSON.stringify({
                            type: 'error',
                            code: 'TOO_MANY_ROOMS',
                            message: `服务器房间数已达上限（${MAX_ROOMS}），请稍后再试`
                        }));
                        return;
                    }

                    // FIX-004: 单身份约束 —— 先解绑该连接此前挂载的身份（防一个 ws 挂多个房）
                    for (const staleRid of detachWsIdentity(ws)) {
                        maybeDestroyRoom(staleRid, '开房前解绑旧身份');
                    }

                    // 检查是否指定了包间号，且是否重复
                    const parsedTableNumber = data.tableNumber ? parseInt(data.tableNumber) : null;
                    const customTableNumber = (parsedTableNumber && !isNaN(parsedTableNumber)) ? parsedTableNumber : null;

                    if (customTableNumber) {
                        // 检查包间号是否已存在
                        let occupiedRoomId = null;
                        for (const [existingRoomId, room] of rooms) {
                            if (room.tableNumber === customTableNumber) { occupiedRoomId = existingRoomId; break; }
                        }
                        if (occupiedRoomId) {
                            const room = rooms.get(occupiedRoomId);
                            // ① FIX-004(c): 统一判据 —— 无在线真人 ∧ 无在线观战者 → 僵尸房，回收包间号
                            if (isRoomDisposable(room)) {
                                console.log(`♻️ 包间${customTableNumber} 原房间(${occupiedRoomId})无在线真人/观战者，回收包间号`);
                                destroyRoom(occupiedRoomId, '撞号回收僵尸房');
                            } else {
                                // ② 真的有人在玩（或有在线观战者）→ 拒绝，日志留痕 + 告诉用户被谁占着
                                const who = Array.from(room.players.values())
                                    .filter(p => !p.isAI && p.ws && p.ws.readyState === WebSocket.OPEN)
                                    .map(p => p.name).join('、');
                                const state = room.gameState.started ? '对局中' : '在房间里';
                                console.log(`⚠️ 开房被拒：包间${customTableNumber} 已存在（房间${occupiedRoomId}，在线真人：${who || '无'}，${state}）`);
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: `包间${customTableNumber}已存在（${who ? who + ' ' + state : state}），请更换号码；或让对方离开/关掉页面，30秒后自动释放`
                                }));
                                return;
                            }
                        }
                    }

                    const roomId = generateRoomId();
                    const playerId = 'P_' + Math.random().toString(36).substring(2, 10);
                    const mode = data.mode || 'normal'; // 默认正常模式
                    const allowSpectator = data.allowSpectator !== false; // 默认允许观战
                    // FIX-004(3): 唯一号池入口 —— 自定义号与自增号共用，自动号跳过所有已占号
                    const tableNumber = allocTableNumber(customTableNumber);
                    const room = new GameRoom(roomId, mode, allowSpectator, tableNumber);
                    // FIX-009: 昵称入口清洗（限长 16 + 去控制字符），后续所有广播都用清洗后的名字
                    room.addPlayer(ws, playerId, sanitizeText(data.playerName));
                    // FIX-007b: 记录房主 —— 管理类消息（addAI/testWin/newRound）的判据来源
                    room.hostId = playerId;
                    rooms.set(roomId, room);
                    playerToRoom.set(playerId, roomId);
                    // FIX-006: 建立 ws↔身份 绑定，并下发座位级 session token
                    const sessionToken = issueSessionToken('player', playerId, roomId);
                    bindWsIdentity(ws, 'player', playerId, roomId, sessionToken);
                    ws.send(JSON.stringify({
                        // B6-1: 建房者即房主，显式下发 hostId（客户端管理按钮门禁的唯一来源之一）
                        type: 'roomCreated', roomId, playerId, token: sessionToken, mode, allowSpectator, tableNumber,
                        hostId: getEffectiveHostId(room),
                        players: Array.from(room.players.values()).map(p => ({
                            id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready
                        }))
                    }));
                    broadcastRoomList();
                    console.log(`房间创建: 包间${tableNumber} (${mode === 'fast' ? '快速' : '正常'}模式, ${allowSpectator ? '允许观战' : '禁止观战'})`);
                    break;
                }
                case 'joinRoom': {
                    // FIX-004: 单身份约束 —— 先解绑该连接此前挂载的身份
                    for (const staleRid of detachWsIdentity(ws)) {
                        maybeDestroyRoom(staleRid, '进房前解绑旧身份');
                    }
                    const room = rooms.get(data.roomId);
                    if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间不存在' })); return; }
                    if (room.players.size >= 4) { ws.send(JSON.stringify({ type: 'error', message: '房间已满' })); return; }
                    const playerId = 'P_' + Math.random().toString(36).substring(2, 10);
                    // 支持指定座位号加入
                    const seatNum = data.seatNum || null;
                    // FIX-009: 昵称入口清洗（同上）
                    if (!room.addPlayer(ws, playerId, sanitizeText(data.playerName), seatNum)) {
                        ws.send(JSON.stringify({ type: 'error', message: '该座位已被占用' }));
                        return;
                    }
                    playerToRoom.set(playerId, data.roomId);
                    // FIX-006: 建立 ws↔身份 绑定，并下发座位级 session token
                    const sessionToken = issueSessionToken('player', playerId, data.roomId);
                    bindWsIdentity(ws, 'player', playerId, data.roomId, sessionToken);
                    ws.send(JSON.stringify({
                        type: 'roomJoined', roomId: data.roomId, playerId, token: sessionToken,
                        tableNumber: room.tableNumber, // 添加桌号
                        // B6-1: 入房即告知「谁是房主」（管理按钮门禁用；非房主入房立刻就知道自己不能加 AI/测试/新局）
                        hostId: getEffectiveHostId(room),
                        players: Array.from(room.players.values()).map(p => ({
                            id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready
                        }))
                    }));
                    room.broadcastPlayerList();
                    broadcastRoomList();
                    console.log(`玩家加入: ${data.roomId} 座位${seatNum || '自动'}`);
                    break;
                }
                case 'reconnect': {
                    // 玩家重连
                    const room = rooms.get(data.roomId);
                    if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间不存在' })); return; }

                    // ===== FIX-006: 重连必须凭【已登记的会话令牌】 =====
                    // 过渡窗口只对「首次 createRoom/joinRoom」开放；reconnect 一律拒绝无 token / 错 token，
                    // 且拒绝时**不下发任何手牌**（修 P0「用他人名字顶座看牌」）。
                    const tokenEnt = (typeof data.token === 'string' && data.token) ? sessionTokens.get(data.token) : null;
                    if (!tokenEnt || tokenEnt.roomId !== data.roomId) {
                        console.log(`⛔ 重连被拒(令牌缺失/无效/不属于该房): roomId=${data.roomId} name=${data.playerName} hasToken=${!!data.token}`);
                        ws.send(JSON.stringify({
                            type: 'error',
                            code: 'AUTH_FAILED',
                            message: '重连凭证无效或已过期：请按 F5 刷新页面后重新加入房间'
                        }));
                        return;
                    }

                    // FIX-004: 单身份约束 —— 重连前解绑该连接此前的其它身份
                    //（此处**不**回收变空的房间，避免把正在等待重连的房间销毁掉）
                    detachWsIdentity(ws);

                    // FIX-005: 座位查找统一走 findReconnectSeat（只认「真断线等人回」或「原真人座位被AI接管后认领」），
                    // 不再用旧的 p.ws === null 松口径（真 AI 座位 ws 也是 null，会被张冠李戴）。
                    // FIX-006: 令牌是每座位唯一的 —— 名字命中的座位必须与令牌登记的身份同一个人，否则拒绝。
                    // FIX-009: 重连找人用同一套清洗口径（否则带特殊字符的昵称会与已存名字对不上）
                    const hit = findReconnectSeat(room, sanitizeText(data.playerName));
                    const foundPlayer = hit ? hit.player : null;
                    const foundPid = hit ? hit.pid : null;

                    if (!foundPlayer || foundPid !== tokenEnt.id) {
                        console.log(`⛔ 重连被拒(令牌身份与座位不符): 令牌身份=${tokenEnt.id} 名字命中=${foundPid || '无'}`);
                        ws.send(JSON.stringify({
                            type: 'error',
                            code: 'AUTH_FAILED',
                            message: '重连失败：会话令牌与目标座位不匹配（座位可能已释放或被他人占用）'
                        }));
                        return;
                    }

                    if (foundPlayer) {
                        // 恢复玩家连接
                        foundPlayer.ws = ws;
                        foundPlayer.disconnected = false;
                        foundPlayer.disconnectTime = null;
                        if (foundPlayer.isAI) {
                            foundPlayer.isAI = false;
                            foundPlayer.name = foundPlayer.name.replace('🤖 ', '');
                        }
                        // FIX-005: 本人已回连 → 必须取消待接管定时器（杜绝「人回来了又被 AI 接管」）
                        cancelTakeoverTimer(room, foundPid);

                        playerToRoom.set(foundPid, data.roomId);
                        // FIX-006: 重新完成 ws↔身份 绑定，并把同一令牌回传给客户端继续持有
                        bindWsIdentity(ws, 'player', foundPid, data.roomId, data.token);

                        // 发送重连成功消息和游戏状态
                        ws.send(JSON.stringify({
                            type: 'reconnected',
                            roomId: data.roomId,
                            playerId: foundPid,
                            token: data.token,
                            // B6-1: 刷新页面重连后同样下发房主标识，否则回连后管理按钮门禁会丢失依据
                            hostId: getEffectiveHostId(room),
                            ...room.getPlayerGameState(foundPid),
                            players: Array.from(room.players.values()).map(p => ({
                                id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready
                            }))
                        }));

                        // 广播玩家重连通知
                        room.broadcast({
                            type: 'playerReconnected',
                            playerId: foundPid,
                            playerName: foundPlayer.name,
                            message: `${foundPlayer.name} 已重新连接`
                        });
                        room.broadcastPlayerList();
                        console.log(`玩家重连: ${foundPlayer.name} -> ${data.roomId}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: '未找到可重连的玩家，请重新加入' }));
                    }
                    break;
                }
                case 'spectateRoom': {
                    // FIX-004: 单身份约束 —— 先解绑该连接此前挂载的身份
                    for (const staleRid of detachWsIdentity(ws)) {
                        maybeDestroyRoom(staleRid, '观战前解绑旧身份');
                    }
                    // 观战者加入
                    const room = rooms.get(data.roomId);
                    if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间不存在' })); return; }
                    if (!room.allowSpectator) { ws.send(JSON.stringify({ type: 'error', message: '该房间不允许观战' })); return; }
                    const spectatorId = 'S_' + Math.random().toString(36).substring(2, 10);
                    // FIX-007a: 初始视角也做范围校验（非本房玩家 id 一律不写入 → 回落默认视角）
                    // FIX-009: 观战者昵称同样入口清洗
                    room.addSpectator(ws, spectatorId, sanitizeText(data.playerName), data.viewPlayerId);
                    playerToRoom.set(spectatorId, data.roomId);
                    // FIX-006: 观战身份同样做 ws↔身份 绑定并下发令牌。
                    // FIX-007a: 观战身份纳入同一套权威绑定；视角切换改用绑定身份 + viewPlayerId 范围校验。
                    const spectatorToken = issueSessionToken('spectator', spectatorId, data.roomId);
                    bindWsIdentity(ws, 'spectator', spectatorId, data.roomId, spectatorToken);

                    // 发送观战者状态
                    ws.send(JSON.stringify({
                        type: 'spectatorJoined',
                        roomId: data.roomId,
                        spectatorId: spectatorId,
                        token: spectatorToken,
                        gameState: room.getSpectatorGameState(data.viewPlayerId),
                        players: Array.from(room.players.values()).map(p => ({
                            id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready
                        }))
                    }));

                    // 通知房间内玩家有观战者加入
                    room.broadcast({
                        type: 'spectatorJoinedNotify',
                        spectatorName: data.playerName
                    });

                    console.log(`观战者加入: ${data.roomId} - ${data.playerName}`);
                    break;
                }
                case 'spectatorViewPlayer': {
                    // 观战者切换查看的玩家
                    // FIX-007a: 观战身份一律取【连接绑定身份】（FIX-006 权威映射），不再信任自报的
                    // data.spectatorId。原实现 `playerToRoom.get(data.spectatorId)` + `spectators.has(...)`
                    // 让任意连接只要报出一个存在的 sid，就能替该观战者改视角 / 拉该房手牌（越权）。
                    const auth = authorizeAction(ws, data);
                    if (!auth.ok) { sendAuthError(ws, auth); break; }
                    const ident = auth.ident;
                    if (ident.type !== 'spectator') {
                        sendAuthError(ws, { code: 'NOT_SPECTATOR', message: '当前连接不是观战身份，无法切换观战视角' });
                        break;
                    }
                    // 客户端自带 spectatorId 时必须与绑定身份一致（旧客户端曾把「被观看玩家 id」塞进该字段）
                    if (data.spectatorId && data.spectatorId !== ident.id) {
                        sendAuthError(ws, { code: 'IDENTITY_MISMATCH', message: '观战身份校验失败：spectatorId 与当前连接身份不一致' });
                        break;
                    }
                    const room = rooms.get(ident.roomId);
                    if (!room || !room.spectators.has(ident.id)) {
                        sendAuthError(ws, { code: 'ROOM_MISMATCH', message: '观战校验失败：观看的房间或观战身份已失效' });
                        break;
                    }
                    // 范围校验：只能看本房玩家的手牌
                    if (!room.setSpectatorViewPlayer(ident.id, data.viewPlayerId)) {
                        sendAuthError(ws, { code: 'VIEW_OUT_OF_RANGE', message: '观战视角越界：只能查看本房间内玩家的手牌' });
                        break;
                    }
                    const spectator = room.spectators.get(ident.id);
                    spectator.ws.send(JSON.stringify({
                        type: 'spectatorViewState',
                        gameState: room.getSpectatorGameState(data.viewPlayerId)
                    }));
                    break;
                }
                case 'ready': {
                    // FIX-006: 动作消息一律按【连接身份】鉴权，不再信任 data.playerId
                    const auth = authorizeAction(ws, data);
                    if (!auth.ok) { sendAuthError(ws, auth); break; }
                    const room = rooms.get(auth.ident.roomId);
                    if (room) room.setPlayerReady(auth.ident.id, data.ready);
                    break;
                }
                case 'addAI': {
                    // FIX-006: 按连接身份鉴权；房间取自【绑定身份】而非自报的 data.roomId
                    // FIX-007b: 已加房主门禁 + 阶段门禁（非房主 / 对局中一律拒绝）
                    const auth = authorizeAction(ws, data);
                    if (!auth.ok) { sendAuthError(ws, auth); break; }
                    const room = rooms.get(auth.ident.roomId);
                    if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间不存在' })); return; }
                    // FIX-007b: 管理类消息门禁 —— 只有房主能加 AI，且只允许在非对局期（waiting/settling）
                    if (!isRoomHost(room, auth.ident)) {
                        sendAuthError(ws, { code: 'NOT_HOST', message: '只有房主可以添加AI' });
                        break;
                    }
                    if (room.phase !== 'waiting' && room.phase !== 'settling') {
                        sendAuthError(ws, { code: 'BAD_PHASE', message: `当前局面（${room.phase}）不允许添加AI，请等本局结束` });
                        break;
                    }
                    if (room.players.size >= 4) { ws.send(JSON.stringify({ type: 'error', message: '房间已满' })); return; }

                    const aiId = 'AI_' + Math.random().toString(36).substring(2, 10);
                    const aiNames = ['🤖 AI小明', '🤖 AI小红', '🤖 AI小刚', '🤖 AI小丽'];
                    const aiName = aiNames[room.players.size] || `🤖 AI${room.players.size + 1}`;

                    if (room.addAIPlayer(aiId, aiName, data.seatNum)) {
                        playerToRoom.set(aiId, room.id);
                        broadcastRoomList();
                        room.broadcastPlayerList();
                        room.checkStartGame();
                        console.log(`AI玩家加入: ${room.id} - ${aiName}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: '添加AI失败' }));
                    }
                    break;
                }
                case 'play': {
                    const auth = authorizeAction(ws, data);
                    if (!auth.ok) { sendAuthError(ws, auth); break; }
                    const room = rooms.get(auth.ident.roomId);
                    const res = room && room.playCards(auth.ident.id, data.cards);
                    if (res && !res.success) ws.send(JSON.stringify({ type: 'playError', message: res.message }));
                    break;
                }
                case 'pass': {
                    const auth = authorizeAction(ws, data);
                    if (!auth.ok) { sendAuthError(ws, auth); break; }
                    const room = rooms.get(auth.ident.roomId);
                    const res = room && room.pass(auth.ident.id);
                    if (res && !res.success) ws.send(JSON.stringify({ type: 'playError', message: res.message }));
                    break;
                }
                case 'setAutoPlay': {
                    // 设置托管状态
                    const auth = authorizeAction(ws, data);
                    if (!auth.ok) { sendAuthError(ws, auth); break; }
                    const room = rooms.get(auth.ident.roomId);
                    if (room) {
                        room.setAutoPlay(auth.ident.id, data.autoPlay);
                    }
                    break;
                }
                case 'newRound': {
                    const auth = authorizeAction(ws, data);
                    if (!auth.ok) { sendAuthError(ws, auth); break; }
                    const room = rooms.get(auth.ident.roomId);
                    if (!room) break;
                    // FIX-008/FIX-007b: 新局门禁 —— 只有房主、且房间必须处于「结算期」。
                    // 原实现无任何校验：任何人点「新局」都能在别人对局中途重发牌打断对局，
                    // 也能在 waiting 期把房间直接推进发牌流程（修 A-8 / A-9）。
                    if (!isRoomHost(room, auth.ident)) {
                        sendAuthError(ws, { code: 'NOT_HOST', message: '只有房主可以开始新一局' });
                        break;
                    }
                    if (room.phase !== 'settling') {
                        sendAuthError(ws, { code: 'BAD_PHASE', message: `当前局面（${room.phase}）不是结算期，无法开始新一局` });
                        break;
                    }
                    room.startNewRound();
                    break;
                }
                case 'testWin': {
                    // 测试模式：模拟不同胜利情况
                    // FIX-006: 按连接身份鉴权；房间取自【绑定身份】而非自报的 data.roomId
                    const auth = authorizeAction(ws, data);
                    if (!auth.ok) { sendAuthError(ws, auth); break; }
                    const room = rooms.get(auth.ident.roomId);
                    console.log(`testWin 收到: roomId=${auth.ident.roomId}, winType=${data.winType}, room存在=${!!room}`);
                    if (!room) break;
                    // FIX-007b: 管理类消息门禁 —— 只有房主能强制结束对局，且房间必须正处于对局中
                    //（原实现：房内任意真人点测试按钮即可打断别人正在打的一局）。
                    if (!isRoomHost(room, auth.ident)) {
                        sendAuthError(ws, { code: 'NOT_HOST', message: '只有房主可以使用测试胜利功能' });
                        break;
                    }
                    if (!isRoomInPlay(room)) {
                        sendAuthError(ws, { code: 'BAD_PHASE', message: `当前局面（${room.phase}）不是对局中，无法模拟胜利` });
                        break;
                    }
                    room.testWinScenario(data.winType);
                    break;
                }
                case 'returnTribute': {
                    const auth = authorizeAction(ws, data);
                    if (!auth.ok) { sendAuthError(ws, auth); break; }
                    const room = rooms.get(auth.ident.roomId);
                    if (room) {
                        const result = room.handleReturnTribute(auth.ident.id, data.cardIndex);
                        if (!result.success) {
                            ws.send(JSON.stringify({ type: 'playError', message: result.message }));
                        }
                    }
                    break;
                }
                case 'chat': {
                    // FIX-006: 按【绑定身份】判定发言人（不再按自报的 data.playerId）
                    const auth = authorizeAction(ws, data);
                    if (!auth.ok) { sendAuthError(ws, auth); break; }
                    const ident = auth.ident;
                    const room = rooms.get(ident.roomId);
                    // 先检查是否是普通玩家
                    const p = room ? room.players.get(ident.id) : null;
                    if (p) {
                        // FIX-009: 聊天文本服务端转义（限长 200 + 去控制字符 + HTML 实体化）。
                        // 原实现把 data.message 原样广播 → 客户端 innerHTML 直插 = 全房 XSS。
                        room.broadcast({ type: 'chat', playerId: ident.id, playerName: p.name, message: escapeHtml(sanitizeText(data.message, MAX_CHAT_LEN)), isSpectator: false });
                    } else {
                        // 检查是否是观战者
                        const s = room ? room.spectators.get(ident.id) : null;
                        if (s) {
                            // FIX-009: 观战者聊天同样转义（同上）
                            room.broadcast({ type: 'chat', playerId: ident.id, playerName: s.name, message: escapeHtml(sanitizeText(data.message, MAX_CHAT_LEN)), isSpectator: true });
                        }
                    }
                    break;
                }
            }
        } catch (e) { console.error('消息错误:', e); }
    });

    ws.on('close', () => {
        // FIX-004: 遍历清理**全部**匹配项 —— 原实现首个匹配即 break，导致一个连接挂在
        // 多个房间时，其余房间的 players/playerToRoom 永久残留（内存泄漏）。
        const roomsToDestroy = new Set();
        for (const [pid, rid] of Array.from(playerToRoom.entries())) {
            const room = rooms.get(rid);
            if (!room) { playerToRoom.delete(pid); continue; }

            // ① 玩家断线
            const p = room.players.get(pid);
            if (p && p.ws === ws) {
                console.log(`玩家断开: ${p.name}`);

                // 如果游戏正在进行中，标记为断开但保留玩家信息（允许重连）
                if (room.gameState.started) {
                    console.log(`游戏进行中，${p.name} 断开连接，等待重连`);
                    p.ws = null;
                    p.disconnected = true;
                    p.disconnectTime = Date.now();

                    // 广播玩家断开通知
                    room.broadcast({
                        type: 'playerDisconnected',
                        playerId: pid,
                        playerName: p.name,
                        message: `${p.name} 已断开连接，等待重连...`
                    });
                    room.broadcastPlayerList();

                    // 如果当前轮到该玩家，先让AI顶一手（句柄登记到房间，房间销毁即取消）
                    const playerIds = room.getSortedPlayerIds();
                    if (playerIds[room.gameState.currentPlayer] === pid) {
                        registerTimer(room, 'deal', () => {
                            if (p.disconnected && p.ws === null && rooms.get(rid) === room) {
                                room.aiPlayCards(pid);
                            }
                        }, room.getAIRandomDelay());
                    }

                    // FIX-005: 30 秒接管统一走 armTakeoverTimer（内含二次复查，句柄可按座位取消）。
                    // 结算/新局期回调会自行放弃接管，不再把真人永久改 AI（修 A-17）。
                    armTakeoverTimer(room, pid, 30000);

                    // FIX-005: 对局中断线【保留】playerToRoom 映射 —— 座位仍留在 room.players，映射与座位保持一致；
                    // 重连（reconnect）会幂等重建，AI 接管后映射仍在，房间销毁时由 destroyRoom 统一清扫。
                    // （FIX-004 曾在此删除映射，造成「座位在、映射无」的两表不对称，本批修正。修 A-17 关联项。）
                    continue;
                }

                // FIX-006: 未开局离场 → 座位连同它的会话令牌一起吊销（重连凭证不再有效）
                revokeSessionToken(pid, rid);

                // 游戏未开始，正常移除玩家
                if (room.removePlayer(pid)) {
                    // 房间已空 → 交给统一销毁函数（含定时器清理与广播）
                    roomsToDestroy.add(rid);
                } else {
                    // 广播玩家离开通知
                    room.broadcast({ type: 'playerLeft', playerId: pid, playerName: p.name });
                    // 更新房间内玩家列表
                    room.broadcastPlayerList();
                    // 是否只剩AI玩家 → 交给统一判据决定（有在线观战者时不得解散）
                    roomsToDestroy.add(rid);
                }
                playerToRoom.delete(pid);
                continue;
            }

            // ② 观战者断线
            const s = room.spectators.get(pid);
            if (s && s.ws === ws) {
                console.log(`观战者断开: ${s.name}`);
                room.removeSpectator(pid);
                playerToRoom.delete(pid);
                // FIX-006: 观战者离场 → 吊销其会话令牌
                revokeSessionToken(pid, rid);
                // 通知房间内玩家
                room.broadcast({ type: 'spectatorLeft', spectatorName: s.name });
                continue;
            }

            // ③ 两表漂移（映射指向的座位已不存在）→ 清理脏映射
            if (!p && !s) {
                playerToRoom.delete(pid);
            }
        }

        // FIX-004: 对因此变空的房间统一走唯一销毁函数（清定时器 + 清全部映射 + 广播）
        for (const rid of roomsToDestroy) {
            maybeDestroyRoom(rid, '断线后无人在线');
        }
        broadcastRoomList();
    });

    ws.on('error', (e) => console.error('WS错误:', e));
}

// 获取房间列表
function getRoomList() {
    const list = [];
    rooms.forEach((room, roomId) => {
        list.push({
            roomId,
            tableNumber: room.tableNumber, // 桌号
            mode: room.mode,
            allowSpectator: room.allowSpectator, // 是否允许观战
            turnTimeout: room.turnTimeout,
            playerCount: room.players.size,
            maxPlayers: room.maxPlayers,
            spectatorCount: room.spectators.size, // 观战者数量
            started: room.gameState.started,
            phase: room.phase, // FIX-008: 显式局面状态（新增字段，旧客户端忽略；供排障/验收观察）
            hostId: room.hostId, // FIX-007b: 房主座位 id（新增字段）
            players: Array.from(room.players.values()).map(p => ({
                name: p.name,
                playerNum: p.playerNum,
                ready: p.ready
            }))
        });
    });
    // 按桌号排序
    list.sort((a, b) => (a.tableNumber || 0) - (b.tableNumber || 0));
    return list;
}

// 广播房间列表给所有连接的客户端
function broadcastRoomList() {
    const roomList = getRoomList();
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'roomList',
                rooms: roomList
            }));
        }
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(``);
    console.log(`🃏 掼蛋局域网服务器已启动！`);
    console.log(``);
    console.log(`📱 游戏地址: http://localhost:${PORT}`);
    console.log(`🌐 局域网地址: http://<你的IP>:${PORT}`);
    console.log(``);
    console.log(`等待玩家连接...`);
    console.log(``);
});

// ==================== 自动重启功能 ====================
// 监视服务器代码文件，检测到变化时自动重启
const watchFiles = ['guandan-server.js', 'guandan-lan.html'];
let isRestarting = false;
let fileWatchers = [];

// ⚠️ 用 npm run dev / dev:verbose 等（nodemon）启动时，nodemon 已经在管重启；内置监听若同时重启
// 会与 nodemon 抢 8081 端口（EADDRINUSE），可能留下坏进程 → 检测到外部监视器就让位。
// FIX-012: 让位判据从「环境变量值」(`npm_lifecycle_event === 'dev'`) 改为**显式开关**。
//   原因：`npm run dev:verbose` 下 npm_lifecycle_event 的值是 'dev:verbose'，旧判据失效 → 双重重启抢 8081。
//   package.json 的 nodemonConfig.env 里统一注入 GD_NO_SELF_RESTART=1，覆盖 dev / dev:verbose 等所有 nodemon 脚本。
const underExternalWatcher = process.env.GD_NO_SELF_RESTART === '1';

// ==================== FIX-012b: 内置自重启 = 同进程原地重启 ====================
// 改前：内置分支 process.exit(0) 交外部拉起 —— 普通模式(node guandan-server.js)下没有人拉起，
//       保存文件后服务器直接消失（而文档写着「会自动重启」）。
// 改后：关 wss + 关 http server + 清房间/会话状态 + 重新 listen + 重挂 fs.watch，
//       全程**不退出进程**（PID 不变，房间会清空、客户端会被 1001 关闭并自动重连）。
//       只有原地重启失败（超时 / re-listen 出错）才 process.exit(1)，把控制权交回外部启动器。

// 清态：房间级定时器→房间号→令牌→三张 Map（此处**不**广播 roomList：客户端正在被关，广播无意义）
function clearRoomStateForRestart() {
    const roomCount = rooms.size;
    for (const [rid, room] of Array.from(rooms.entries())) {
        try { clearRoomTimers(room); } catch (e) { /* 单个房间清理异常不影响整体 */ }
        try { releaseTableNumber(room.tableNumber); } catch (e) { /* 号池下面统一清 */ }
        try { revokeRoomTokens(rid); } catch (e) { /* 令牌下面统一清 */ }
        rooms.delete(rid);
    }
    playerToRoom.clear();
    sessionTokens.clear();
    usedTableNumbers.clear();
    roomCounter = 0;
    console.log(`♻️ 原地重启清理：销毁房间 ${roomCount} 个，playerToRoom / sessionTokens / usedTableNumbers 已清空`);
    return roomCount;
}

// 重挂文件监听（先关旧句柄再重挂，避免原地重启后叠加出多份 watcher）
function rearmFileWatchers() {
    fileWatchers.forEach(w => { try { w.close(); } catch (e) { /* 句柄已失效 */ } });
    fileWatchers = [];
    watchFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) return;
        fileWatchers.push(fs.watch(filePath, (eventType) => {
            if (eventType === 'change' && !isRestarting) {
                console.log('');
                console.log(`🔄 检测到 ${file} 变化，正在重启服务器...`);
                console.log('');
                restartInPlace(file);
            }
        }));
    });
    console.log(`👀 已挂载文件监听：${watchFiles.join(', ')}`);
}

// 原地重启主流程（顺序固定：关连接 → 清状态 → 关 http server → 换新 wss → re-listen → 重挂 watcher/心跳）
function restartInPlace(trigger) {
    if (isRestarting) return;
    isRestarting = true;
    console.log(`♻️ 内置自重启（同进程原地重启，PID ${process.pid} 不变）：${trigger} 变化`);
    const state = { finished: false };
    const failSafe = setTimeout(() => {
        if (state.finished) return;
        console.error('❌ 原地重启失败（5 秒内未完成）→ 退出本进程，交由外部启动器拉起');
        process.exit(1);
    }, 5000);

    const finish = () => {
        if (state.finished) return;
        state.finished = true;
        try {
            // ③ 关掉旧 wss（它绑在旧 http server 的 upgrade 上，必须换一个新实例）
            try { wss.close(); } catch (e) { /* 已经关过了 */ }
            wss = createWebSocketServer();
            // ④ 重新监听端口（顺带一次性挂上 re-listen 的错误兜底）
            const onListenError = (err) => {
                console.error(`❌ 原地重启失败（重新监听 ${PORT} 出错）：`, err && err.message);
                clearTimeout(failSafe);
                process.exit(1);
            };
            server.once('error', onListenError);
            server.listen(PORT, '0.0.0.0', () => {
                server.removeListener('error', onListenError);
                // ⑤ 重挂心跳与文件监听，恢复可服务状态
                armHeartbeat();
                rearmFileWatchers();
                isRestarting = false;
                clearTimeout(failSafe);
                console.log(`✅ 原地重启完成：PID ${process.pid} 不变，端口 ${PORT} 已重新监听，房间已清空`);
                console.log(`🚀 掼蛋局域网服务器已启动！ 游戏地址: http://localhost:${PORT}`);
                console.log('');
            });
        } catch (e) {
            console.error('❌ 原地重启失败（re-listen 抛错）：', e && e.message);
            clearTimeout(failSafe);
            process.exit(1);
        }
    };

    try {
        // ① 先关所有 WebSocket 连接（close 事件仍走既有的全量清理链）
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close(1001, '服务器重启');
            }
        });
        // ② 清房间 / 会话 / 绑定 / 房间级定时器
        clearRoomStateForRestart();
        // ③ 关 http server → 回调里 re-listen；顺带强制回收 keep-alive 连接，
        //    并留 1.5 秒兜底（有连接不回 close 回调时也能推进，finish 幂等）
        server.close(() => finish());
        if (typeof server.closeAllConnections === 'function') {
            try { server.closeAllConnections(); } catch (e) { /* 旧 Node 无此 API */ }
        }
        setTimeout(finish, 1500);
    } catch (e) {
        console.error('❌ 原地重启失败（关服务抛错）：', e && e.message);
        clearTimeout(failSafe);
        process.exit(1);
    }
}

if (underExternalWatcher) {
    console.log('🔧 当前模式：外部监视重启（GD_NO_SELF_RESTART=1，nodemon / npm run dev*）');
    console.log('🔧 内置自动重启让位，由外部监视器负责重启');
} else {
    console.log('🔧 当前模式：内置自重启（未设置 GD_NO_SELF_RESTART，无外部监视器）—— 同进程原地重启，PID 不变');
    console.log('🔧 自动重启功能已启用 (监视文件变化)');
    console.log('🔧 提示：用 nodemon 启动时 package.json 的 nodemonConfig.env 会自动注入 GD_NO_SELF_RESTART=1');
    rearmFileWatchers();
}

