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
let roomCounter = 0; // 房间计数器

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
        this.players = new Map();
        this.spectators = new Map(); // 观战者
        this.maxPlayers = 4;
        this.turnTimeout = mode === 'fast' ? 15 : 30; // 出牌时间
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

    // 获取按playerNum排序的玩家ID数组（与客户端保持一致）
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
    addSpectator(ws, spectatorId, spectatorName) {
        this.spectators.set(spectatorId, {
            ws, id: spectatorId, name: spectatorName
        });
        return true;
    }

    // 移除观战者
    removeSpectator(spectatorId) {
        this.spectators.delete(spectatorId);
        return this.spectators.size === 0 && this.players.size === 0;
    }

    // 获取观战者视角的游戏状态（只能看到一个玩家的手牌）
    getSpectatorGameState(viewPlayerId = null) {
        const playerIds = this.getSortedPlayerIds();
        const allHands = {};
        const playerInfo = {};

        // 如果没有指定观看的玩家，默认观看当前出牌玩家
        let targetPid = viewPlayerId;
        if (!targetPid && playerIds.length > 0) {
            targetPid = playerIds[this.gameState.currentPlayer];
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

        this.broadcast({ type: 'gameStart', gameState: this.getPublicGameState() });
        console.log(`房间 ${this.id} 游戏开始`);

        // 如果轮到AI玩家，延迟后自动出牌
        const currentPlayerId = playerIds[this.gameState.currentPlayer];
        const currentPlayer = this.players.get(currentPlayerId);
        if (currentPlayer && currentPlayer.isAI) {
            const delay = 1000 + Math.random() * 1000; // 随机1-2秒
            setTimeout(() => this.aiPlayCards(currentPlayerId), delay);
        }
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

        // 分离逢人配和普通牌
        const trumpCards = cards.filter(c => c.isTrump); // 逢人配（红桃级牌）
        const normalCards = cards.filter(c => !c.isTrump && !c.isJoker);
        const hasJoker = cards.some(c => c.isJoker);

        // 获取牌的原始值
        const getValue = (c) => RANK_VALUES[c.rank] || c.value;

        // 单张
        if (cards.length === 1) return { valid: true, type: 'single', value: cards[0].value };

        // 对子：两张相同，或一张普通牌+一张逢人配
        if (cards.length === 2 && !hasJoker) {
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

        // 三带二：逢人配可以参与
        if (cards.length === 5 && !hasJoker) {
            // 统计普通牌的值
            const valueCounts = {};
            normalCards.forEach(c => {
                const v = getValue(c);
                valueCounts[v] = (valueCounts[v] || 0) + 1;
            });

            // 尝试所有可能的三带二组合
            for (const tripleVal of Object.keys(valueCounts)) {
                for (const pairVal of Object.keys(valueCounts)) {
                    if (tripleVal === pairVal) continue;

                    const tripleCount = valueCounts[tripleVal];
                    const pairCount = valueCounts[pairVal];

                    // 计算需要多少逢人配
                    const needForTriple = Math.max(0, 3 - tripleCount);
                    const needForPair = Math.max(0, 2 - pairCount);

                    if (needForTriple + needForPair <= trumpCards.length) {
                        return { valid: true, type: 'tripleWithPair', value: parseFloat(tripleVal) };
                    }
                }
            }

            // 纯逢人配三带二
            if (trumpCards.length >= 5) {
                return { valid: true, type: 'tripleWithPair', value: 14.5 };
            }
            // 4张逢人配 + 1张普通牌
            if (trumpCards.length === 4 && normalCards.length === 1) {
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

            // 尝试所有可能的连续3对：AA223到QKAA(无效)，实际是223344到QQKKAA
            // 连对的值范围：2-2-3, 3-3-4, ..., Q-K-A（但A只能当14，不能当1）
            const pairPatterns = [
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

            // 尝试所有可能的连续2组三张：2233到KKAA
            const planePatterns = [
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
        for (const card of cards) {
            const idx = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
            if (idx === -1) return { success: false, message: '你没有这张牌' };
            actualCards.push(hand[idx]);
        }

        const result = this.validatePlay(actualCards);
        if (!result.valid) return { success: false, message: '无效的牌型' };

        if (this.gameState.lastPlay && this.gameState.lastPlayer !== playerId) {
            if (!this.comparePlay(result, this.gameState.lastPlay)) return { success: false, message: '牌不够大' };
        }

        // 从手牌中移除
        for (const card of actualCards) {
            const idx = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
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

        if (this.checkRoundEnd()) this.endRound();
        else this.nextPlayer();

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
        this.turnTimer = setInterval(() => {
            this.gameState.turnTimeLeft--;
            this.broadcast({ type: 'turnTimeUpdate', timeLeft: this.gameState.turnTimeLeft });

            if (this.gameState.turnTimeLeft <= 0) {
                this.clearTurnTimer();
                this.handleTurnTimeout(playerId);
            }
        }, 1000);

        // 立即广播初始时间
        this.broadcast({ type: 'turnTimeUpdate', timeLeft: this.gameState.turnTimeLeft });
    }

    // 清除回合计时器
    clearTurnTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
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
            this.playCards(playerId, cards);
        } else {
            // 先广播AI要pass的消息，让客户端显示"过"气泡
            this.broadcast({ type: 'playerPass', playerId: playerId, playerName: player.name });
            // 延迟后执行pass（立即执行，不再延迟，因为aiPlayCards本身已经是延迟调用的）
            const passResult = this.pass(playerId, false);
            console.log(`aiPlayCards: pass 结果 ${JSON.stringify(passResult)}`);
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
        // 统计手牌
        const counts = {};
        hand.forEach(c => {
            if (!counts[c.value]) counts[c.value] = [];
            counts[c.value].push(c);
        });

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
        const counts = {};
        hand.forEach(c => {
            if (!counts[c.value]) counts[c.value] = [];
            counts[c.value].push(c);
        });
        Object.values(counts).forEach(cards => {
            if (cards.length >= 4) {
                bombs.push(cards.slice(0, 4));
            }
        });
        return bombs.sort((a, b) => a[0].value - b[0].value);
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

    endRound() {
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

        // 获得第1名的队伍
        const firstPlaceTeam = t1r.includes(1) ? 1 : 2;

        // 检查双赢（搭档双方为一二名）
        if ((t1r.includes(1) && t1r.includes(2)) || (t2r.includes(1) && t2r.includes(2))) {
            levelUp = 3;
            winner = firstPlaceTeam;
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

        this.broadcast({
            type: 'roundEnd', winner, levelUp,
            loser: winner === 1 ? 2 : 1,
            ranks: Array.from(this.players.values()).map(p => ({ name: p.name, team: p.team, rank: p.rank })),
            teamLevels: this.gameState.teamLevels
        });

        const resultText = levelUp === 3 ? '双赢' : levelUp === 2 ? '中赢' : levelUp === 1 ? '小赢' : '失败';
        console.log(`房间 ${this.id} 回合结束，队伍${winner}${resultText}，升级${levelUp}级`);
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
            p.ready = p.isAI ? true : false; // AI玩家自动准备
        }

        this.gameState.hands = this.dealCards();
        this.gameState.currentPlayer = 0;
        this.gameState.lastPlay = null;
        this.gameState.lastPlayer = null;
        this.gameState.passedPlayers = [];
        this.gameState.roundWinner = null;
        this.gameState.levelUp = 0;

        const playerIds = this.getSortedPlayerIds();
        for (let i = 0; i < 4; i++) {
            if (this.gameState.hands[playerIds[i]].some(c => c.suit === '♥' && c.rank === '3')) {
                this.gameState.currentPlayer = i;
                break;
            }
        }

        this.broadcast({ type: 'newRound', gameState: this.getPublicGameState() });

        // 如果轮到AI玩家，延迟后自动出牌
        const currentPlayerId = playerIds[this.gameState.currentPlayer];
        const currentPlayer = this.players.get(currentPlayerId);
        if (currentPlayer && currentPlayer.isAI) {
            setTimeout(() => this.aiPlayCards(currentPlayerId), this.getAIRandomDelay());
        }
    }

    broadcast(msg) {
        const data = JSON.stringify(msg);
        // 向玩家发送（跳过AI玩家，他们没有ws连接）
        this.players.forEach((p, pid) => {
            if (p.ws && p.ws.readyState === WebSocket.OPEN) {
                if (msg.type === 'gameStart' || msg.type === 'gameState' || msg.type === 'newRound') {
                    p.ws.send(JSON.stringify({ ...msg, gameState: this.getPlayerGameState(pid) }));
                } else {
                    p.ws.send(data);
                }
            }
        });
        // 向观战者发送（保持每个观战者当前查看的玩家）
        this.spectators.forEach((s, sid) => {
            if (s.ws.readyState === WebSocket.OPEN) {
                if (msg.type === 'gameStart' || msg.type === 'gameState' || msg.type === 'newRound') {
                    // 默认查看当前出牌玩家
                    const playerIds = this.getSortedPlayerIds();
                    const viewPid = s.viewPlayerId || playerIds[this.gameState.currentPlayer];
                    s.ws.send(JSON.stringify({ ...msg, gameState: this.getSpectatorGameState(viewPid) }));
                } else {
                    s.ws.send(data);
                }
            }
        });
    }

    // 设置观战者查看的玩家
    setSpectatorViewPlayer(spectatorId, viewPlayerId) {
        const spectator = this.spectators.get(spectatorId);
        if (spectator) {
            spectator.viewPlayerId = viewPlayerId;
        }
    }

    broadcastGameState() { this.broadcast({ type: 'gameState' }); }

    broadcastPlayerList() {
        this.broadcast({
            type: 'playerList',
            players: Array.from(this.players.values()).map(p => ({
                id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready, isAI: p.isAI
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
                    // 检查是否指定了包间号，且是否重复
                    const parsedTableNumber = data.tableNumber ? parseInt(data.tableNumber) : null;
                    const customTableNumber = (parsedTableNumber && !isNaN(parsedTableNumber)) ? parsedTableNumber : null;

                    if (customTableNumber) {
                        // 检查包间号是否已存在
                        for (let [, room] of rooms) {
                            if (room.tableNumber === customTableNumber) {
                                ws.send(JSON.stringify({ type: 'error', message: `包间${customTableNumber}已存在，请更换号码` }));
                                return;
                            }
                        }
                    }

                    const roomId = generateRoomId();
                    const playerId = 'P_' + Math.random().toString(36).substring(2, 10);
                    const mode = data.mode || 'normal'; // 默认正常模式
                    const allowSpectator = data.allowSpectator !== false; // 默认允许观战
                    const tableNumber = customTableNumber || (++roomCounter); // 使用自定义包间号或自动递增
                    const room = new GameRoom(roomId, mode, allowSpectator, tableNumber);
                    room.addPlayer(ws, playerId, data.playerName);
                    rooms.set(roomId, room);
                    playerToRoom.set(playerId, roomId);
                    ws.send(JSON.stringify({
                        type: 'roomCreated', roomId, playerId, mode, allowSpectator, tableNumber,
                        players: Array.from(room.players.values()).map(p => ({
                            id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready
                        }))
                    }));
                    broadcastRoomList();
                    console.log(`房间创建: 包间${tableNumber} (${mode === 'fast' ? '快速' : '正常'}模式, ${allowSpectator ? '允许观战' : '禁止观战'})`);
                    break;
                }
                case 'joinRoom': {
                    const room = rooms.get(data.roomId);
                    if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间不存在' })); return; }
                    if (room.players.size >= 4) { ws.send(JSON.stringify({ type: 'error', message: '房间已满' })); return; }
                    const playerId = 'P_' + Math.random().toString(36).substring(2, 10);
                    // 支持指定座位号加入
                    const seatNum = data.seatNum || null;
                    if (!room.addPlayer(ws, playerId, data.playerName, seatNum)) {
                        ws.send(JSON.stringify({ type: 'error', message: '该座位已被占用' }));
                        return;
                    }
                    playerToRoom.set(playerId, data.roomId);
                    ws.send(JSON.stringify({
                        type: 'roomJoined', roomId: data.roomId, playerId,
                        tableNumber: room.tableNumber, // 添加桌号
                        players: Array.from(room.players.values()).map(p => ({
                            id: p.id, name: p.name, playerNum: p.playerNum, team: p.team, ready: p.ready
                        }))
                    }));
                    room.broadcastPlayerList();
                    broadcastRoomList();
                    console.log(`玩家加入: ${data.roomId} 座位${seatNum || '自动'}`);
                    break;
                }
                case 'spectateRoom': {
                    // 观战者加入
                    const room = rooms.get(data.roomId);
                    if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间不存在' })); return; }
                    if (!room.allowSpectator) { ws.send(JSON.stringify({ type: 'error', message: '该房间不允许观战' })); return; }
                    const spectatorId = 'S_' + Math.random().toString(36).substring(2, 10);
                    room.addSpectator(ws, spectatorId, data.playerName);
                    playerToRoom.set(spectatorId, data.roomId);

                    // 发送观战者状态
                    ws.send(JSON.stringify({
                        type: 'spectatorJoined',
                        roomId: data.roomId,
                        spectatorId: spectatorId,
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
                    const rid = playerToRoom.get(data.spectatorId);
                    const room = rooms.get(rid);
                    if (room && room.spectators.has(data.spectatorId)) {
                        room.setSpectatorViewPlayer(data.spectatorId, data.viewPlayerId);
                        const spectator = room.spectators.get(data.spectatorId);
                        spectator.ws.send(JSON.stringify({
                            type: 'spectatorViewState',
                            gameState: room.getSpectatorGameState(data.viewPlayerId)
                        }));
                    }
                    break;
                }
                case 'ready': {
                    const rid = playerToRoom.get(data.playerId);
                    if (rid) rooms.get(rid)?.setPlayerReady(data.playerId, data.ready);
                    break;
                }
                case 'addAI': {
                    // 添加AI玩家
                    const room = rooms.get(data.roomId);
                    if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间不存在' })); return; }
                    if (room.players.size >= 4) { ws.send(JSON.stringify({ type: 'error', message: '房间已满' })); return; }

                    const aiId = 'AI_' + Math.random().toString(36).substring(2, 10);
                    const aiNames = ['🤖 AI小明', '🤖 AI小红', '🤖 AI小刚', '🤖 AI小丽'];
                    const aiName = aiNames[room.players.size] || `🤖 AI${room.players.size + 1}`;

                    if (room.addAIPlayer(aiId, aiName, data.seatNum)) {
                        playerToRoom.set(aiId, data.roomId);
                        broadcastRoomList();
                        room.broadcastPlayerList();
                        room.checkStartGame();
                        console.log(`AI玩家加入: ${data.roomId} - ${aiName}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: '添加AI失败' }));
                    }
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
                case 'setAutoPlay': {
                    // 设置托管状态
                    const rid = playerToRoom.get(data.playerId);
                    const room = rooms.get(rid);
                    if (room) {
                        room.setAutoPlay(data.playerId, data.autoPlay);
                    }
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
                    // 先检查是否是普通玩家
                    const p = room?.players.get(data.playerId);
                    if (p) {
                        room.broadcast({ type: 'chat', playerId: data.playerId, playerName: p.name, message: data.message, isSpectator: false });
                    } else {
                        // 检查是否是观战者
                        const s = room?.spectators.get(data.playerId);
                        if (s) {
                            room.broadcast({ type: 'chat', playerId: data.playerId, playerName: s.name, message: data.message, isSpectator: true });
                        }
                    }
                    break;
                }
            }
        } catch (e) { console.error('消息错误:', e); }
    });

    ws.on('close', () => {
        for (let [pid, rid] of playerToRoom.entries()) {
            const room = rooms.get(rid);
            // 先检查是否是玩家
            const p = room?.players.get(pid);
            if (p?.ws === ws) {
                console.log(`玩家断开: ${p.name}`);

                // 如果游戏正在进行中，将该玩家替换为AI而不是删除
                if (room.gameState.started) {
                    console.log(`游戏进行中，将 ${p.name} 替换为AI接管`);
                    p.ws = null;
                    p.isAI = true;
                    p.name = '🤖 ' + p.name.replace('🤖 ', ''); // 添加AI前缀
                    p.ready = true; // AI自动准备

                    // 广播玩家被AI接管的通知
                    room.broadcast({
                        type: 'playerReplacedByAI',
                        playerId: pid,
                        playerName: p.name,
                        message: `${p.name.replace('🤖 ', '')} 已离线，由AI接管`
                    });
                    room.broadcastPlayerList();

                    // 检查是否所有玩家都是AI，如果是则解散房间
                    if (room.allPlayersAreAI()) {
                        console.log(`房间 ${rid} 所有玩家都已离线，自动解散`);
                        // 清理定时器
                        if (room.turnTimer) {
                            clearTimeout(room.turnTimer);
                            room.turnTimer = null;
                        }
                        rooms.delete(rid);
                        playerToRoom.delete(pid);
                        broadcastRoomList();
                        break;
                    }

                    // 如果当前轮到该玩家，让AI立即出牌
                    const playerIds = Array.from(room.players.keys());
                    if (playerIds[room.gameState.currentPlayer] === pid) {
                        setTimeout(() => room.aiPlayCards(pid), room.getAIRandomDelay());
                    }
                } else {
                    // 游戏未开始，正常移除玩家
                    if (room.removePlayer(pid)) {
                        rooms.delete(rid);
                        console.log(`房间删除: ${rid}`);
                    } else {
                        // 广播玩家离开通知
                        room.broadcast({ type: 'playerLeft', playerId: pid, playerName: p.name });
                        // 更新房间内玩家列表
                        room.broadcastPlayerList();
                    }
                }
                playerToRoom.delete(pid);
                broadcastRoomList();
                break;
            }
            // 检查是否是观战者
            const s = room?.spectators.get(pid);
            if (s?.ws === ws) {
                console.log(`观战者断开: ${s.name}`);
                room.removeSpectator(pid);
                playerToRoom.delete(pid);
                // 通知房间内玩家
                room.broadcast({ type: 'spectatorLeft', spectatorName: s.name });
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
            tableNumber: room.tableNumber, // 桌号
            mode: room.mode,
            allowSpectator: room.allowSpectator, // 是否允许观战
            turnTimeout: room.turnTimeout,
            playerCount: room.players.size,
            maxPlayers: room.maxPlayers,
            spectatorCount: room.spectators.size, // 观战者数量
            started: room.gameState.started,
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

watchFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        fs.watch(filePath, (eventType) => {
            if (eventType === 'change' && !isRestarting) {
                isRestarting = true;
                console.log(``);
                console.log(`🔄 检测到 ${file} 变化，正在重启服务器...`);
                console.log(``);

                // 关闭所有WebSocket连接
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.close(1001, '服务器重启');
                    }
                });

                // 关闭服务器
                server.close(() => {
                    // 延迟重启，避免频繁重启
                    setTimeout(() => {
                        // 使用 spawn 启动新进程
                        const { spawn } = require('child_process');
                        const child = spawn(process.argv[0], process.argv.slice(1), {
                            detached: true,
                            stdio: 'inherit',
                            shell: true
                        });
                        child.unref();

                        // 退出当前进程
                        process.exit(0);
                    }, 500);
                });

                // 强制退出超时
                setTimeout(() => {
                    console.log('⏱️ 强制重启...');
                    process.exit(0);
                }, 3000);
            }
        });
    }
});

console.log('🔧 自动重启功能已启用 (监视文件变化)');

