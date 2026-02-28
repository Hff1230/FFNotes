// WebSocket服务器 - 掼蛋局域网版
// 运行方式: node guandan-server.js

const WebSocket = require('ws');

const PORT = 8081;
const wss = new WebSocket.Server({ port: PORT });

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

// 房间类
class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.maxPlayers = 4;
        this.gameState = {
            started: false,
            currentPlayer: 0,  // 当前出牌玩家索引
            lastPlay: null,    // 上一手牌
            lastPlayer: null,  // 上一个出牌玩家
            passedPlayers: [], // 本轮已过的玩家
            level: 2,          // 当前级别 (2-A)
            trumpSuit: '♥',    // 主花色 (逢人配)
            deck: [],          // 牌堆
            hands: {},         // 玩家手牌
            scores: {},        // 分数
            roundWinner: null  // 本轮胜者
        };
    }

    addPlayer(ws, playerId, playerName) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }

        const playerNum = this.players.size + 1;
        const team = playerNum <= 2 ? 1 : 2; // 1-2是一队，3-4是一队

        this.players.set(playerId, {
            ws,
            id: playerId,
            name: playerName,
            playerNum,
            team,
            ready: false,
            finished: false,  // 是否已出完牌
            rank: 0           // 完成名次
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

    // 创建一副牌
    createDeck() {
        const deck = [];

        // 添加两副普通牌
        for (let i = 0; i < 2; i++) {
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    deck.push({
                        suit,
                        rank,
                        value: RANK_VALUES[rank],
                        isJoker: false,
                        isTrump: suit === '♥' && rank === this.getLevelRank() // 逢人配
                    });
                }
            }
        }

        // 添加四张王
        for (let i = 0; i < 2; i++) {
            deck.push({ suit: '🃏', rank: '小王', value: 15, isJoker: true, isTrump: false });
            deck.push({ suit: '🃏', rank: '大王', value: 16, isJoker: true, isTrump: false });
        }

        return deck;
    }

    // 获取当前级别对应的牌面
    getLevelRank() {
        if (this.gameState.level <= 10) {
            return this.gameState.level.toString();
        }
        return ['J', 'Q', 'K', 'A'][this.gameState.level - 11];
    }

    // 洗牌
    shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    // 发牌
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

    // 整理手牌
    sortHand(hand) {
        hand.sort((a, b) => {
            if (a.value !== b.value) return b.value - a.value;
            return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        });
    }

    startGame() {
        this.gameState.started = true;
        this.gameState.level = 2;
        this.gameState.hands = this.dealCards();
        this.gameState.currentPlayer = 0;
        this.gameState.lastPlay = null;
        this.gameState.lastPlayer = null;
        this.gameState.passedPlayers = [];
        this.gameState.roundWinner = null;

        // 重置玩家状态
        for (let player of this.players.values()) {
            player.finished = false;
            player.rank = 0;
        }

        // 找到有红桃3的玩家先出
        const playerIds = Array.from(this.players.keys());
        for (let i = 0; i < 4; i++) {
            const hand = this.gameState.hands[playerIds[i]];
            if (hand.some(card => card.suit === '♥' && card.rank === '3')) {
                this.gameState.currentPlayer = i;
                break;
            }
        }

        // 广播游戏开始
        this.broadcast({
            type: 'gameStart',
            gameState: this.getPublicGameState()
        });

        console.log(`房间 ${this.id} 游戏开始`);
    }

    // 获取公开的游戏状态（隐藏其他玩家手牌）
    getPublicGameState() {
        const playerIds = Array.from(this.players.keys());
        const publicHands = {};

        for (let i = 0; i < 4; i++) {
            const pid = playerIds[i];
            publicHands[pid] = {
                count: this.gameState.hands[pid]?.length || 0,
                // 不发送具体牌面，只发送数量
            };
        }

        return {
            started: this.gameState.started,
            currentPlayer: this.gameState.currentPlayer,
            lastPlay: this.gameState.lastPlay,
            lastPlayer: this.gameState.lastPlayer,
            level: this.gameState.level,
            trumpRank: this.getLevelRank(),
            hands: publicHands,
            passedPlayers: this.gameState.passedPlayers,
            roundWinner: this.gameState.roundWinner
        };
    }

    // 获取玩家私有状态
    getPlayerGameState(playerId) {
        return {
            ...this.getPublicGameState(),
            myHand: this.gameState.hands[playerId] || [],
            myInfo: {
                id: playerId,
                ...this.players.get(playerId)
            }
        };
    }

    // 验证牌型
    validatePlay(cards) {
        if (!cards || cards.length === 0) return { valid: false, type: null };

        const sorted = [...cards].sort((a, b) => a.value - b.value);

        // 单张
        if (cards.length === 1) {
            return { valid: true, type: 'single', value: cards[0].value };
        }

        // 对子
        if (cards.length === 2 && cards[0].value === cards[1].value) {
            return { valid: true, type: 'pair', value: cards[0].value };
        }

        // 王炸
        if (cards.length === 4 &&
            cards.filter(c => c.rank === '大王').length === 2 &&
            cards.filter(c => c.rank === '小王').length === 2) {
            return { valid: true, type: 'rocket', value: 100 };
        }

        // 三张
        if (cards.length === 3 && cards[0].value === cards[1].value && cards[1].value === cards[2].value) {
            return { valid: true, type: 'triple', value: cards[0].value };
        }

        // 三带二
        if (cards.length === 5) {
            const values = cards.map(c => c.value);
            const counts = {};
            values.forEach(v => counts[v] = (counts[v] || 0) + 1);
            const countValues = Object.values(counts);

            if (countValues.includes(3) && countValues.includes(2)) {
                const tripleValue = Object.keys(counts).find(k => counts[k] === 3);
                return { valid: true, type: 'tripleWithPair', value: parseInt(tripleValue) };
            }
        }

        // 炸弹 (4张及以上相同)
        if (cards.length >= 4) {
            if (cards.every(c => c.value === cards[0].value)) {
                return { valid: true, type: 'bomb', value: cards[0].value, length: cards.length };
            }
        }

        // 顺子 (5张及以上连续，不含2和王)
        if (cards.length >= 5) {
            const values = sorted.map(c => c.value);
            if (values.every(v => v <= 14)) { // 不含王
                let isSequence = true;
                for (let i = 1; i < values.length; i++) {
                    if (values[i] - values[i-1] !== 1) {
                        isSequence = false;
                        break;
                    }
                }
                if (isSequence) {
                    return { valid: true, type: 'straight', value: values[values.length - 1], length: cards.length };
                }
            }
        }

        // 连对 (3对及以上)
        if (cards.length >= 6 && cards.length % 2 === 0) {
            const pairs = [];
            for (let i = 0; i < cards.length; i += 2) {
                if (cards[i].value === cards[i+1].value) {
                    pairs.push(cards[i].value);
                }
            }
            if (pairs.length === cards.length / 2 && pairs.length >= 3) {
                pairs.sort((a, b) => a - b);
                let isSequence = true;
                for (let i = 1; i < pairs.length; i++) {
                    if (pairs[i] - pairs[i-1] !== 1) {
                        isSequence = false;
                        break;
                    }
                }
                if (isSequence) {
                    return { valid: true, type: 'pairStraight', value: pairs[pairs.length - 1], length: pairs.length };
                }
            }
        }

        // 飞机 (连续三张带牌)
        if (cards.length >= 6) {
            const values = cards.map(c => c.value);
            const counts = {};
            values.forEach(v => counts[v] = (counts[v] || 0) + 1);

            const triples = Object.keys(counts)
                .filter(k => counts[k] >= 3)
                .map(k => parseInt(k))
                .sort((a, b) => a - b);

            if (triples.length >= 2) {
                // 检查三张是否连续
                let consecutive = true;
                for (let i = 1; i < triples.length; i++) {
                    if (triples[i] - triples[i-1] !== 1) {
                        consecutive = false;
                        break;
                    }
                }
                if (consecutive) {
                    const tripleCount = triples.length;
                    const expectedTotal = tripleCount * 3 + tripleCount * 2; // 三带二
                    if (cards.length === tripleCount * 3) {
                        return { valid: true, type: 'plane', value: triples[triples.length - 1], length: tripleCount };
                    }
                    if (cards.length === expectedTotal) {
                        return { valid: true, type: 'planeWithPair', value: triples[triples.length - 1], length: tripleCount };
                    }
                }
            }
        }

        // 同花顺
        if (cards.length >= 5) {
            if (cards.every(c => c.suit === cards[0].suit)) {
                const values = sorted.map(c => c.value);
                let isSequence = true;
                for (let i = 1; i < values.length; i++) {
                    if (values[i] - values[i-1] !== 1) {
                        isSequence = false;
                        break;
                    }
                }
                if (isSequence && values.every(v => v <= 14)) {
                    return { valid: true, type: 'flushStraight', value: values[values.length - 1], length: cards.length };
                }
            }
        }

        return { valid: false, type: null };
    }

    // 比较牌型大小
    comparePlay(newPlay, lastPlay) {
        if (!lastPlay) return true; // 第一个出牌

        // 王炸最大
        if (newPlay.type === 'rocket') return true;
        if (lastPlay.type === 'rocket') return false;

        // 炸弹比普通牌大
        if (newPlay.type === 'bomb' && lastPlay.type !== 'bomb') return true;
        if (lastPlay.type === 'bomb' && newPlay.type !== 'bomb') return false;

        // 同类型比较
        if (newPlay.type === lastPlay.type) {
            // 顺子、连对、飞机需要长度相同
            if (['straight', 'pairStraight', 'plane', 'planeWithPair', 'flushStraight'].includes(newPlay.type)) {
                if (newPlay.length !== lastPlay.length) return false;
            }
            // 炸弹比较张数
            if (newPlay.type === 'bomb') {
                if (newPlay.length > lastPlay.length) return true;
                if (newPlay.length < lastPlay.length) return false;
            }
            return newPlay.value > lastPlay.value;
        }

        // 同花顺 > 5张炸弹 > 4张炸弹
        if (newPlay.type === 'flushStraight' && lastPlay.type === 'bomb') {
            if (lastPlay.length <= 5) return true;
            return false;
        }

        return false;
    }

    // 出牌
    playCards(playerId, cards) {
        if (!this.gameState.started) return { success: false, message: '游戏未开始' };

        const playerIds = Array.from(this.players.keys());
        const currentPlayerId = playerIds[this.gameState.currentPlayer];

        if (currentPlayerId !== playerId) {
            return { success: false, message: '不是你的回合' };
        }

        const player = this.players.get(playerId);
        if (player.finished) {
            return { success: false, message: '你已经出完牌了' };
        }

        // 验证牌型
        const playResult = this.validatePlay(cards);
        if (!playResult.valid) {
            return { success: false, message: '无效的牌型' };
        }

        // 如果是第一个出牌或新一轮开始，必须包含特定牌
        if (!this.gameState.lastPlay) {
            // 第一手必须包含红桃3（第一局）
            // 这里简化处理，第一手可以是任意牌
        }

        // 比较牌型
        if (this.gameState.lastPlay && this.gameState.lastPlayer !== playerId) {
            if (!this.comparePlay(playResult, this.gameState.lastPlay)) {
                return { success: false, message: '牌不够大' };
            }
        }

        // 从手牌中移除
        const hand = this.gameState.hands[playerId];
        for (const card of cards) {
            const index = hand.findIndex(c =>
                c.suit === card.suit && c.rank === card.rank
            );
            if (index === -1) {
                return { success: false, message: '你没有这张牌' };
            }
            hand.splice(index, 1);
        }

        // 更新游戏状态
        this.gameState.lastPlay = playResult;
        this.gameState.lastPlay.cards = cards;
        this.gameState.lastPlayer = playerId;
        this.gameState.passedPlayers = [];

        // 检查是否出完
        if (hand.length === 0) {
            player.finished = true;
            player.rank = this.getFinishedCount() + 1;
            this.broadcast({
                type: 'playerFinished',
                playerId: playerId,
                playerName: player.name,
                rank: player.rank
            });
        }

        // 检查是否一局结束
        if (this.checkRoundEnd()) {
            this.endRound();
        } else {
            this.nextPlayer();
        }

        return { success: true };
    }

    // 过牌
    pass(playerId) {
        if (!this.gameState.started) return { success: false, message: '游戏未开始' };

        const playerIds = Array.from(this.players.keys());
        const currentPlayerId = playerIds[this.gameState.currentPlayer];

        if (currentPlayerId !== playerId) {
            return { success: false, message: '不是你的回合' };
        }

        const player = this.players.get(playerId);
        if (player.finished) {
            return { success: false, message: '你已经出完牌了' };
        }

        // 如果是新一轮的开始，不能过
        if (!this.gameState.lastPlay || this.gameState.lastPlayer === playerId) {
            return { success: false, message: '你必须出牌' };
        }

        this.gameState.passedPlayers.push(playerId);
        this.nextPlayer();

        return { success: true };
    }

    nextPlayer() {
        const playerIds = Array.from(this.players.keys());
        let nextIndex = (this.gameState.currentPlayer + 1) % 4;
        let attempts = 0;

        // 跳过已出完的玩家
        while (attempts < 4) {
            const nextPlayerId = playerIds[nextIndex];
            const player = this.players.get(nextPlayerId);

            if (!player.finished) {
                this.gameState.currentPlayer = nextIndex;
                break;
            }
            nextIndex = (nextIndex + 1) % 4;
            attempts++;
        }

        // 检查是否所有人都要不起
        const activePlayers = Array.from(this.players.values()).filter(p => !p.finished);
        if (this.gameState.passedPlayers.length >= activePlayers.length - 1) {
            // 当前出牌者获得新一轮出牌权
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
        // 检查是否有一方全部出完
        const team1Finished = Array.from(this.players.values())
            .filter(p => p.team === 1)
            .every(p => p.finished);

        const team2Finished = Array.from(this.players.values())
            .filter(p => p.team === 2)
            .every(p => p.finished);

        // 检查是否已有三个人出完
        const finishedCount = this.getFinishedCount();
        if (finishedCount >= 3) {
            return true;
        }

        return team1Finished || team2Finished;
    }

    endRound() {
        // 计算升级数
        const team1Players = Array.from(this.players.values()).filter(p => p.team === 1);
        const team2Players = Array.from(this.players.values()).filter(p => p.team === 2);

        const team1Ranks = team1Players.map(p => p.rank).filter(r => r > 0);
        const team2Ranks = team2Players.map(p => p.rank).filter(r => r > 0);

        let levelUp = 0;
        let winner = null;

        // 双下：一方获得前两名
        if ((team1Ranks.includes(1) && team1Ranks.includes(2)) ||
            (team2Ranks.includes(1) && team2Ranks.includes(2))) {
            levelUp = 3;
            winner = team1Ranks.includes(1) ? 1 : 2;
        }
        // 单下：一方获得第一和第三
        else if ((team1Ranks.includes(1) && team1Ranks.includes(3)) ||
                 (team2Ranks.includes(1) && team2Ranks.includes(3))) {
            levelUp = 2;
            winner = team1Ranks.includes(1) ? 1 : 2;
        }
        // 平局
        else {
            levelUp = 1;
            winner = team1Ranks.includes(1) ? 1 : 2;
        }

        this.gameState.roundWinner = winner;

        // 广播回合结束
        this.broadcast({
            type: 'roundEnd',
            winner: winner,
            levelUp: levelUp,
            ranks: Array.from(this.players.values()).map(p => ({
                name: p.name,
                team: p.team,
                rank: p.rank
            }))
        });

        console.log(`房间 ${this.id} 回合结束，队伍${winner}获胜，升级${levelUp}级`);
    }

    // 开始新一局
    startNewRound() {
        // 更新级别
        if (this.gameState.roundWinner) {
            this.gameState.level += 1; // 简化：每局升一级
            if (this.gameState.level > 14) {
                // 游戏结束
                this.broadcast({
                    type: 'gameOver',
                    winner: this.gameState.roundWinner
                });
                return;
            }
        }

        // 重置状态
        for (let player of this.players.values()) {
            player.finished = false;
            player.rank = 0;
            player.ready = false;
        }

        this.gameState.hands = this.dealCards();
        this.gameState.currentPlayer = 0;
        this.gameState.lastPlay = null;
        this.gameState.lastPlayer = null;
        this.gameState.passedPlayers = [];
        this.gameState.roundWinner = null;

        // 找到有红桃3的玩家
        const playerIds = Array.from(this.players.keys());
        for (let i = 0; i < 4; i++) {
            const hand = this.gameState.hands[playerIds[i]];
            if (hand.some(card => card.suit === '♥' && card.rank === '3')) {
                this.gameState.currentPlayer = i;
                break;
            }
        }

        this.broadcast({
            type: 'newRound',
            gameState: this.getPublicGameState()
        });
    }

    broadcast(message) {
        const data = JSON.stringify(message);
        this.players.forEach((player, playerId) => {
            if (player.ws.readyState === WebSocket.OPEN) {
                // 如果是游戏状态，发送玩家的私有状态
                if (message.type === 'gameStart' || message.type === 'gameState' ||
                    message.type === 'newRound') {
                    player.ws.send(JSON.stringify({
                        ...message,
                        gameState: this.getPlayerGameState(playerId)
                    }));
                } else {
                    player.ws.send(data);
                }
            }
        });
    }

    broadcastGameState() {
        this.broadcast({ type: 'gameState' });
    }

    broadcastPlayerList() {
        const players = Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            playerNum: p.playerNum,
            team: p.team,
            ready: p.ready
        }));

        this.broadcast({
            type: 'playerList',
            players: players
        });
    }
}

// 生成房间ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('新客户端连接');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (e) {
            console.error('消息解析错误:', e);
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
    });
});

function handleMessage(ws, data) {
    switch(data.type) {
        case 'createRoom':
            createRoom(ws, data.playerName);
            break;

        case 'joinRoom':
            joinRoom(ws, data.roomId, data.playerName);
            break;

        case 'ready':
            setReady(ws, data.playerId, data.ready);
            break;

        case 'play':
            handlePlay(ws, data.playerId, data.cards);
            break;

        case 'pass':
            handlePass(ws, data.playerId);
            break;

        case 'newRound':
            handleNewRound(ws, data.playerId);
            break;

        case 'chat':
            handleChat(ws, data);
            break;
    }
}

function createRoom(ws, playerName) {
    const roomId = generateRoomId();
    const playerId = 'P_' + Math.random().toString(36).substring(2, 10);

    const room = new GameRoom(roomId);
    room.addPlayer(ws, playerId, playerName);

    rooms.set(roomId, room);
    playerToRoom.set(playerId, roomId);

    ws.send(JSON.stringify({
        type: 'roomCreated',
        roomId: roomId,
        playerId: playerId,
        players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            playerNum: p.playerNum,
            team: p.team,
            ready: p.ready
        }))
    }));

    console.log(`房间创建: ${roomId}, 玩家: ${playerName}`);
}

function joinRoom(ws, roomId, playerName) {
    const room = rooms.get(roomId);

    if (!room) {
        ws.send(JSON.stringify({
            type: 'error',
            message: '房间不存在'
        }));
        return;
    }

    if (room.players.size >= room.maxPlayers) {
        ws.send(JSON.stringify({
            type: 'error',
            message: '房间已满（需要4人）'
        }));
        return;
    }

    const playerId = 'P_' + Math.random().toString(36).substring(2, 10);

    if (!room.addPlayer(ws, playerId, playerName)) {
        ws.send(JSON.stringify({
            type: 'error',
            message: '加入房间失败'
        }));
        return;
    }

    playerToRoom.set(playerId, roomId);

    ws.send(JSON.stringify({
        type: 'roomJoined',
        roomId: roomId,
        playerId: playerId,
        players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            playerNum: p.playerNum,
            team: p.team,
            ready: p.ready
        }))
    }));

    // 广播给其他玩家
    room.broadcastPlayerList();

    console.log(`玩家加入: ${roomId}, 玩家: ${playerName}`);
}

function setReady(ws, playerId, ready) {
    const roomId = playerToRoom.get(playerId);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.setPlayerReady(playerId, ready);
}

function handlePlay(ws, playerId, cards) {
    const roomId = playerToRoom.get(playerId);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const result = room.playCards(playerId, cards);

    if (!result.success) {
        ws.send(JSON.stringify({
            type: 'playError',
            message: result.message
        }));
    }
}

function handlePass(ws, playerId) {
    const roomId = playerToRoom.get(playerId);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const result = room.pass(playerId);

    if (!result.success) {
        ws.send(JSON.stringify({
            type: 'playError',
            message: result.message
        }));
    }
}

function handleNewRound(ws, playerId) {
    const roomId = playerToRoom.get(playerId);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.startNewRound();
}

function handleChat(ws, data) {
    const roomId = playerToRoom.get(data.playerId);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(data.playerId);
    if (!player) return;

    room.broadcast({
        type: 'chat',
        playerId: data.playerId,
        playerName: player.name,
        message: data.message
    });
}

function handleDisconnect(ws) {
    for (let [playerId, roomId] of playerToRoom.entries()) {
        const room = rooms.get(roomId);
        if (room) {
            const player = room.players.get(playerId);
            if (player && player.ws === ws) {
                console.log(`玩家断开连接: ${player.name}`);

                const shouldDelete = room.removePlayer(playerId);
                playerToRoom.delete(playerId);

                if (shouldDelete) {
                    rooms.delete(roomId);
                    console.log(`房间删除: ${roomId}`);
                } else {
                    room.broadcast({
                        type: 'playerLeft',
                        playerId: playerId,
                        playerName: player.name
                    });
                    room.broadcastPlayerList();
                }
                break;
            }
        }
    }
}

console.log(`🃏 掼蛋局域网服务器运行在端口 ${PORT}`);
console.log(`等待玩家连接...`);
