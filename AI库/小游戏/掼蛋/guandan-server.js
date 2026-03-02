// 掼蛋局域网服务器 - 支持HTTP和WebSocket
// 运行方式: node guandan-server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 8081;

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
const wss = new WebSocket.Server({ server });

// 游戏房间管理
const rooms = new Map();
const playerToRoom = new Map();

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
    constructor(id, mode = 'normal') {
        this.id = id;
        this.mode = mode; // 'fast' 或 'normal'
        this.players = new Map();
        this.maxPlayers = 4;
        this.turnTimeout = mode === 'fast' ? 7 : 15; // 出牌时间
        this.turnTimer = null;
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
            turnTimeLeft: this.turnTimeout
        };
    }

    addPlayer(ws, playerId, playerName) {
        if (this.players.size >= this.maxPlayers) return false;

        const playerNum = this.players.size + 1;
        const team = playerNum <= 2 ? 1 : 2;

        this.players.set(playerId, {
            ws, id: playerId, name: playerName,
            playerNum, team, ready: false,
            finished: false, rank: 0
        });
        return true;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        return this.players.size === 0;
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
        if (allReady && this.players.size === 4 && !this.gameState.started) {
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
                    deck.push({
                        suit, rank, value: RANK_VALUES[rank],
                        isJoker: false,
                        isTrump: suit === '♥' && rank === trumpRank
                    });
                }
            }
        }

        for (let i = 0; i < 2; i++) {
            deck.push({ suit: '🃏', rank: '小王', value: 15, isJoker: true, isTrump: false });
            deck.push({ suit: '🃏', rank: '大王', value: 16, isJoker: true, isTrump: false });
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
        const playerIds = Array.from(this.players.keys());

        for (let i = 0; i < 4; i++) {
            hands[playerIds[i]] = deck.slice(i * 27, (i + 1) * 27);
            this.sortHand(hands[playerIds[i]]);
        }
        return hands;
    }

    sortHand(hand) {
        hand.sort((a, b) => {
            if (a.value !== b.value) return b.value - a.value;
            return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        });
    }

    startGame() {
        this.gameState.started = true;
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

        const playerIds = Array.from(this.players.keys());
        for (let i = 0; i < 4; i++) {
            const hand = this.gameState.hands[playerIds[i]];
            if (hand.some(card => card.suit === '♥' && card.rank === '3')) {
                this.gameState.currentPlayer = i;
                break;
            }
        }

        this.broadcast({ type: 'gameStart', gameState: this.getPublicGameState() });
        console.log(`房间 ${this.id} 游戏开始`);
    }

    getPublicGameState() {
        const playerIds = Array.from(this.players.keys());
        const publicHands = {};
        const playerInfo = {};

        for (let i = 0; i < 4; i++) {
            const pid = playerIds[i];
            const player = this.players.get(pid);
            publicHands[pid] = { count: this.gameState.hands[pid]?.length || 0 };
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

        if (cards.length === 1) return { valid: true, type: 'single', value: cards[0].value };
        if (cards.length === 2 && cards[0].value === cards[1].value) return { valid: true, type: 'pair', value: cards[0].value };
        if (cards.length === 4 && cards.filter(c => c.rank === '大王').length === 2 && cards.filter(c => c.rank === '小王').length === 2) return { valid: true, type: 'rocket', value: 100 };
        if (cards.length === 3 && cards[0].value === cards[1].value && cards[1].value === cards[2].value) return { valid: true, type: 'triple', value: cards[0].value };

        if (cards.length === 5) {
            const counts = {};
            cards.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
            const vals = Object.values(counts);
            if (vals.includes(3) && vals.includes(2)) {
                const tv = Object.keys(counts).find(k => counts[k] === 3);
                return { valid: true, type: 'tripleWithPair', value: parseInt(tv) };
            }
        }

        if (cards.length >= 4 && cards.every(c => c.value === cards[0].value)) {
            return { valid: true, type: 'bomb', value: cards[0].value, length: cards.length };
        }

        if (cards.length >= 5) {
            const values = sorted.map(c => c.value);
            if (values.every(v => v <= 14)) {
                let seq = true;
                for (let i = 1; i < values.length; i++) {
                    if (values[i] - values[i-1] !== 1) { seq = false; break; }
                }
                if (seq) return { valid: true, type: 'straight', value: values[values.length-1], length: cards.length };
            }
        }

        if (cards.length >= 6 && cards.length % 2 === 0) {
            const pairs = [];
            for (let i = 0; i < cards.length; i += 2) {
                if (cards[i].value === cards[i+1].value) pairs.push(cards[i].value);
            }
            if (pairs.length === cards.length / 2 && pairs.length >= 3) {
                pairs.sort((a, b) => a - b);
                let seq = true;
                for (let i = 1; i < pairs.length; i++) {
                    if (pairs[i] - pairs[i-1] !== 1) { seq = false; break; }
                }
                if (seq) return { valid: true, type: 'pairStraight', value: pairs[pairs.length-1], length: pairs.length };
            }
        }

        return { valid: false, type: null };
    }

    comparePlay(newPlay, lastPlay) {
        if (!lastPlay) return true;
        if (newPlay.type === 'rocket') return true;
        if (lastPlay.type === 'rocket') return false;
        if (newPlay.type === 'bomb' && lastPlay.type !== 'bomb') return true;
        if (lastPlay.type === 'bomb' && newPlay.type !== 'bomb') return false;
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

        const playerIds = Array.from(this.players.keys());
        if (playerIds[this.gameState.currentPlayer] !== playerId) return { success: false, message: '不是你的回合' };

        const player = this.players.get(playerId);
        if (player.finished) return { success: false, message: '你已经出完牌了' };

        const result = this.validatePlay(cards);
        if (!result.valid) return { success: false, message: '无效的牌型' };

        if (this.gameState.lastPlay && this.gameState.lastPlayer !== playerId) {
            if (!this.comparePlay(result, this.gameState.lastPlay)) return { success: false, message: '牌不够大' };
        }

        const hand = this.gameState.hands[playerId];
        for (const card of cards) {
            const idx = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
            if (idx === -1) return { success: false, message: '你没有这张牌' };
            hand.splice(idx, 1);
        }

        this.gameState.lastPlay = result;
        this.gameState.lastPlay.cards = cards;
        this.gameState.lastPlayer = playerId;
        this.gameState.passedPlayers = [];

        if (hand.length === 0) {
            player.finished = true;
            player.rank = this.getFinishedCount() + 1;
            this.broadcast({ type: 'playerFinished', playerId, playerName: player.name, rank: player.rank });
        }

        if (this.checkRoundEnd()) this.endRound();
        else this.nextPlayer();

        return { success: true };
    }

    pass(playerId) {
        if (!this.gameState.started) return { success: false, message: '游戏未开始' };
        const playerIds = Array.from(this.players.keys());
        if (playerIds[this.gameState.currentPlayer] !== playerId) return { success: false, message: '不是你的回合' };

        const player = this.players.get(playerId);
        if (player.finished) return { success: false, message: '你已经出完牌了' };
        if (!this.gameState.lastPlay || this.gameState.lastPlayer === playerId) return { success: false, message: '你必须出牌' };

        this.gameState.passedPlayers.push(playerId);
        this.nextPlayer();
        return { success: true };
    }

    nextPlayer() {
        const playerIds = Array.from(this.players.keys());
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

        const active = Array.from(this.players.values()).filter(p => !p.finished);
        if (this.gameState.passedPlayers.length >= active.length - 1) {
            this.gameState.lastPlay = null;
            this.gameState.lastPlayer = null;
            this.gameState.passedPlayers = [];
        }
        this.broadcastGameState();
    }

    getFinishedCount() {
        return Array.from(this.players.values()).filter(p => p.finished).length;
    }

    checkRoundEnd() {
        return this.getFinishedCount() >= 3;
    }

    endRound() {
        const t1 = Array.from(this.players.values()).filter(p => p.team === 1);
        const t2 = Array.from(this.players.values()).filter(p => p.team === 2);
        const t1r = t1.map(p => p.rank).filter(r => r > 0);
        const t2r = t2.map(p => p.rank).filter(r => r > 0);

        let levelUp = 0, winner = null;

        if ((t1r.includes(1) && t1r.includes(2)) || (t2r.includes(1) && t2r.includes(2))) {
            levelUp = 3;
            winner = t1r.includes(1) ? 1 : 2;
        } else if ((t1r.includes(1) && t1r.includes(3)) || (t2r.includes(1) && t2r.includes(3))) {
            levelUp = 2;
            winner = t1r.includes(1) ? 1 : 2;
        } else {
            levelUp = 1;
            winner = t1r.includes(1) ? 1 : 2;
        }

        this.gameState.roundWinner = winner;
        this.gameState.levelUp = levelUp;
        this.gameState.currentLevelTeam = winner === 1 ? 2 : 1;

        this.broadcast({
            type: 'roundEnd', winner, levelUp,
            loser: winner === 1 ? 2 : 1,
            ranks: Array.from(this.players.values()).map(p => ({ name: p.name, team: p.team, rank: p.rank })),
            teamLevels: this.gameState.teamLevels
        });
        console.log(`房间 ${this.id} 回合结束，队伍${winner}获胜，升级${levelUp}级`);
    }

    startNewRound() {
        const winner = this.gameState.roundWinner;
        if (winner) {
            this.gameState.teamLevels[winner] += this.gameState.levelUp;
            if (this.gameState.teamLevels[winner] > 14) {
                this.broadcast({ type: 'gameOver', winner });
                return;
            }
        }

        for (let p of this.players.values()) {
            p.finished = false;
            p.rank = 0;
            p.ready = false;
        }

        this.gameState.hands = this.dealCards();
        this.gameState.currentPlayer = 0;
        this.gameState.lastPlay = null;
        this.gameState.lastPlayer = null;
        this.gameState.passedPlayers = [];
        this.gameState.roundWinner = null;
        this.gameState.levelUp = 0;

        const playerIds = Array.from(this.players.keys());
        for (let i = 0; i < 4; i++) {
            if (this.gameState.hands[playerIds[i]].some(c => c.suit === '♥' && c.rank === '3')) {
                this.gameState.currentPlayer = i;
                break;
            }
        }

        this.broadcast({ type: 'newRound', gameState: this.getPublicGameState() });
    }

    broadcast(msg) {
        const data = JSON.stringify(msg);
        this.players.forEach((p, pid) => {
            if (p.ws.readyState === WebSocket.OPEN) {
                if (msg.type === 'gameStart' || msg.type === 'gameState' || msg.type === 'newRound') {
                    p.ws.send(JSON.stringify({ ...msg, gameState: this.getPlayerGameState(pid) }));
                } else {
                    p.ws.send(data);
                }
            }
        });
    }

    broadcastGameState() { this.broadcast({ type: 'gameState' }); }

    broadcastPlayerList() {
        this.broadcast({
            type: 'playerList',
            players: Array.from(this.players.values()).map(p => ({
                id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready
            }))
        });
    }
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// WebSocket处理
wss.on('connection', (ws) => {
    console.log('新客户端连接');

    // 发送当前房间列表
    ws.send(JSON.stringify({
        type: 'roomList',
        rooms: getRoomList()
    }));

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            switch(data.type) {
                case 'createRoom': {
                    const roomId = generateRoomId();
                    const playerId = 'P_' + Math.random().toString(36).substring(2, 10);
                    const mode = data.mode || 'normal'; // 默认正常模式
                    const room = new GameRoom(roomId, mode);
                    room.addPlayer(ws, playerId, data.playerName);
                    rooms.set(roomId, room);
                    playerToRoom.set(playerId, roomId);
                    ws.send(JSON.stringify({
                        type: 'roomCreated', roomId, playerId, mode,
                        players: Array.from(room.players.values()).map(p => ({
                            id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready
                        }))
                    }));
                    broadcastRoomList();
                    console.log(`房间创建: ${roomId} (${mode === 'fast' ? '快速' : '正常'}模式)`);
                    break;
                }
                case 'joinRoom': {
                    const room = rooms.get(data.roomId);
                    if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间不存在' })); return; }
                    if (room.players.size >= 4) { ws.send(JSON.stringify({ type: 'error', message: '房间已满' })); return; }
                    const playerId = 'P_' + Math.random().toString(36).substring(2, 10);
                    if (!room.addPlayer(ws, playerId, data.playerName)) { ws.send(JSON.stringify({ type: 'error', message: '加入失败' })); return; }
                    playerToRoom.set(playerId, data.roomId);
                    ws.send(JSON.stringify({
                        type: 'roomJoined', roomId: data.roomId, playerId,
                        players: Array.from(room.players.values()).map(p => ({
                            id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready
                        }))
                    }));
                    room.broadcastPlayerList();
                    broadcastRoomList();
                    console.log(`玩家加入: ${data.roomId}`);
                    break;
                }
                case 'ready': {
                    const rid = playerToRoom.get(data.playerId);
                    if (rid) rooms.get(rid)?.setPlayerReady(data.playerId, data.ready);
                    break;
                }
                case 'play': {
                    const rid = playerToRoom.get(data.playerId);
                    const res = rooms.get(rid)?.playCards(data.playerId, data.cards);
                    if (res && !res.success) ws.send(JSON.stringify({ type: 'playError', message: res.message }));
                    break;
                }
                case 'pass': {
                    const rid = playerToRoom.get(data.playerId);
                    const res = rooms.get(rid)?.pass(data.playerId);
                    if (res && !res.success) ws.send(JSON.stringify({ type: 'playError', message: res.message }));
                    break;
                }
                case 'newRound': {
                    const rid = playerToRoom.get(data.playerId);
                    rooms.get(rid)?.startNewRound();
                    break;
                }
                case 'chat': {
                    const rid = playerToRoom.get(data.playerId);
                    const room = rooms.get(rid);
                    const p = room?.players.get(data.playerId);
                    if (p) room.broadcast({ type: 'chat', playerId: data.playerId, playerName: p.name, message: data.message });
                    break;
                }
            }
        } catch (e) { console.error('消息错误:', e); }
    });

    ws.on('close', () => {
        for (let [pid, rid] of playerToRoom.entries()) {
            const room = rooms.get(rid);
            const p = room?.players.get(pid);
            if (p?.ws === ws) {
                console.log(`玩家断开: ${p.name}`);
                if (room.removePlayer(pid)) {
                    rooms.delete(rid);
                    console.log(`房间删除: ${rid}`);
                } else {
                    // 广播玩家离开通知
                    room.broadcast({ type: 'playerLeft', playerId: pid, playerName: p.name });
                    // 更新房间内玩家列表
                    room.broadcastPlayerList();
                }
                playerToRoom.delete(pid);
                broadcastRoomList();
                break;
            }
        }
    });

    ws.on('error', (e) => console.error('WS错误:', e));
});

// 获取房间列表
function getRoomList() {
    const list = [];
    rooms.forEach((room, roomId) => {
        list.push({
            roomId,
            mode: room.mode,
            turnTimeout: room.turnTimeout,
            playerCount: room.players.size,
            maxPlayers: room.maxPlayers,
            started: room.gameState.started,
            players: Array.from(room.players.values()).map(p => ({
                name: p.name,
                ready: p.ready
            }))
        });
    });
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
