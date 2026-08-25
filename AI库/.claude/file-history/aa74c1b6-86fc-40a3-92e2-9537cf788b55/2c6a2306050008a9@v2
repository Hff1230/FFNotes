// 八十分局域网服务器 - 支持HTTP和WebSocket
// 运行方式: node 80-server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 8082;

// ==================== HTTP服务器 ====================
const server = http.createServer((req, res) => {
    console.log(`HTTP请求: ${req.url}`);

    if (req.url === '/' || req.url === '/index.html') {
        const htmlPath = path.join(__dirname, '80-lan.html');
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
let roomCounter = 0;

// 牌面常量
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
    '小王': 15, '大王': 16
};

// 分值牌
const SCORE_CARDS = { 'K': 10, '10': 10, '5': 5 };

// 级别转换为牌面
const LEVEL_TO_RANK = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
    10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

// 级别顺序
const LEVEL_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

// ==================== 房间类 ====================
class GameRoom {
    constructor(id, tableNumber = 0) {
        this.id = id;
        this.tableNumber = tableNumber;
        this.players = new Map();
        this.maxPlayers = 4;
        this.turnTimeout = 30;
        this.turnTimer = null;

        this.gameState = {
            started: false,
            phase: 'waiting',  // waiting, dealing, bidding, playing, finished

            // 牌局核心
            deck: [],
            bottomCards: [],       // 8张底牌
            hands: {},

            // 叫主相关
            trumpSuit: null,       // 主花色 ♠♥♦♣
            trumpCaller: null,     // 叫主者ID
            currentBidder: 0,      // 当前叫主者索引
            currentBid: null,      // 当前最高叫主 {playerId, suit, count}
            bidHistory: [],        // 叫主历史
            passCount: 0,          // 连续pass次数

            // 出牌相关
            currentPlayer: 0,
            leadPlayer: null,      // 本轮首出玩家
            leadCards: null,       // 本轮首出的牌
            leadSuit: null,        // 本轮首出花色
            leadType: null,        // 本轮首出牌型
            currentRoundPlays: [], // 本轮所有出牌记录

            // 计分相关
            scores: { team1: 0, team2: 0 },  // 双方得分
            capturedCards: { team1: [], team2: [] },  // 各队捕获的牌

            // 升级相关
            teamLevels: { 1: 2, 2: 2 },      // 双方当前级别
            currentAttackTeam: 1,            // 当前攻方（庄家对手）
            dealerTeam: 1,                   // 庄家方

            // 游戏结束
            roundWinner: null,
            levelUp: 0,

            // 托管
            autoPlay: {}
        };
    }

    getSortedPlayerIds() {
        return Array.from(this.players.entries())
            .sort((a, b) => a[1].playerNum - b[1].playerNum)
            .map(([id]) => id);
    }

    addPlayer(ws, playerId, playerName, seatNum = null) {
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

        // 队伍分配：1、3号位 = 队伍1，2、4号位 = 队伍2
        const team = (playerNum % 2 === 1) ? 1 : 2;

        this.players.set(playerId, {
            ws, id: playerId, name: playerName,
            playerNum, team, ready: false,
            isAI: false
        });
        return true;
    }

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
            playerNum, team, ready: true,
            isAI: true
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
        return LEVEL_TO_RANK[this.gameState.teamLevels[this.gameState.currentAttackTeam]];
    }

    // 创建牌组（2副牌108张）
    createDeck() {
        const deck = [];
        const levelRank = this.getCurrentLevelRank();

        for (let i = 0; i < 2; i++) {
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    deck.push({
                        suit,
                        rank,
                        value: RANK_VALUES[rank],
                        isJoker: false,
                        isLevelCard: rank === levelRank,
                        score: SCORE_CARDS[rank] || 0
                    });
                }
            }
            deck.push({ suit: '🃏', rank: '小王', value: 15, isJoker: true, isLevelCard: false, score: 0 });
            deck.push({ suit: '🃏', rank: '大王', value: 16, isJoker: true, isLevelCard: false, score: 0 });
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

    // 发牌：每人25张 + 8张底牌
    dealCards() {
        const deck = this.shuffle(this.createDeck());
        const hands = {};
        const playerIds = this.getSortedPlayerIds();

        // 每人25张
        for (let i = 0; i < 4; i++) {
            hands[playerIds[i]] = deck.slice(i * 25, (i + 1) * 25);
            this.sortHand(hands[playerIds[i]]);
        }

        // 8张底牌
        this.gameState.bottomCards = deck.slice(100, 108);

        return hands;
    }

    sortHand(hand) {
        const levelRank = this.getCurrentLevelRank();
        const trumpSuit = this.gameState.trumpSuit;

        hand.sort((a, b) => {
            // 主牌排最前面
            const isTrumpA = this.isTrump(a, trumpSuit, levelRank);
            const isTrumpB = this.isTrump(b, trumpSuit, levelRank);

            if (isTrumpA && !isTrumpB) return -1;
            if (!isTrumpA && isTrumpB) return 1;

            // 都是主牌或都是副牌，按值排序
            if (a.value !== b.value) return b.value - a.value;
            return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        });
    }

    // 判断是否是主牌
    isTrump(card, trumpSuit, levelRank) {
        if (!trumpSuit) return false;
        if (card.isJoker) return true;
        if (card.rank === levelRank) return true;
        if (card.suit === trumpSuit) return true;
        return false;
    }

    // 获取主牌值（用于比较）
    getTrumpValue(card, trumpSuit, levelRank) {
        if (card.rank === '大王') return 100;
        if (card.rank === '小王') return 99;
        if (card.rank === levelRank) {
            // 级牌：主花色级牌 > 其他花色级牌
            if (card.suit === trumpSuit) return 98;
            return 97;
        }
        // 主花色牌
        if (card.suit === trumpSuit) {
            return 50 + card.value;
        }
        return card.value;
    }

    startGame() {
        this.gameState.started = true;
        this.gameState.phase = 'dealing';
        this.gameState.teamLevels = { 1: 2, 2: 2 };
        this.gameState.currentAttackTeam = 1;
        this.gameState.dealerTeam = 1;
        this.gameState.hands = this.dealCards();
        this.gameState.scores = { team1: 0, team2: 0 };
        this.gameState.capturedCards = { team1: [], team2: [] };
        this.gameState.trumpSuit = null;
        this.gameState.trumpCaller = null;
        this.gameState.currentBid = null;
        this.gameState.bidHistory = [];
        this.gameState.passCount = 0;

        for (let player of this.players.values()) {
            player.autoPlay = false;
        }

        const playerIds = this.getSortedPlayerIds();

        // 先广播消息让前端切换到游戏区域
        this.broadcast({ type: 'showGameArea', gameState: this.getPublicGameState() });

        // 执行逐张发牌动画
        this.animateDealCards(playerIds);

        console.log(`房间 ${this.id} 游戏开始`);
    }

    animateDealCards(playerIds) {
        const allCards = [];
        for (let i = 0; i < 25; i++) {
            for (let p = 0; p < 4; p++) {
                const hand = this.gameState.hands[playerIds[p]];
                if (hand[i]) {
                    allCards.push({ playerIndex: p, card: hand[i] });
                }
            }
        }

        let cardIndex = 0;
        const dealInterval = setInterval(() => {
            if (cardIndex < allCards.length) {
                const { playerIndex, card } = allCards[cardIndex];
                this.broadcast({
                    type: 'dealCard',
                    playerIndex: playerIndex,
                    card: card
                });
                cardIndex++;
            } else {
                clearInterval(dealInterval);
                // 发牌完成，进入叫主阶段
                this.startBidding();
            }
        }, 30);
    }

    // 开始叫主阶段
    startBidding() {
        this.gameState.phase = 'bidding';
        this.gameState.currentBidder = 0;  // 从第一个玩家开始
        this.gameState.currentBid = null;
        this.gameState.passCount = 0;
        this.gameState.bidHistory = [];

        // 给每个玩家单独发送包含其手牌的消息
        const playerIds = this.getSortedPlayerIds();
        for (const playerId of playerIds) {
            this.sendToPlayer(playerId, {
                type: 'biddingStart',
                currentBidder: this.gameState.currentBidder,
                gameState: this.getPlayerGameState(playerId)
            });
        }

        // 检查当前叫主者是否是AI
        this.checkAIBidding();
    }

    checkAIBidding() {
        const playerIds = this.getSortedPlayerIds();
        const currentPlayerId = playerIds[this.gameState.currentBidder];
        const player = this.players.get(currentPlayerId);

        if (player && player.isAI) {
            setTimeout(() => this.aiBid(currentPlayerId), 1000 + Math.random() * 1000);
        }
    }

    // AI叫主
    aiBid(playerId) {
        const hand = this.gameState.hands[playerId];
        const levelRank = this.getCurrentLevelRank();

        // 统计各花色级牌数量
        const suitCounts = {};
        for (const suit of SUITS) {
            suitCounts[suit] = hand.filter(c => c.rank === levelRank && c.suit === suit).length;
        }

        // 找到最多级牌的花色
        let maxSuit = null;
        let maxCount = 0;
        for (const suit of SUITS) {
            if (suitCounts[suit] > maxCount) {
                maxCount = suitCounts[suit];
                maxSuit = suit;
            }
        }

        // 决定是否叫主
        const currentBidCount = this.gameState.currentBid ? this.gameState.currentBid.count : 0;

        if (maxCount > currentBidCount && maxCount >= 1) {
            // 叫主
            this.processBid(playerId, maxSuit, maxCount);
        } else {
            // 放弃
            this.processPassBid(playerId);
        }
    }

    // 处理叫主
    processBid(playerId, suit, count) {
        // 验证叫主有效性
        const hand = this.gameState.hands[playerId];
        const levelRank = this.getCurrentLevelRank();
        const suitCards = hand.filter(c => c.rank === levelRank && c.suit === suit);

        if (suitCards.length < count) {
            this.sendToPlayer(playerId, { type: 'bidError', message: '没有足够的级牌' });
            return;
        }

        const currentBidCount = this.gameState.currentBid ? this.gameState.currentBid.count : 0;
        if (count <= currentBidCount) {
            this.sendToPlayer(playerId, { type: 'bidError', message: '叫主数量必须大于当前' });
            return;
        }

        // 记录叫主
        this.gameState.currentBid = { playerId, suit, count };
        this.gameState.bidHistory.push({ playerId, suit, count, action: 'bid' });
        this.gameState.passCount = 0;

        // 广播叫主信息
        const player = this.players.get(playerId);
        this.broadcast({
            type: 'bidAnnounce',
            playerId,
            playerName: player.name,
            suit,
            count
        });

        // 检查是否是4张（直接胜出）
        if (count >= 4) {
            this.endBidding(playerId, suit);
            return;
        }

        // 轮到下一个玩家
        this.nextBidder();
    }

    // 处理放弃叫主
    processPassBid(playerId) {
        this.gameState.passCount++;
        this.gameState.bidHistory.push({ playerId, action: 'pass' });

        const player = this.players.get(playerId);
        this.broadcast({
            type: 'passAnnounce',
            playerId,
            playerName: player.name
        });

        // 检查是否所有人都pass
        if (this.gameState.passCount >= 4) {
            if (this.gameState.currentBid) {
                // 有人叫过主，结束叫主
                this.endBidding(this.gameState.currentBid.playerId, this.gameState.currentBid.suit);
            } else {
                // 没人叫主，重新发牌
                this.broadcast({ type: 'noBidder', message: '没人叫主，重新发牌' });
                setTimeout(() => {
                    this.gameState.hands = this.dealCards();
                    this.startBidding();
                }, 2000);
            }
            return;
        }

        // 轮到下一个玩家
        this.nextBidder();
    }

    nextBidder() {
        this.gameState.currentBidder = (this.gameState.currentBidder + 1) % 4;

        this.broadcast({
            type: 'nextBidder',
            currentBidder: this.gameState.currentBidder
        });

        this.checkAIBidding();
    }

    // 结束叫主
    endBidding(winnerId, suit) {
        this.gameState.trumpSuit = suit;
        this.gameState.trumpCaller = winnerId;

        // 底牌给叫主者
        this.gameState.hands[winnerId] = [
            ...this.gameState.hands[winnerId],
            ...this.gameState.bottomCards
        ];
        this.sortHand(this.gameState.hands[winnerId]);

        const player = this.players.get(winnerId);
        this.broadcast({
            type: 'bidWinner',
            winnerId,
            winnerName: player.name,
            trumpSuit: suit,
            bottomCards: this.gameState.bottomCards
        });

        // 进入扣底阶段
        this.gameState.phase = 'bottomSelect';
        this.broadcast({
            type: 'bottomSelect',
            gameState: this.getPlayerGameState(winnerId)
        });

        // 如果是AI，自动扣底
        if (player.isAI) {
            setTimeout(() => this.aiSelectBottom(winnerId), 1500);
        }
    }

    // AI选择底牌
    aiSelectBottom(playerId) {
        const hand = this.gameState.hands[playerId];
        // 选择8张最小的非分牌
        const sorted = [...hand].sort((a, b) => {
            // 分牌排后面
            if (a.score > 0 && b.score === 0) return 1;
            if (a.score === 0 && b.score > 0) return -1;
            return a.value - b.value;
        });

        const bottomCards = sorted.slice(0, 8);
        this.processSelectBottom(playerId, bottomCards);
    }

    // 处理扣底
    processSelectBottom(playerId, cards) {
        if (cards.length !== 8) {
            this.sendToPlayer(playerId, { type: 'error', message: '必须选择8张牌' });
            return;
        }

        // 从手牌移除这8张
        const hand = this.gameState.hands[playerId];
        for (const card of cards) {
            const idx = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
            if (idx !== -1) {
                hand.splice(idx, 1);
            }
        }

        this.gameState.bottomCards = cards;
        this.sortHand(hand);

        // 确定庄家方和攻方
        const player = this.players.get(playerId);
        this.gameState.dealerTeam = player.team;
        this.gameState.currentAttackTeam = player.team === 1 ? 2 : 1;

        // 开始出牌
        this.startPlaying();
    }

    // 开始出牌阶段
    startPlaying() {
        this.gameState.phase = 'playing';
        this.gameState.currentPlayer = 0;
        this.gameState.leadPlayer = null;
        this.gameState.leadCards = null;
        this.gameState.leadSuit = null;
        this.gameState.leadType = null;
        this.gameState.currentRoundPlays = [];

        // 给每个玩家单独发送包含其手牌的游戏状态
        const playerIds = this.getSortedPlayerIds();
        for (const playerId of playerIds) {
            this.sendToPlayer(playerId, {
                type: 'playStart',
                gameState: this.getPlayerGameState(playerId)
            });
        }

        // 检查当前玩家是否是AI
        this.checkAIPlay();
    }

    checkAIPlay() {
        const playerIds = this.getSortedPlayerIds();
        const currentPlayerId = playerIds[this.gameState.currentPlayer];
        const player = this.players.get(currentPlayerId);

        if ((player && player.isAI) || (player && this.gameState.autoPlay[currentPlayerId])) {
            setTimeout(() => this.aiPlayCards(currentPlayerId), 1000 + Math.random() * 1500);
        }
    }

    // 识别牌型
    identifyCardType(cards) {
        if (!cards || cards.length === 0) return { valid: false };

        const levelRank = this.getCurrentLevelRank();
        const trumpSuit = this.gameState.trumpSuit;

        // 单张
        if (cards.length === 1) {
            return { valid: true, type: 'single', rank: cards[0].rank };
        }

        // 按点数分组
        const groups = {};
        for (const card of cards) {
            if (!card.isJoker) {
                const key = card.rank;
                if (!groups[key]) groups[key] = [];
                groups[key].push(card);
            }
        }

        const ranks = Object.keys(groups);

        // 对子（所有牌同点数，2-4张）
        if (ranks.length === 1 && groups[ranks[0]].length >= 2) {
            return {
                valid: true,
                type: 'pair',
                rank: ranks[0],
                count: groups[ranks[0]].length
            };
        }

        // 连对（至少2对连续）
        if (this.isConsecutivePairs(cards, groups, levelRank, trumpSuit)) {
            const sortedRanks = ranks.filter(r => r !== levelRank).sort((a, b) => RANK_VALUES[a] - RANK_VALUES[b]);
            return {
                valid: true,
                type: 'consecutivePairs',
                ranks: sortedRanks,
                pairCount: sortedRanks.length
            };
        }

        // 甩牌（暂不实现完整验证，允许任意组合）
        return { valid: true, type: 'ramble', cards };
    }

    // 判断是否是连对
    isConsecutivePairs(cards, groups, levelRank, trumpSuit) {
        const ranks = Object.keys(groups);

        // 至少2对
        if (ranks.length < 2) return false;

        // 每个点数必须至少有2张
        for (const rank of ranks) {
            if (groups[rank].length < 2) return false;
        }

        // 排除级牌和王
        const validRanks = ranks.filter(r => r !== levelRank && RANK_VALUES[r] !== undefined);
        if (validRanks.length < 2) return false;

        // 检查连续性
        const sortedRanks = validRanks.sort((a, b) => RANK_VALUES[a] - RANK_VALUES[b]);
        for (let i = 1; i < sortedRanks.length; i++) {
            if (RANK_VALUES[sortedRanks[i]] - RANK_VALUES[sortedRanks[i-1]] !== 1) {
                return false;
            }
        }

        return true;
    }

    // 验证出牌
    validatePlay(playerId, cards) {
        const hand = this.gameState.hands[playerId];

        // 检查是否有这些牌
        for (const card of cards) {
            const idx = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
            if (idx === -1) {
                return { valid: false, message: '没有这些牌' };
            }
        }

        // 识别牌型
        const cardType = this.identifyCardType(cards);
        if (!cardType.valid) {
            return { valid: false, message: '无效牌型' };
        }

        // 如果是首出，任何合法牌型都可以
        if (!this.gameState.leadCards) {
            return { valid: true, cardType };
        }

        // 跟牌验证
        return this.validateFollow(hand, cards, cardType);
    }

    // 跟牌验证
    validateFollow(hand, cards, cardType) {
        const leadCards = this.gameState.leadCards;
        const leadType = this.gameState.leadType;
        const leadSuit = this.gameState.leadSuit;
        const trumpSuit = this.gameState.trumpSuit;
        const levelRank = this.getCurrentLevelRank();

        // 获取首出花色的牌
        const sameSuitCards = hand.filter(c => !c.isJoker && c.suit === leadSuit && !this.isTrump(c, trumpSuit, levelRank));

        // 检查牌型是否匹配
        if (leadType.type === 'single') {
            // 单张：有同花色必须跟同花色
            if (sameSuitCards.length > 0) {
                const hasSameSuit = cards.some(c => c.suit === leadSuit);
                if (!hasSameSuit) {
                    return { valid: false, message: `有${leadSuit}必须跟` };
                }
            }
        } else if (leadType.type === 'pair') {
            // 对子：有同花色对子必须跟
            const pairs = this.findPairs(sameSuitCards);
            if (pairs.length > 0) {
                // 检查出的牌是否是该花色对子
                const isPairOfLeadSuit = cards.every(c => c.suit === leadSuit) && cardType.type === 'pair';
                if (!isPairOfLeadSuit) {
                    // 必须先出该花色的牌
                    const hasSomeSuit = cards.some(c => c.suit === leadSuit);
                    if (!hasSomeSuit) {
                        return { valid: false, message: `有${leadSuit}必须先出` };
                    }
                }
            } else if (sameSuitCards.length > 0) {
                // 没有对子但有该花色，必须先出该花色
                const hasSomeSuit = cards.some(c => c.suit === leadSuit);
                if (!hasSomeSuit) {
                    return { valid: false, message: `有${leadSuit}必须先出` };
                }
            }
        } else if (leadType.type === 'consecutivePairs') {
            // 连对：有同花色连对必须跟
            const consecutivePairs = this.findConsecutivePairs(sameSuitCards, levelRank);
            if (consecutivePairs.length >= leadType.pairCount) {
                // 必须出连对
                if (cardType.type !== 'consecutivePairs' || cardType.pairCount < leadType.pairCount) {
                    return { valid: false, message: '有连对必须跟连对' };
                }
            } else {
                // 没有足够连对，检查是否有对子
                const pairs = this.findPairs(sameSuitCards);
                if (pairs.length > 0) {
                    const hasSomeSuit = cards.some(c => c.suit === leadSuit);
                    if (!hasSomeSuit) {
                        return { valid: false, message: `有${leadSuit}必须先出` };
                    }
                }
            }
        }

        return { valid: true, cardType };
    }

    // 找对子
    findPairs(cards) {
        const groups = {};
        for (const card of cards) {
            const key = card.rank;
            if (!groups[key]) groups[key] = [];
            groups[key].push(card);
        }

        const pairs = [];
        for (const rank in groups) {
            if (groups[rank].length >= 2) {
                pairs.push({ rank, cards: groups[rank].slice(0, 2) });
            }
        }
        return pairs;
    }

    // 找连对
    findConsecutivePairs(cards, levelRank) {
        const pairs = this.findPairs(cards);
        const validPairs = pairs.filter(p => p.rank !== levelRank);
        const sortedPairs = validPairs.sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank]);

        // 找最长的连对
        const result = [];
        for (let i = 0; i < sortedPairs.length; i++) {
            if (result.length === 0) {
                result.push(sortedPairs[i]);
            } else {
                const lastRank = result[result.length - 1].rank;
                if (RANK_VALUES[sortedPairs[i].rank] - RANK_VALUES[lastRank] === 1) {
                    result.push(sortedPairs[i]);
                } else {
                    break;
                }
            }
        }
        return result;
    }

    // 比较牌大小
    compareCards(play1, play2) {
        const trumpSuit = this.gameState.trumpSuit;
        const levelRank = this.getCurrentLevelRank();

        // 获取每组的最大牌
        const getMaxCard = (cards) => {
            return cards.reduce((max, c) => {
                const maxVal = this.getTrumpValue(max, trumpSuit, levelRank);
                const cVal = this.getTrumpValue(c, trumpSuit, levelRank);
                return cVal > maxVal ? c : max;
            });
        };

        const max1 = getMaxCard(play1.cards);
        const max2 = getMaxCard(play2.cards);

        const val1 = this.getTrumpValue(max1, trumpSuit, levelRank);
        const val2 = this.getTrumpValue(max2, trumpSuit, levelRank);

        return val1 - val2;
    }

    // 处理出牌
    processPlay(playerId, cards) {
        const validation = this.validatePlay(playerId, cards);
        if (!validation.valid) {
            this.sendToPlayer(playerId, { type: 'playError', message: validation.message });
            return;
        }

        const hand = this.gameState.hands[playerId];

        // 从手牌移除
        for (const card of cards) {
            const idx = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
            if (idx !== -1) {
                hand.splice(idx, 1);
            }
        }

        const player = this.players.get(playerId);
        const cardType = validation.cardType;

        // 记录出牌
        const playRecord = { playerId, playerName: player.name, cards, cardType };
        this.gameState.currentRoundPlays.push(playRecord);

        // 如果是首出
        if (!this.gameState.leadCards) {
            this.gameState.leadPlayer = playerId;
            this.gameState.leadCards = cards;
            this.gameState.leadType = cardType;

            // 确定首出花色
            if (cardType.type === 'single') {
                this.gameState.leadSuit = cards[0].suit;
            } else if (cardType.type === 'pair') {
                this.gameState.leadSuit = cards[0].suit;
            } else if (cardType.type === 'consecutivePairs') {
                this.gameState.leadSuit = cards[0].suit;
            } else {
                this.gameState.leadSuit = cards[0].suit;
            }
        }

        // 广播出牌
        this.broadcast({
            type: 'playAnnounce',
            playerId,
            playerName: player.name,
            cards,
            cardType,
            remainingCount: hand.length
        });

        // 检查是否一轮结束
        if (this.gameState.currentRoundPlays.length === 4) {
            this.endRound();
        } else {
            // 下一个玩家
            this.gameState.currentPlayer = (this.gameState.currentPlayer + 1) % 4;
            this.broadcastCurrentPlayer();
            this.checkAIPlay();
        }
    }

    // 回合结束
    endRound() {
        const plays = this.gameState.currentRoundPlays;

        // 找出赢家
        let winnerIdx = 0;
        for (let i = 1; i < plays.length; i++) {
            if (this.compareCards(plays[i], plays[winnerIdx]) > 0) {
                winnerIdx = i;
            }
        }

        const winner = plays[winnerIdx];
        const winnerPlayer = this.players.get(winner.playerId);

        // 计算本轮得分
        let roundScore = 0;
        for (const play of plays) {
            for (const card of play.cards) {
                roundScore += card.score;
            }
        }

        // 得分归属
        const winnerTeam = winnerPlayer.team;
        this.gameState.scores[`team${winnerTeam}`] += roundScore;

        // 收集捕获的牌
        const capturedCards = plays.flatMap(p => p.cards);
        this.gameState.capturedCards[`team${winnerTeam}`].push(...capturedCards);

        // 广播回合结束
        this.broadcast({
            type: 'roundEnd',
            winner: winner.playerId,
            winnerName: winner.playerName,
            winnerTeam,
            roundScore,
            totalScores: this.gameState.scores,
            cards: capturedCards
        });

        // 检查游戏是否结束
        const playerIds = this.getSortedPlayerIds();
        const allHandsEmpty = playerIds.every(pid => this.gameState.hands[pid].length === 0);

        if (allHandsEmpty) {
            // 游戏结束
            setTimeout(() => this.endGame(), 1500);
        } else {
            // 下一轮，赢家首出
            setTimeout(() => {
                this.gameState.currentRoundPlays = [];
                this.gameState.leadCards = null;
                this.gameState.leadType = null;
                this.gameState.leadSuit = null;
                this.gameState.leadPlayer = winner.playerId;

                // 设置当前玩家为赢家
                const winnerIdx = playerIds.indexOf(winner.playerId);
                this.gameState.currentPlayer = winnerIdx;

                this.broadcastCurrentPlayer();
                this.checkAIPlay();
            }, 1500);
        }
    }

    // 游戏结束
    endGame() {
        this.gameState.phase = 'finished';

        const attackerScore = this.gameState.scores[`team${this.gameState.currentAttackTeam}`];
        const defenderScore = this.gameState.scores[`team${this.gameState.dealerTeam}`];

        // 判定胜负
        let winner, levelUp;
        if (attackerScore >= 80) {
            winner = this.gameState.currentAttackTeam;
            if (attackerScore >= 120) {
                levelUp = 3;
            } else if (attackerScore >= 110) {
                levelUp = 2;
            } else {
                levelUp = 1;
            }
        } else {
            winner = this.gameState.dealerTeam;
            if (attackerScore === 0) {
                levelUp = 3;
            } else if (attackerScore < 40) {
                levelUp = 2;
            } else {
                levelUp = 1;
            }
        }

        // 升级
        const currentLevel = this.gameState.teamLevels[winner];
        const levelIdx = LEVEL_ORDER.indexOf(LEVEL_TO_RANK[currentLevel]);
        const newLevelIdx = Math.min(levelIdx + levelUp, LEVEL_ORDER.length - 1);
        this.gameState.teamLevels[winner] = newLevelIdx + 2; // +2因为从2开始

        // 检查通关
        const gameWon = LEVEL_ORDER[newLevelIdx] === 'A';

        this.broadcast({
            type: 'gameEnd',
            winner,
            levelUp,
            newLevel: LEVEL_ORDER[newLevelIdx],
            scores: this.gameState.scores,
            teamLevels: this.gameState.teamLevels,
            gameWon
        });
    }

    // AI出牌
    aiPlayCards(playerId) {
        const hand = this.gameState.hands[playerId];
        if (hand.length === 0) return;

        let cardsToPlay;

        if (!this.gameState.leadCards) {
            // 首出：出最小的单张
            cardsToPlay = [hand[hand.length - 1]];
        } else {
            // 跟牌
            const leadType = this.gameState.leadType;
            const leadSuit = this.gameState.leadSuit;
            const trumpSuit = this.gameState.trumpSuit;
            const levelRank = this.getCurrentLevelRank();

            // 获取同花色牌
            const sameSuitCards = hand.filter(c => !c.isJoker && c.suit === leadSuit && !this.isTrump(c, trumpSuit, levelRank));

            if (leadType.type === 'single') {
                if (sameSuitCards.length > 0) {
                    // 出同花色最小的
                    cardsToPlay = [sameSuitCards[sameSuitCards.length - 1]];
                } else {
                    // 出任意最小的
                    cardsToPlay = [hand[hand.length - 1]];
                }
            } else if (leadType.type === 'pair') {
                const pairs = this.findPairs(sameSuitCards);
                if (pairs.length > 0) {
                    // 出同花色对子
                    cardsToPlay = pairs[pairs.length - 1].cards;
                } else if (sameSuitCards.length >= 2) {
                    // 出同花色牌
                    cardsToPlay = sameSuitCards.slice(-2);
                } else {
                    // 出任意牌
                    cardsToPlay = hand.slice(-2);
                }
            } else {
                // 连对或其他，简化处理
                if (sameSuitCards.length > 0) {
                    cardsToPlay = [sameSuitCards[sameSuitCards.length - 1]];
                } else {
                    cardsToPlay = [hand[hand.length - 1]];
                }
            }
        }

        this.processPlay(playerId, cardsToPlay);
    }

    broadcastCurrentPlayer() {
        const playerIds = this.getSortedPlayerIds();
        const currentPlayerId = playerIds[this.gameState.currentPlayer];
        const player = this.players.get(currentPlayerId);

        this.broadcast({
            type: 'currentPlayer',
            currentPlayer: this.gameState.currentPlayer,
            currentPlayerId,
            currentPlayerName: player?.name || '',
            gameState: this.getPublicGameState()
        });
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
            phase: this.gameState.phase,
            currentPlayer: this.gameState.currentPlayer,
            trumpSuit: this.gameState.trumpSuit,
            trumpCaller: this.gameState.trumpCaller,
            trumpRank: this.getCurrentLevelRank(),
            hands: publicHands,
            playerInfo: playerInfo,
            scores: this.gameState.scores,
            teamLevels: this.gameState.teamLevels,
            currentAttackTeam: this.gameState.currentAttackTeam,
            dealerTeam: this.gameState.dealerTeam,
            leadCards: this.gameState.leadCards,
            currentRoundPlays: this.gameState.currentRoundPlays,
            currentBid: this.gameState.currentBid,
            currentBidder: this.gameState.currentBidder
        };
    }

    getPlayerGameState(playerId) {
        return {
            ...this.getPublicGameState(),
            myHand: this.gameState.hands[playerId] || [],
            myInfo: { id: playerId, ...this.players.get(playerId) },
            bottomCards: this.gameState.phase === 'bottomSelect' && this.gameState.trumpCaller === playerId
                ? this.gameState.bottomCards : []
        };
    }

    broadcast(msg) {
        const data = JSON.stringify(msg);
        this.players.forEach((player) => {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(data);
            }
        });
    }

    sendToPlayer(playerId, msg) {
        const player = this.players.get(playerId);
        if (player && player.ws && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(msg));
        }
    }

    broadcastPlayerList() {
        const playerList = Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            playerNum: p.playerNum,
            team: p.team,
            ready: p.ready,
            isAI: p.isAI
        }));

        this.broadcast({ type: 'playerList', players: playerList });
    }
}

// ==================== WebSocket处理 ====================
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
        console.log('客户端断开');
        // 处理玩家离开
        const playerId = findPlayerByWs(ws);
        if (playerId) {
            const roomId = playerToRoom.get(playerId);
            if (roomId) {
                const room = rooms.get(roomId);
                if (room) {
                    room.removePlayer(playerId);
                    playerToRoom.delete(playerId);
                    if (room.players.size === 0) {
                        rooms.delete(roomId);
                    } else {
                        room.broadcastPlayerList();
                    }
                }
            }
        }
    });
});

function findPlayerByWs(ws) {
    for (const [roomId, room] of rooms) {
        for (const [playerId, player] of room.players) {
            if (player.ws === ws) {
                return playerId;
            }
        }
    }
    return null;
}

function handleMessage(ws, data) {
    const { type } = data;

    switch (type) {
        case 'getRoomList':
            sendRoomList(ws);
            break;

        case 'createRoom':
            handleCreateRoom(ws, data);
            break;

        case 'joinRoom':
            handleJoinRoom(ws, data);
            break;

        case 'ready':
            handleReady(ws, data);
            break;

        case 'addAI':
            handleAddAI(ws, data);
            break;

        case 'bid':
            handleBid(ws, data);
            break;

        case 'passBid':
            handlePassBid(ws, data);
            break;

        case 'selectBottom':
            handleSelectBottom(ws, data);
            break;

        case 'play':
            handlePlay(ws, data);
            break;

        case 'chat':
            handleChat(ws, data);
            break;
    }
}

function sendRoomList(ws) {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        tableNumber: room.tableNumber,
        playerCount: room.players.size,
        started: room.gameState.started
    }));
    ws.send(JSON.stringify({ type: 'roomList', rooms: roomList }));
}

function handleCreateRoom(ws, data) {
    const { playerName, tableNumber } = data;
    const roomId = `room_${++roomCounter}`;
    const room = new GameRoom(roomId, tableNumber || roomCounter);
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    room.addPlayer(ws, playerId, playerName);
    rooms.set(roomId, room);
    playerToRoom.set(playerId, roomId);

    ws.playerId = playerId;
    ws.roomId = roomId;

    ws.send(JSON.stringify({
        type: 'roomCreated',
        roomId,
        playerId,
        tableNumber: room.tableNumber
    }));

    room.broadcastPlayerList();
    console.log(`房间创建: ${roomId}, 玩家: ${playerName}`);
}

function handleJoinRoom(ws, data) {
    const { roomId, playerName, seatNum } = data;
    const room = rooms.get(roomId);

    if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
        return;
    }

    if (room.players.size >= 4) {
        ws.send(JSON.stringify({ type: 'error', message: '房间已满' }));
        return;
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!room.addPlayer(ws, playerId, playerName, seatNum)) {
        ws.send(JSON.stringify({ type: 'error', message: '座位已被占用' }));
        return;
    }

    playerToRoom.set(playerId, roomId);
    ws.playerId = playerId;
    ws.roomId = roomId;

    ws.send(JSON.stringify({
        type: 'roomJoined',
        roomId,
        playerId,
        players: Array.from(room.players.values())
    }));

    room.broadcastPlayerList();
    console.log(`玩家加入: ${playerName} -> ${roomId}`);
}

function handleReady(ws, data) {
    const room = rooms.get(ws.roomId);
    if (room) {
        room.setPlayerReady(ws.playerId, data.ready);
    }
}

function handleAddAI(ws, data) {
    const room = rooms.get(ws.roomId);
    if (room && room.players.size < 4) {
        const aiId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        // 统计当前AI数量，生成唯一名称
        const aiCount = Array.from(room.players.values()).filter(p => p.isAI).length + 1;
        const aiName = `AI_${aiCount}`;
        const seatNum = data.seatNum || null;

        if (room.addAIPlayer(aiId, aiName, seatNum)) {
            room.broadcastPlayerList();
            room.checkStartGame();
        }
    }
}

function handleBid(ws, data) {
    const room = rooms.get(ws.roomId);
    if (room && room.gameState.phase === 'bidding') {
        const playerIds = room.getSortedPlayerIds();
        const currentPlayerId = playerIds[room.gameState.currentBidder];

        if (ws.playerId === currentPlayerId) {
            room.processBid(ws.playerId, data.suit, data.count);
        }
    }
}

function handlePassBid(ws, data) {
    const room = rooms.get(ws.roomId);
    if (room && room.gameState.phase === 'bidding') {
        const playerIds = room.getSortedPlayerIds();
        const currentPlayerId = playerIds[room.gameState.currentBidder];

        if (ws.playerId === currentPlayerId) {
            room.processPassBid(ws.playerId);
        }
    }
}

function handleSelectBottom(ws, data) {
    const room = rooms.get(ws.roomId);
    if (room && room.gameState.phase === 'bottomSelect') {
        if (ws.playerId === room.gameState.trumpCaller) {
            room.processSelectBottom(ws.playerId, data.cards);
        }
    }
}

function handlePlay(ws, data) {
    const room = rooms.get(ws.roomId);
    if (room && room.gameState.phase === 'playing') {
        const playerIds = room.getSortedPlayerIds();
        const currentPlayerId = playerIds[room.gameState.currentPlayer];

        if (ws.playerId === currentPlayerId) {
            room.processPlay(ws.playerId, data.cards);
        }
    }
}

function handleChat(ws, data) {
    const room = rooms.get(ws.roomId);
    if (room) {
        const player = room.players.get(ws.playerId);
        room.broadcast({
            type: 'chat',
            playerId: ws.playerId,
            playerName: player?.name || '',
            message: data.message
        });
    }
}

// ==================== 启动服务器 ====================
server.listen(PORT, () => {
    console.log(`八十分服务器运行在 http://localhost:${PORT}`);
    console.log(`WebSocket端口: ${PORT}`);
});
