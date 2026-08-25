// 桐城自摸麻将 - 局域网服务器
// 运行方式: node majiang-server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 8081;

// ==================== HTTP服务器 ====================
const server = http.createServer((req, res) => {
    console.log(`HTTP请求: ${req.url}`);

    // 解码URL（处理中文文件名）
    const decodedUrl = decodeURIComponent(req.url);

    if (req.url === '/' || req.url === '/index.html') {
        const htmlPath = path.join(__dirname, 'majiang-lan.html');
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
    } else if (decodedUrl.endsWith('.jpg') || decodedUrl.endsWith('.jpeg') || decodedUrl.endsWith('.png') || decodedUrl.endsWith('.gif')) {
        // 处理图片文件（过滤路径遍历攻击）
        const safePath = decodedUrl.replace(/\.\./g, '').replace(/\\/g, '/');
        const imagePath = path.join(__dirname, safePath);
        // 确保解析后的路径仍在项目目录内
        if (!imagePath.startsWith(__dirname)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        fs.readFile(imagePath, (err, data) => {
            if (err) {
                console.log(`图片未找到: ${imagePath}`);
                res.writeHead(404);
                res.end('图片未找到');
                return;
            }
            const ext = path.extname(decodedUrl).toLowerCase();
            const contentTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif'
            };
            res.writeHead(200, {
                'Content-Type': contentTypes[ext] || 'application/octet-stream'
            });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// ==================== WebSocket服务器 ====================
const wss = new WebSocket.Server({ server });

// 游戏房间管理
const tables = new Map();
const playerToTable = new Map();
let tableCounter = 0;

// 所有已登录的客户端（用于广播牌桌列表）
const loggedInClients = new Set();

// ==================== 牌面常量 ====================
const SUITS = ['筒', '条', '万'];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const WINDS = ['东', '南', '西', '北'];
const ARROWS = ['中', '发', '白'];

// 创建一副麻将牌
function createDeck() {
    const deck = [];

    // 筒条万 (每种4张)
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            for (let i = 0; i < 4; i++) {
                deck.push({
                    suit,
                    rank,
                    type: 'number',
                    id: `${suit}${rank}_${i}`
                });
            }
        }
    }

    // 风牌 (每种4张)
    for (const wind of WINDS) {
        for (let i = 0; i < 4; i++) {
            deck.push({
                suit: '风',
                rank: wind,
                type: 'wind',
                id: `风${wind}_${i}`
            });
        }
    }

    // 箭牌 (每种4张)
    for (const arrow of ARROWS) {
        for (let i = 0; i < 4; i++) {
            deck.push({
                suit: '箭',
                rank: arrow,
                type: 'arrow',
                id: `箭${arrow}_${i}`
            });
        }
    }

    return deck; // 136张
}

// 洗牌
function shuffle(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 牌的显示名称
function cardName(card) {
    if (card.type === 'number') {
        return `${card.rank}${card.suit}`;
    } else {
        return card.rank;
    }
}

// ==================== 牌桌类 ====================
class GameTable {
    constructor(id, tableNumber) {
        this.id = id;
        this.tableNumber = tableNumber;
        this.players = new Map(); // playerId -> player info
        this.spectators = new Map();
        this.maxPlayers = 4;
        this.gameTimer = null; // 游戏计时器

        // 周期（头）相关属性
        this.cycleStartTime = null; // 周期开始时间
        this.cycleDuration = 60 * 60 * 1000; // 1小时（毫秒）

        // 游戏流程相关属性
        this.currentRound = 0; // 当前局数
        this.lastWinner = null; // 上一局赢家 playerId
        this.roundReadyPlayers = new Set(); // 每局结束后已准备的玩家
        this.totalScores = {}; // 累积得分 playerId -> totalScore

        // 骰子状态
        this.diceState = {
            firstRoll: null, // 第一次骰子结果 { playerId, values: [d1, d2] }
            secondRoll: null, // 第二次骰子结果 { playerId, values: [d1, d2] }
            currentRoller: null, // 当前应该掷骰子的人
            rollPhase: 0 // 0=未开始, 1=等待第一次, 2=等待第二次, 3=完成
        };

        this.gameState = {
            started: false,
            currentPlayer: 0, // 0-3, 当前出牌玩家索引
            dealer: 0, // 庄家索引
            dealerSeat: 1, // 庄家座位号（1-4）
            deck: [], // 牌堆
            hands: {}, // playerId -> cards[]
            wildCard: null, // 万能牌
            discardedPile: [], // 打出的牌（全局，用于记录）
            discardedCards: {}, // 各玩家打出的牌 { playerId: [cards] }
            showedCards: {}, // playerId -> { fa: [], gang: [] }
            faUsed: {}, // playerId -> 玩家是否已换过发
            lastDrawn: null, // 最后摸的牌
            gameStartTime: null, // 游戏开始时间
            totalGameTime: 0, // 游戏总时长（秒）
            roundPhase: 'waiting' // waiting=等待准备, dice=掷骰子阶段, playing=游戏中, ended=本局结束
        };
    }

    // 获取按座位排序的玩家ID数组
    getSortedPlayerIds() {
        return Array.from(this.players.entries())
            .sort((a, b) => a[1].seatNum - b[1].seatNum)
            .map(([id]) => id);
    }

    // 添加玩家
    addPlayer(ws, playerId, playerName, seatNum = null) {
        if (this.players.size >= this.maxPlayers) return false;
        if (this.gameState.started) return false;

        let actualSeat;
        if (seatNum !== null && seatNum >= 1 && seatNum <= 4) {
            const occupied = Array.from(this.players.values()).some(p => p.seatNum === seatNum);
            if (occupied) return false;
            actualSeat = seatNum;
        } else {
            const occupiedSeats = new Set(Array.from(this.players.values()).map(p => p.seatNum));
            for (let i = 1; i <= 4; i++) {
                if (!occupiedSeats.has(i)) {
                    actualSeat = i;
                    break;
                }
            }
        }

        this.players.set(playerId, {
            ws,
            id: playerId,
            name: playerName,
            seatNum: actualSeat,
            ready: false,
            isAI: false
        });

        return true;
    }

    // 移除玩家
    removePlayer(playerId) {
        this.players.delete(playerId);
        return this.players.size === 0;
    }

    // 检查是否所有玩家都已断开连接
    isAllPlayersDisconnected() {
        if (this.players.size === 0) return true;
        // 只检查真人玩家，AI玩家始终视为在线
        const humans = Array.from(this.players.values()).filter(p => !p.isAI);
        if (humans.length === 0) return false; // 全AI桌不会断线
        for (const player of humans) {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                return false;
            }
        }
        return true;
    }

    // 设置准备状态
    setPlayerReady(playerId, ready) {
        const player = this.players.get(playerId);
        if (player) {
            player.ready = ready;

            // 局间准备：同步更新 roundReadyPlayers
            if (this.gameState.roundPhase === 'ended' && ready) {
                this.roundReadyPlayers.add(playerId);
            } else if (this.gameState.roundPhase === 'ended' && !ready) {
                this.roundReadyPlayers.delete(playerId);
            }

            this.broadcastPlayerList();
            this.checkStartGame();
        }
    }

    // 检查是否可以开始游戏
    checkStartGame() {
        const humans = Array.from(this.players.values()).filter(p => !p.isAI);
        const allHumansReady = humans.length > 0 && humans.every(p => p.ready);
        const humanCount = humans.length;

        // 所有真人准备后，自动补充AI到4人
        if (allHumansReady && this.players.size < 4) {
            const aiNeeded = 4 - this.players.size;
            for (let i = 0; i < aiNeeded; i++) {
                this.addAIPlayer();
            }
            console.log(`牌桌${this.tableNumber} 真人全部准备，自动补充${aiNeeded}个AI`);
            this.broadcastPlayerList();
        }

        const allReady = Array.from(this.players.values()).every(p => p.ready);

        console.log(`checkStartGame: allReady=${allReady}, players=${this.players.size}, humans=${humanCount}, roundPhase=${this.gameState.roundPhase}`);

        if (this.gameState.roundPhase === 'waiting' || !this.gameState.started) {
            // 新游戏或新一周期的开始
            // 需要4个玩家（至少1个真人），且所有人都准备好
            if (allReady && this.players.size >= 4 && humanCount >= 1) {
                // 检查是否是新周期（跨小时时才换座，第一局不换）
                if (this.cycleStartTime && (Date.now() - this.cycleStartTime >= this.cycleDuration)) {
                    this.cycleStartTime = Date.now();
                    this.currentRound = 0;
                    this.randomizeSeats(); // 跨小时时随机换座
                    console.log(`牌桌${this.tableNumber} 开始新周期，座位已随机更换`);
                } else if (!this.cycleStartTime) {
                    // 第一个周期开始，不换座
                    this.cycleStartTime = Date.now();
                    this.currentRound = 0;
                    console.log(`牌桌${this.tableNumber} 第一个周期开始，保持原座位`);
                }
                console.log(`牌桌${this.tableNumber} 所有人已准备，开始掷骰子阶段`);
                this.startDicePhase();
                // 游戏开始后广播牌桌列表，让大厅看到状态更新并自动创建新空桌
                broadcastTableList();
            }
        } else if (this.gameState.roundPhase === 'ended') {
            // 局间准备，检查所有人是否都准备了
            const allRoundReady = this.roundReadyPlayers.size === this.players.size;
            if (allRoundReady) {
                this.startDicePhase();
            }
        }
    }

    // 开始掷骰子阶段
    startDicePhase() {
        // 先初始化牌堆和庄家
        this.initDeckAndDealer();

        this.gameState.roundPhase = 'dice';
        this.diceState = {
            firstRoll: null,
            secondRoll: null,
            currentRoller: null,
            rollPhase: 1
        };

        // 确定第一次掷骰子的人
        const firstRollerId = this.getFirstRoller();
        const firstRoller = this.players.get(firstRollerId);
        this.diceState.currentRoller = firstRollerId;

        this.broadcastMessage(`🎲 第${this.currentRound + 1}局开始！请 ${firstRoller.name} 掷骰子`);

        // 通知所有人骰子状态
        this.broadcastDiceState();

        // 检查是否轮到AI掷骰子
        setTimeout(() => this.checkAITurn(), 500);
    }

    // 获取第一次掷骰子的人
    getFirstRoller() {
        const playerIds = this.getSortedPlayerIds();
        // 座位映射：1=东(庄家), 2=南, 3=西, 4=北

        if (this.currentRound === 0) {
            // 周期第一局：东边玩家（座位1）掷骰子
            const dongPlayer = Array.from(this.players.values()).find(p => p.seatNum === 1);
            if (dongPlayer) {
                this.gameState.dealerSeat = 1;
                this.gameState.dealer = playerIds.indexOf(dongPlayer.id);
                console.log(`周期第一局：东边玩家 ${dongPlayer.name} 掷骰子`);
                return dongPlayer.id;
            }
        }

        // 后续局：庄家掷骰子
        if (this.lastWinner) {
            // 上局赢家成为庄家
            const winner = this.players.get(this.lastWinner);
            if (winner) {
                this.gameState.dealerSeat = winner.seatNum;
                this.gameState.dealer = playerIds.indexOf(this.lastWinner);
                console.log(`后续局：庄家 ${winner.name} 掷骰子`);
                return this.lastWinner;
            }
        }

        // 如果上局没人胡牌（流局），庄家继续
        if (this.gameState.dealerSeat) {
            const dealerPlayer = Array.from(this.players.values()).find(p => p.seatNum === this.gameState.dealerSeat);
            if (dealerPlayer) {
                console.log(`流局后：庄家 ${dealerPlayer.name} 继续掷骰子`);
                return dealerPlayer.id;
            }
        }

        // 默认返回东边玩家（座位1）
        const dongPlayer = Array.from(this.players.values()).find(p => p.seatNum === 1);
        return dongPlayer ? dongPlayer.id : playerIds[0];
    }

    // 获取第二次掷骰子的人（根据第一次骰子点数和，逆时针数）
    getSecondRoller(firstSum) {
        const playerIds = this.getSortedPlayerIds();
        const firstRollerIndex = playerIds.indexOf(this.diceState.firstRoll.playerId);

        // playerIds 是 [座位1, 座位2, 座位3, 座位4]（逆时针：东→南→西→北）
        // 逆时针顺序：东(0)→南(1)→西(2)→北(3)→东(0)
        // 数firstSum步，从1开始数（所以-1）
        const secondRollerIndex = (firstRollerIndex + firstSum - 1) % 4;
        return playerIds[secondRollerIndex];
    }

    // 掷骰子（服务器生成随机值，忽略客户端传来的值）
    rollDice(playerId) {
        console.log(`rollDice 被调用: playerId=${playerId}, currentRoller=${this.diceState.currentRoller}, rollPhase=${this.diceState.rollPhase}`);

        if (this.diceState.currentRoller !== playerId) {
            console.log(`不是你的回合掷骰子: currentRoller=${this.diceState.currentRoller}, playerId=${playerId}`);
            return { success: false, message: '不是你的回合掷骰子' };
        }

        const player = this.players.get(playerId);
        if (!player) {
            console.log(`找不到玩家: ${playerId}`);
            return { success: false, message: '玩家不存在' };
        }

        // 服务器端生成随机骰子值（防作弊）
        const values = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];

        if (this.diceState.rollPhase === 1) {
            // 第一次掷骰子
            console.log(`第一次掷骰子: ${player.name}`);
            this.diceState.firstRoll = { playerId, playerName: player.name, values };
            this.diceState.rollPhase = 2;

            // 根据第一次骰子点数和，确定第二次掷骰子的人
            const firstSum = values[0] + values[1];
            console.log(`计算第二次掷骰者: firstSum=${firstSum}`);
            const secondRollerId = this.getSecondRoller(firstSum);
            console.log(`第二次掷骰者ID: ${secondRollerId}`);

            if (!secondRollerId) {
                console.error(`无法确定第二次掷骰者!`);
                return { success: false, message: '无法确定第二次掷骰者' };
            }

            this.diceState.currentRoller = secondRollerId;
            const secondRoller = this.players.get(secondRollerId);

            if (!secondRoller) {
                console.error(`找不到第二次掷骰者: ${secondRollerId}`);
                return { success: false, message: '找不到第二次掷骰者' };
            }

            this.broadcastMessage(`🎲 ${player.name} 掷出 ${values[0]}+${values[1]}=${firstSum} 点`);
            this.broadcastMessage(`🎲 从${player.name}逆时针数${firstSum}步，请 ${secondRoller.name} 掷第二次骰子`);

            this.broadcastDiceState();

            // 检查是否轮到AI掷第二次骰子
            setTimeout(() => this.checkAITurn(), 500);

            return { success: true, phase: 1, values };

        } else if (this.diceState.rollPhase === 2) {
            // 第二次掷骰子
            this.diceState.secondRoll = { playerId, playerName: player.name, values };
            this.diceState.rollPhase = 3;

            this.broadcastMessage(`🎲 ${player.name} 掷出 ${values[0]}+${values[1]}=${values[0]+values[1]} 点`);

            // 确定抓牌位置和癞子
            this.determineWildCard();

            // 开始发牌
            setTimeout(() => {
                this.startDealCards();
            }, 1000);

            this.broadcastDiceState();

            return { success: true, phase: 2, values };
        }

        return { success: false, message: '骰子阶段错误' };
    }

    // 根据亮牌确定癞子（下一张牌）
    getWildCardFromShown(shownCard) {
        // 普通牌（筒条万）：1-9循环
        if (shownCard.type === 'number') {
            const nextRank = shownCard.rank >= 9 ? 1 : shownCard.rank + 1;
            return {
                suit: shownCard.suit,
                rank: nextRank,
                type: 'number'
            };
        }
        // 风牌：东南西北循环
        if (shownCard.type === 'wind') {
            const windOrder = ['东', '南', '西', '北'];
            const currentIndex = windOrder.indexOf(shownCard.rank);
            const nextIndex = (currentIndex + 1) % 4;
            return {
                suit: '风',
                rank: windOrder[nextIndex],
                type: 'wind'
            };
        }
        // 箭牌：中发白循环
        if (shownCard.type === 'arrow') {
            const arrowOrder = ['中', '发', '白'];
            const currentIndex = arrowOrder.indexOf(shownCard.rank);
            const nextIndex = (currentIndex + 1) % 3;
            return {
                suit: '箭',
                rank: arrowOrder[nextIndex],
                type: 'arrow'
            };
        }
        return null;
    }

    // 确定万能牌（癞子）和抓牌位置 - 根据骰子结果
    determineWildCard() {
        const firstSum = this.diceState.firstRoll.values[0] + this.diceState.firstRoll.values[1];
        const secondSum = this.diceState.secondRoll.values[0] + this.diceState.secondRoll.values[1];
        const total = firstSum + secondSum;

        console.log(`第1次骰子: ${firstSum}, 第2次骰子: ${secondSum}, 总计: ${total}`);

        // 座位映射：1=东, 2=南, 3=西, 4=北
        const seatToDirection = { 1: '东', 2: '南', 3: '西', 4: '北' };
        // 逆时针沿牌桌方向：东(1) → 南(2) → 西(3) → 北(4) → 东
        const directionOrder = [1, 2, 3, 4];

        // 第1次掷骰者的座位
        const firstRollerSeat = this.players.get(this.diceState.firstRoll.playerId)?.seatNum || 1;

        // 第1次骰子点数决定第2次掷骰者：从庄家开始，按东南西北循环数 firstSum 个玩家
        const firstRollerIdx = directionOrder.indexOf(firstRollerSeat);
        const secondRollerIdx = (firstRollerIdx + firstSum - 1) % 4;
        const secondRollerSeat = directionOrder[secondRollerIdx];

        console.log(`第1次掷骰者: ${seatToDirection[firstRollerSeat]}(座位${firstRollerSeat}), 东南西北数${firstSum}个后是: ${seatToDirection[secondRollerSeat]}(座位${secondRollerSeat})`);

        // ========== 正确规则 ==========
        // 1. 抓牌起点：从第2次掷骰者开始，逆时针数 total 墩
        // 2. 亮牌位置：在抓牌起始点的上一家牌墙上，从序号1开始数 firstSum

        // 从第2次掷骰者开始，逆时针数 total 墩，找到"数到的位置"
        // 抓牌从"数到位置的下一墩"开始
        let remainingPiles = total;
        let currentDirIdx = directionOrder.indexOf(secondRollerSeat);
        let stopPile = 0; // 数到的墩号

        while (remainingPiles > 0) {
            if (remainingPiles > 17) {
                remainingPiles -= 17;
                currentDirIdx = (currentDirIdx + 1) % 4;
            } else {
                stopPile = remainingPiles;
                remainingPiles = 0;
            }
        }

        const stopDirection = directionOrder[currentDirIdx];
        console.log(`数${total}墩后，停在: ${seatToDirection[stopDirection]}方第${stopPile}墩`);

        // 抓牌从数到位置的下一墩开始
        // 如果停在X墩（X<17），抓牌从同一方位的(X+1)墩开始
        // 如果停在17墩，抓牌从下一个方位的第1墩开始
        let drawDirection, drawPile;
        if (stopPile === 17) {
            // 停在最后一墩，下一墩是下一个方位的第1墩
            const nextDirIdx = (currentDirIdx + 1) % 4;
            drawDirection = directionOrder[nextDirIdx];
            drawPile = 1;
        } else {
            drawDirection = stopDirection;
            drawPile = stopPile + 1;
        }

        console.log(`抓牌起始: ${seatToDirection[drawDirection]}方第${drawPile}墩`);

        // 亮牌在抓牌方位的上一个方位（按逆时针顺序倒退：东←北←西←南←东）
        // directionOrder = [东, 南, 西, 北] = [座位1, 座位2, 座位3, 座位4]
        // 东(0)→北(3), 南(1)→东(0), 西(2)→南(1), 北(3)→西(2)
        // 所以用 -1 (即 +3 mod 4)
        const drawDirIdx = directionOrder.indexOf(drawDirection);
        const shownDirIdx = (drawDirIdx + 3) % 4;
        const shownDirection = directionOrder[shownDirIdx];
        const shownPile = 18 - firstSum; // 从序号17往1数firstSum下，即 17-firstSum+1

        console.log(`亮牌位置: ${seatToDirection[shownDirection]}方第${shownPile}墩（从17往1数${firstSum}下）`);

        // 计算牌堆中的实际索引
        // 牌墙按 [东17墩][南17墩][西17墩][北17墩] 排列（逆时针沿牌桌）
        const directionToOffset = { 1: 0, 2: 17, 3: 34, 4: 51 };
        // 序号转索引：序号1对应索引0，序号17对应索引16
        let shownPileIndex = directionToOffset[shownDirection] + (shownPile - 1);

        // 每墩2张牌，取上面那张（索引*2）
        const shownCardIndex = shownPileIndex * 2;

        // 获取亮牌（不移除，只记录位置）
        let shownCard = null;
        if (shownCardIndex >= 0 && shownCardIndex < this.gameState.deck.length) {
            shownCard = this.gameState.deck[shownCardIndex];
            console.log(`亮牌索引: ${shownCardIndex}, 亮牌: ${cardName(shownCard)}`);

            // 记录亮牌信息（暂不从牌堆移除，等发牌时跳过）
            this.gameState.shownCard = shownCard;
            this.gameState.shownCardIndex = shownCardIndex; // 记录原始索引
            this.gameState.shownCardSkipped = false; // 是否已被跳过
            console.log(`亮牌已记录，牌堆保持${this.gameState.deck.length}张`);

            // 根据亮牌确定癞子
            const wildCardInfo = this.getWildCardFromShown(shownCard);
            if (wildCardInfo) {
                this.gameState.wildCard = wildCardInfo;
                console.log(`癞子: ${cardName(this.gameState.wildCard)} (根据亮牌${cardName(shownCard)}确定)`);
            }
        } else {
            // 备用：随机选择
            const wildIndex = total % this.gameState.deck.length;
            this.gameState.wildCard = this.gameState.deck[wildIndex];
            console.log(`亮牌索引超出范围，使用备用计算: ${cardName(this.gameState.wildCard)}`);
        }

        // 保存抓牌信息用于发牌
        this.gameState.drawInfo = {
            startDirection: secondRollerSeat, // 从第2次掷骰者开始
            drawDirection,
            drawPile,
            totalPiles: total,
            shownCard,
            shownDirection,
            shownPile,
            shownCardIndex // 保存亮牌原始索引
        };
    }

    // 广播骰子状态
    broadcastDiceState() {
        const message = JSON.stringify({
            type: 'diceState',
            data: {
                firstRoll: this.diceState.firstRoll,
                secondRoll: this.diceState.secondRoll,
                currentRoller: this.diceState.currentRoller,
                rollPhase: this.diceState.rollPhase,
                roundPhase: this.gameState.roundPhase,
                shownCard: this.gameState.shownCard || null,
                wildCard: this.gameState.wildCard || null,
                drawInfo: this.gameState.drawInfo || null
            }
        });

        console.log(`广播骰子状态: rollPhase=${this.diceState.rollPhase}, currentRoller=${this.diceState.currentRoller}`);

        for (const player of this.players.values()) {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(message);
            }
        }
    }

    // 开始发牌（带动画）
    async startDealCards() {
        this.currentRound++;
        this.gameState.roundPhase = 'dealing'; // 发牌阶段
        this.roundReadyPlayers.clear();

        // 重置玩家准备状态（局间准备用）
        for (const player of this.players.values()) {
            player.ready = false;
        }

        // 通知客户端清空上一局界面
        this.broadcastDealStart();

        // 重置每局游戏状态
        this.gameState.discardedPile = [];
        this.gameState.discardedCards = {}; // 各玩家打出的牌
        this.gameState.showedCards = {};
        this.gameState.faUsed = {};
        this.gameState.lastDrawn = null;
        this.gameState.pendingGangDraw = false; // 杠后补牌标志
        this.gameState.reverseDrawnCount = 0; // 反向取牌计数

        // 初始化手牌
        const playerIds = this.getSortedPlayerIds();
        for (const pid of playerIds) {
            this.gameState.hands[pid] = [];
            this.gameState.showedCards[pid] = { fa: [], gang: [] };
            this.gameState.faUsed[pid] = false;
            this.gameState.discardedCards[pid] = []; // 初始化弃牌
        }

        // 根据 drawInfo 计算抓牌起始位置
        const drawInfo = this.gameState.drawInfo;
        let shownCardNewIndex = -1;

        if (drawInfo && drawInfo.drawDirection) {
            const seatToDirection = { 1: '东', 2: '南', 3: '西', 4: '北' };
            const directionToOffset = { 1: 0, 2: 17, 3: 34, 4: 51 };
            const pileOffset = drawInfo.drawPile - 1;
            let startIndex = (directionToOffset[drawInfo.drawDirection] + pileOffset) * 2;
            startIndex = Math.max(0, Math.min(startIndex, this.gameState.deck.length - 1));

            const originalShownIndex = this.gameState.shownCardIndex;
            if (originalShownIndex !== undefined && originalShownIndex >= 0) {
                if (originalShownIndex < startIndex) {
                    shownCardNewIndex = this.gameState.deck.length - startIndex + originalShownIndex;
                } else {
                    shownCardNewIndex = originalShownIndex - startIndex;
                }
                console.log(`亮牌原始索引: ${originalShownIndex}, 重排后索引: ${shownCardNewIndex}`);
            }

            if (startIndex > 0) {
                const before = this.gameState.deck.slice(0, startIndex);
                const after = this.gameState.deck.slice(startIndex);
                this.gameState.deck = [...after, ...before];
                console.log(`牌堆重排，剩余${this.gameState.deck.length}张`);
            }

            // 预计算 shift 取牌顺序对应的牌墙位置
            // 重排后 deck = [...after, ...before]，shift 顺序（正向取牌）：
            // 1) after 正序：原始索引 startIndex, startIndex+1, ..., totalCards-1
            // 2) before 正序：原始索引 0, 1, ..., startIndex-1
            const totalCards = this.gameState.deck.length; // 136
            const shiftOrder = [];
            // after 正序
            for (let i = startIndex; i < totalCards; i++) {
                const dir = Math.floor(i / 34) + 1;       // 方位 1-4
                const pile = Math.floor((i % 34) / 2) + 1; // 墩号 1-17
                shiftOrder.push({ dir, pile });
            }
            // before 正序
            for (let i = 0; i < startIndex; i++) {
                const dir = Math.floor(i / 34) + 1;
                const pile = Math.floor((i % 34) / 2) + 1;
                shiftOrder.push({ dir, pile });
            }
            this.gameState.wallDrawOrder = shiftOrder;
            console.log(`牌墙取牌顺序(正向): ${shiftOrder.length}条, startFrom=${startIndex}`);
        } else {
            // 未重排时，shift 顺序就是原始正序：索引 0, 1, 2, ..., 135
            const shiftOrder = [];
            for (let i = 0; i < this.gameState.deck.length; i++) {
                const dir = Math.floor(i / 34) + 1;
                const pile = Math.floor((i % 34) / 2) + 1;
                shiftOrder.push({ dir, pile });
            }
            this.gameState.wallDrawOrder = shiftOrder;
        }

        this.gameState.shownCardIndex = shownCardNewIndex;
        this.gameState.wallState = { 1: { start: 1, count: 17 }, 2: { start: 1, count: 17 }, 3: { start: 1, count: 17 }, 4: { start: 1, count: 17 } };

        // 逆时针发牌顺序：东(座位1)→南(座位2)→西(座位3)→北(座位4)
        // playerIds已按座位号排序，直接使用即为逆时针顺序
        const dealOrder = playerIds;

        // 辅助函数：发牌时跳过亮牌（使用 shift 从头部取牌，正向抓牌）
        const drawCardSkipShown = () => {
            // 亮牌在牌堆头部（索引0），需要跳过
            if (this.gameState.shownCardIndex >= 0 &&
                this.gameState.shownCardIndex === 0 &&
                !this.gameState.shownCardSkipped) {
                console.log(`发牌跳过亮牌: ${cardName(this.gameState.shownCard)}`);
                this.gameState.shownCardSkipped = true;
                this.gameState.deck.shift(); // 移除亮牌
                this.gameState.shownCardIndex = -1;
            }
            const card = this.gameState.deck.shift();
            if (!this.gameState.shownCardSkipped && this.gameState.shownCardIndex >= 0) {
                this.gameState.shownCardIndex--;
            }
            return card;
        };

        // 广播发牌进度的函数
        const broadcastDealProgress = (step, total) => {
            const message = JSON.stringify({
                type: 'dealProgress',
                data: {
                    step,
                    total,
                    hands: Object.fromEntries(
                        Object.entries(this.gameState.hands).map(([pid, cards]) => [pid, cards.length])
                    ),
                    wallState: this.gameState.wallState,
                    deckCount: this.gameState.deck.length
                }
            });
            for (const player of this.players.values()) {
                if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(message);
                }
            }
        };

        // 发牌动画：每人4张×3轮
        let dealStep = 0;
        const totalSteps = 3 * 4 + 4 + 1; // 3轮×4人 + 每人1张 + 庄家1张

        for (let round = 0; round < 3; round++) {
            for (const pid of dealOrder) {
                for (let i = 0; i < 4; i++) {
                    const card = drawCardSkipShown();
                    if (card) this.gameState.hands[pid].push(card);
                }
                dealStep++;
                this.updateWallState(); // 使用统一的牌墙更新逻辑
                broadcastDealProgress(dealStep, totalSteps);
                await new Promise(r => setTimeout(r, 150)); // 延迟150ms
            }
        }

        // 每人1张
        for (const pid of dealOrder) {
            const card = drawCardSkipShown();
            if (card) this.gameState.hands[pid].push(card);
            dealStep++;
            this.updateWallState(); // 使用统一的牌墙更新逻辑
            broadcastDealProgress(dealStep, totalSteps);
            await new Promise(r => setTimeout(r, 100));
        }

        // 庄家多拿1张
        const dealerPid = playerIds[this.gameState.dealer];
        const extraCard = drawCardSkipShown();
        if (extraCard) this.gameState.hands[dealerPid].push(extraCard);
        dealStep++;
        this.updateWallState(); // 使用统一的牌墙更新逻辑
        broadcastDealProgress(dealStep, totalSteps);

        console.log(`发牌完成，牌堆剩余: ${this.gameState.deck.length}张`);

        // 进入游戏阶段
        this.gameState.roundPhase = 'playing';
        this.gameState.currentPlayer = this.gameState.dealer;

        // 排序手牌
        for (const pid of playerIds) {
            this.sortHand(pid);
        }

        console.log(`牌桌${this.tableNumber} 第${this.currentRound}局开始，万能牌: ${cardName(this.gameState.wildCard)}`);

        // 发送最终游戏状态
        this.broadcastGameState();
        this.checkAITurn();
    }

    // 随机换座位（周期开始时调用）
    randomizeSeats() {
        const playerList = Array.from(this.players.values());
        const seats = [1, 2, 3, 4];

        // 洗牌座位
        for (let i = seats.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [seats[i], seats[j]] = [seats[j], seats[i]];
        }

        // 分配新座位
        const seatToName = { 1: '小东', 2: '小南', 3: '小西', 4: '小北' };
        playerList.forEach((player, index) => {
            player.seatNum = seats[index];
            // 更新AI名称以匹配新座位方位
            if (player.isAI) {
                player.name = seatToName[seats[index]] || player.name;
            }
        });

        console.log(`牌桌${this.tableNumber} 座位已随机更换`);
        this.broadcastPlayerList();
    }

    // 初始化牌局（洗牌、确定庄家等）
    initDeckAndDealer() {
        this.gameState.started = true;
        this.gameState.gameStartTime = Date.now();
        this.gameState.totalGameTime = 0;

        // 启动游戏计时器（每秒更新）
        if (this.gameTimer) clearInterval(this.gameTimer);
        this.gameTimer = setInterval(() => {
            if (this.gameState.started) {
                this.gameState.totalGameTime = Math.floor((Date.now() - this.gameState.gameStartTime) / 1000);
            }
        }, 1000);

        // 洗牌
        this.gameState.deck = shuffle(createDeck());

        // 确定庄家
        const playerIds = this.getSortedPlayerIds();

        if (this.currentRound === 0 || this.currentRound === 1) {
            // 周期第一局：座东的玩家坐庄
            const dongPlayer = Array.from(this.players.values()).find(p => p.seatNum === 1);
            if (dongPlayer) {
                this.gameState.dealerSeat = 1; // 东（1号位）是庄家
                this.gameState.dealer = playerIds.indexOf(dongPlayer.id);
            } else {
                this.gameState.dealerSeat = 1;
                this.gameState.dealer = 0;
            }
        } else {
            // 后续局：上一局胡牌者坐庄（已在胡牌时设置）
            // 如果 lastWinner 存在，使用它；否则保持庄家不变
            if (this.lastWinner) {
                const winnerIndex = playerIds.indexOf(this.lastWinner);
                if (winnerIndex >= 0) {
                    this.gameState.dealer = winnerIndex;
                    const winner = this.players.get(this.lastWinner);
                    if (winner) this.gameState.dealerSeat = winner.seatNum;
                }
            }
        }

        console.log(`牌桌${this.tableNumber} 第${this.currentRound}局，庄家座位: ${this.gameState.dealerSeat}`);
    }

    // 获取按座位排序的玩家ID数组（辅助方法）
    getSortedPlayerIds() {
        return Array.from(this.players.entries())
            .sort((a, b) => a[1].seatNum - b[1].seatNum)
            .map(([id]) => id);
    }

    // 处理骰子掷出
    handleDiceRoll(playerId, values) {
        return this.rollDice(playerId, values);
    }

    // 检查并执行胡牌
    checkAndHu(playerId) {
        // 必须是当前出牌的玩家才能胡牌
        if (this.getCurrentPlayerId() !== playerId) return false;
        // 必须在游戏进行中
        if (this.gameState.roundPhase !== 'playing') return false;

        const hand = this.gameState.hands[playerId];
        const showedCards = this.gameState.showedCards[playerId] || { fa: [], gang: [] };
        const gangCount = (showedCards.gang || []).length;
        const requiredHandSize = 14 - gangCount * 3;
        if (!hand || hand.length < requiredHandSize) return false;

        // 将杠牌中的3张（视为刻子）加回手牌，使总数凑到14张
        const fullHand = [...hand];
        for (const gangCards of (showedCards.gang || [])) {
            fullHand.push(gangCards[0], gangCards[1], gangCards[2]);
        }

        // 使用胡牌判定引擎
        if (!canHu(fullHand, this.gameState.wildCard)) return false;

        const player = this.players.get(playerId);
        const score = calculateScore(showedCards);

        console.log(`${player.name} 自摸胡牌！单倍: ${score}, 总得分: ${score * 3}`);

        // 更新累积得分：赢家获得 3×score，每个输家扣除 score
        const totalScore = score * 3; // 自摸胡牌，3个输家各扣score，赢家得3×score
        if (!this.totalScores[playerId]) this.totalScores[playerId] = 0;
        this.totalScores[playerId] += totalScore;
        for (const pid of this.players.keys()) {
            if (pid !== playerId) {
                if (!this.totalScores[pid]) this.totalScores[pid] = 0;
                this.totalScores[pid] -= score;
            }
        }

        // 广播胡牌结果
        this.broadcastRoundEnd(playerId, player.name, score * 3);
        this.endRound(playerId);
        this.broadcastGameState();

        return true;
    }

    // 广播一局结束结果
    broadcastRoundEnd(winnerId, winnerName, score) {
        // 收集累积分数
        const scores = {};
        for (const pid of this.players.keys()) {
            scores[pid] = this.totalScores[pid] || 0;
        }

        // 收集胡牌详细信息
        const roundDetail = {};
        if (winnerId) {
            const showedCards = this.gameState.showedCards[winnerId] || { fa: [], gang: [] };
            const baseScore = 1 + (showedCards.fa || []).length + (showedCards.gang || []).length * 2;
            const winnerHand = this.gameState.hands[winnerId] || [];
            roundDetail.winnerHand = winnerHand;
            roundDetail.winnerHandGroups = groupHuCards(winnerHand, this.gameState.wildCard);
            roundDetail.winnerShowed = showedCards;
            roundDetail.wildCard = this.gameState.wildCard;
            roundDetail.baseScore = baseScore;
            roundDetail.totalScore = score;
        }

        // 收集所有玩家的弃牌（正面展示）
        const allDiscarded = {};
        for (const pid of this.players.keys()) {
            allDiscarded[pid] = {
                name: this.players.get(pid)?.name || '',
                cards: this.gameState.discardedCards[pid] || []
            };
        }

        const message = JSON.stringify({
            type: 'roundEnd',
            data: {
                winner: winnerId,
                winnerName: winnerName || '无人',
                score: score || 0,
                isDraw: !winnerId,
                totalScores: scores,
                roundDetail,
                allDiscarded
            }
        });

        for (const player of this.players.values()) {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(message);
            }
        }
    }

    // 检查当前玩家是否可以胡牌（用于AI和UI提示）
    checkPlayerCanHu(playerId) {
        const hand = this.gameState.hands[playerId];
        const showedCards = this.gameState.showedCards[playerId] || { fa: [], gang: [] };
        const gangCount = (showedCards.gang || []).length;
        // 每个杠减少3张手牌需求：1个杠时手牌11张即可（11+3=14，杠本身算1组）
        const requiredHandSize = 14 - gangCount * 3;
        if (!hand || hand.length < requiredHandSize) return false;
        // 将杠牌中的3张（视为刻子）加回手牌，凑到14张供canHu检查
        const fullHand = [...hand];
        for (const gangCards of (showedCards.gang || [])) {
            fullHand.push(gangCards[0], gangCards[1], gangCards[2]);
        }
        return canHu(fullHand, this.gameState.wildCard);
    }

    // 一局结束
    endRound(winnerId) {
        this.gameState.roundPhase = 'ended';
        this.lastWinner = winnerId;
        this.roundReadyPlayers.clear();

        // 重置所有玩家的准备状态
        for (const player of this.players.values()) {
            player.ready = false;
        }

        if (winnerId) {
            const winner = this.players.get(winnerId);
            this.broadcastMessage(`🎉 ${winner ? winner.name : '未知'} 自摸胡牌！第${this.currentRound}局结束`);
        } else {
            this.broadcastMessage(`第${this.currentRound}局流局！`);
        }
        this.broadcastPlayerList();

        // AI玩家自动准备
        for (const player of this.players.values()) {
            if (player.isAI) {
                // 延迟一点时间让消息先发送
                setTimeout(() => {
                    this.setRoundReady(player.id, true);
                }, 300);
            }
        }
    }

    // 局间准备
    setRoundReady(playerId, ready) {
        if (this.gameState.roundPhase !== 'ended') return;

        if (ready) {
            this.roundReadyPlayers.add(playerId);
        } else {
            this.roundReadyPlayers.delete(playerId);
        }

        // 更新玩家的准备状态显示
        const player = this.players.get(playerId);
        if (player) {
            player.ready = ready;
        }

        this.broadcastPlayerList();
        this.checkStartGame();
    }

    // 广播发牌开始消息
    broadcastDealStart() {
        const message = JSON.stringify({ type: 'dealStart' });
        for (const player of this.players.values()) {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(message);
            }
        }
    }

    // 排序手牌
    sortHand(playerId) {
        const hand = this.gameState.hands[playerId];
        if (!hand) return;

        const suitOrder = { '筒': 0, '条': 1, '万': 2, '风': 3, '箭': 4 };
        const windOrder = { '东': 0, '南': 1, '西': 2, '北': 3 };
        const arrowOrder = { '中': 0, '发': 1, '白': 2 };

        hand.sort((a, b) => {
            // 万能牌放最前面
            if (this.isWildCard(a) && !this.isWildCard(b)) return -1;
            if (!this.isWildCard(a) && this.isWildCard(b)) return 1;

            const suitA = suitOrder[a.suit] ?? 5;
            const suitB = suitOrder[b.suit] ?? 5;
            if (suitA !== suitB) return suitA - suitB;

            if (a.type === 'number' && b.type === 'number') {
                return a.rank - b.rank;
            } else if (a.type === 'wind' && b.type === 'wind') {
                return (windOrder[a.rank] ?? 0) - (windOrder[b.rank] ?? 0);
            } else if (a.type === 'arrow' && b.type === 'arrow') {
                return (arrowOrder[a.rank] ?? 0) - (arrowOrder[b.rank] ?? 0);
            }
            return 0;
        });
    }

    // 判断是否是癞子牌本身
    isWildCardItself(card) {
        const wild = this.gameState.wildCard;
        if (!wild) return false;
        return card.suit === wild.suit && card.rank === wild.rank;
    }

    // 判断是否是特殊牌（癞子本身）
    // 仅用于：出牌禁止、手牌排序
    isWildCard(card) {
        const wild = this.gameState.wildCard;
        if (!wild) return false;

        // 癞子牌本身（含癞子是红中的情况）
        if (card.suit === wild.suit && card.rank === wild.rank) return true;

        return false;
    }

    // 判断红中是否可以暗杠（仅4张红中自成一刻时可杠）
    // 癞子是发：红中不能杠
    // 癞子是红中：红中是癞子，不能杠
    // 癞子是其他：4张红中可杠，但不能和其他牌面混杠
    canGangZhong(playerId) {
        const wild = this.gameState.wildCard;
        if (!wild) return false;

        const hand = this.gameState.hands[playerId];
        if (!hand) return false;

        // 癞子是红中或发时，红中不能杠
        if (wild.type === 'arrow') return false;

        // 癞子是其他牌：统计红中数量，4张可杠
        let zhongCount = 0;
        for (const card of hand) {
            if (card.type === 'arrow' && card.rank === '中') zhongCount++;
        }
        return zhongCount === 4;
    }

    // 摸牌（跳过亮牌，使用 shift 从头部取牌，正向抓牌）
    drawCard(playerId) {
        if (this.gameState.deck.length === 0) {
            this.updateWallState(); // 确保牌墙状态同步
            return null; // 流局
        }

        // 检查是否遇到亮牌（亮牌在牌堆头部，索引0）
        // 亮牌永久移除，不放回牌堆
        if (this.gameState.shownCardIndex >= 0 &&
            this.gameState.shownCardIndex === 0) {
            console.log(`摸牌跳过亮牌: ${cardName(this.gameState.shownCard)}，亮牌移至桌面中央`);
            this.gameState.shownCardSkipped = true;
            this.gameState.deck.shift(); // 永久移除亮牌
            this.gameState.shownCardIndex = -1; // 不再跟踪

            // 牌堆可能为空
            if (this.gameState.deck.length === 0) {
                this.updateWallState();
                this.broadcastDrawAnimation(playerId);
                return null;
            }
        }

        // 正常抓牌（从头部取，正向方向）
        const card = this.gameState.deck.shift();

        // 更新亮牌索引（还没跳过的话）
        if (!this.gameState.shownCardSkipped && this.gameState.shownCardIndex >= 0) {
            this.gameState.shownCardIndex--;
        }

        if (card) {
            this.gameState.hands[playerId].push(card);
            this.gameState.lastDrawn = card;
            // 不自动排序，保留用户手动排列的顺序
        }

        // 更新牌墙状态
        this.updateWallState();

        // 广播摸牌动画
        this.broadcastDrawAnimation(playerId);

        return card;
    }

    // 反向摸牌（换發/杠牌用，从牌墙发牌起始点反向取牌）
    drawCardReverse(playerId) {
        if (this.gameState.deck.length === 0) {
            this.updateWallState();
            return null;
        }

        // 反向取牌：从牌堆末尾取（pop），即发牌起始点前一墩往1方向
        // 重排后 deck = [...after(抓牌方向)..., ...before(反方向)...]
        // pop 取的是 before 的最后一个 = 发牌起始点前一墩
        const beforeLen = this.gameState.reverseDrawnCount || 0;
        const drawOrder = this.gameState.wallDrawOrder;
        const reverseIndex = drawOrder ? drawOrder.length - 1 - beforeLen : -1;
        const pos = reverseIndex >= 0 && drawOrder ? drawOrder[reverseIndex] : null;
        const dirNames = { 1: '东', 2: '南', 3: '西', 4: '北' };
        console.log(`[反向摸牌] 取牌位置: ${pos ? dirNames[pos.dir] + pos.pile + '墩' : '未知'}, 牌堆剩余: ${this.gameState.deck.length}`);

        const card = this.gameState.deck.pop();

        if (card) {
            this.gameState.hands[playerId].push(card);
            this.gameState.lastDrawn = card;
        }

        // 递增反向计数并更新牌墙状态
        if (!this.gameState.reverseDrawnCount) this.gameState.reverseDrawnCount = 0;
        this.gameState.reverseDrawnCount++;
        this.updateWallState();
        this.broadcastDrawAnimation(playerId);

        return card;
    }

    // 广播摸牌动画
    broadcastDrawAnimation(playerId) {
        const player = this.players.get(playerId);
        const seatNum = player ? player.seatNum : 0;

        // 包含亮牌信息
        const shownInfo = {
            card: this.gameState.shownCard,
            direction: this.gameState.drawInfo?.shownDirection,
            pile: this.gameState.drawInfo?.shownPile,
            skipped: this.gameState.shownCardSkipped
        };

        const message = JSON.stringify({
            type: 'drawAnimation',
            data: {
                playerId,
                seatNum,
                wallState: this.gameState.wallState,
                deckCount: this.gameState.deck.length,
                shownInfo
            }
        });

        for (const p of this.players.values()) {
            if (p.ws && p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(message);
            }
        }
    }

    // 统一更新牌墙状态（同时处理正向和反向取牌）
    updateWallState() {
        const drawOrder = this.gameState.wallDrawOrder;
        if (!drawOrder || drawOrder.length === 0) {
            this.gameState.wallState = { 1: { start: 1, count: 17 }, 2: { start: 1, count: 17 }, 3: { start: 1, count: 17 }, 4: { start: 1, count: 17 } };
            return;
        }

        const reverseCount = this.gameState.reverseDrawnCount || 0;
        // 正向已取 = 总减少 - 反向已取
        const forwardDrawn = drawOrder.length - this.gameState.deck.length - reverseCount;

        // 初始化：每墩2张
        const dirPiles = { 1: {}, 2: {}, 3: {}, 4: {} };
        for (let d = 1; d <= 4; d++) {
            for (let p = 1; p <= 17; p++) {
                dirPiles[d][p] = 2;
            }
        }

        // 标记正向已取（shift，从wallDrawOrder头部开始）
        for (let i = 0; i < forwardDrawn && i < drawOrder.length; i++) {
            const { dir, pile } = drawOrder[i];
            if (dirPiles[dir] && dirPiles[dir][pile] !== undefined) {
                dirPiles[dir][pile]--;
            }
        }

        // 标记反向已取（pop，从wallDrawOrder末尾开始）
        for (let i = drawOrder.length - 1; i >= drawOrder.length - reverseCount && i >= forwardDrawn; i--) {
            const { dir, pile } = drawOrder[i];
            if (dirPiles[dir] && dirPiles[dir][pile] !== undefined) {
                dirPiles[dir][pile]--;
            }
        }

        // 转换为 wallState 格式
        const wallState = {};
        for (let d = 1; d <= 4; d++) {
            const visiblePiles = [];
            const halfPiles = [];
            for (let p = 1; p <= 17; p++) {
                if (dirPiles[d][p] > 0) {
                    visiblePiles.push(p);
                    if (dirPiles[d][p] === 1) {
                        halfPiles.push(p);
                    }
                }
            }

            if (visiblePiles.length === 0) {
                wallState[d] = { start: 0, count: 0, halfPiles: [] };
            } else if (visiblePiles.length === 17) {
                wallState[d] = { start: 1, count: 17, halfPiles };
            } else {
                const ranges = [];
                let rangeStart = visiblePiles[0];
                let rangeEnd = visiblePiles[0];
                for (let i = 1; i < visiblePiles.length; i++) {
                    if (visiblePiles[i] === visiblePiles[i-1] + 1) {
                        rangeEnd = visiblePiles[i];
                    } else {
                        ranges.push({ start: rangeStart, count: rangeEnd - rangeStart + 1 });
                        rangeStart = visiblePiles[i];
                        rangeEnd = visiblePiles[i];
                    }
                }
                ranges.push({ start: rangeStart, count: rangeEnd - rangeStart + 1 });
                wallState[d] = { start: ranges[0].start, count: ranges[0].count, halfPiles };
                if (ranges.length > 1) {
                    wallState[d].endKeep = ranges[ranges.length - 1];
                }
            }
        }

        this.gameState.wallState = wallState;
        console.log(`牌墙状态更新: 正向${forwardDrawn}, 反向${reverseCount}, wallState:`, JSON.stringify(wallState));
    }

    // 判断一张牌是否是可换牌（打出时自动换牌而不是弃牌）
    // 发是普通牌时：发出自动换；发是癞子时：中出自动换；癞子发不可换
    isExchangeCard(card) {
        const wild = this.gameState.wildCard;
        if (!wild) return false;
        const isWildFa = wild.type === 'arrow' && wild.rank === '发';

        if (isWildFa) {
            // 发是癞子：打出"中"自动换牌
            return card.type === 'arrow' && card.rank === '中';
        } else {
            // 发是普通牌：打出"发"自动换牌
            return card.type === 'arrow' && card.rank === '发';
        }
    }

    // 出牌
    playCard(playerId, cardId) {
        const hand = this.gameState.hands[playerId];
        if (!hand) return false;

        const cardIndex = hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return false;

        const card = hand[cardIndex];

        // 检查是否是可换牌（发或中），打出时自动换牌
        if (this.isExchangeCard(card)) {
            // 执行换牌逻辑
            const result = this.changeFa(playerId);
            if (result) {
                const player = this.players.get(playerId);
                const exchangeName = this.getExchangeCardName();
                this.broadcastMessage(`${player ? player.name : ''} 打出"${exchangeName}"自动换牌`);
                // 换牌后不出牌，当前玩家继续（需要出其他牌）
                return 'exchange';
            }
            return false;
        }

        // 禁止打出万能牌（癞子本身）
        // 红中可当普通牌打出，也可替代癞子牌面使用，不限制出牌
        if (this.isWildCard(card)) {
            return false;
        }

        hand.splice(cardIndex, 1);

        // 打出的牌背面朝上，加入弃牌堆
        this.gameState.discardedPile.push({
            playerId,
            card,
            hidden: true // 背面朝上
        });

        // 加入玩家个人的弃牌区
        if (!this.gameState.discardedCards[playerId]) {
            this.gameState.discardedCards[playerId] = [];
        }
        this.gameState.discardedCards[playerId].push(card);

        // 下一位玩家
        this.nextPlayer();

        return true;
    }

    // 换牌（发或红中），支持多张换發
    changeFa(playerId) {
        const hand = this.gameState.hands[playerId];
        if (!hand) return false;

        const wild = this.gameState.wildCard;
        const isWildFa = wild && wild.type === 'arrow' && wild.rank === '发';

        // 如果万能牌是"发"，找红中；否则找"发"
        let targetRank = isWildFa ? '中' : '发';
        const faIndex = hand.findIndex(c => c.type === 'arrow' && c.rank === targetRank);
        if (faIndex === -1) return false;

        // 移出牌到展示区
        const faCard = hand.splice(faIndex, 1)[0];
        this.gameState.showedCards[playerId].fa.push(faCard);

        // 换發从牌墙反方向取牌（规则：从牌墙发牌起始点开始反向摸牌）
        const newCard = this.drawCardReverse(playerId);

        return { faCard, newCard };
    }

    // 暗杠
    doGang(playerId, cardId) {
        const hand = this.gameState.hands[playerId];
        if (!hand) return false;

        // 找到这张牌
        const targetCard = hand.find(c => c.id === cardId);
        if (!targetCard) return false;

        // 万能牌（癞子本身）不能参与暗杠
        if (this.isWildCard(targetCard)) return false;

        // 红中暗杠限制：
        // 癞子是发或红中时，红中不能杠
        // 癞子是其他牌时，4张红中可杠，但不能和其他牌面混杠（红中单独计数，不可能混杠）
        const isZhong = targetCard.type === 'arrow' && targetCard.rank === '中';
        if (isZhong && !this.canGangZhong(playerId)) return false;

        // 找所有相同的牌（不包括万能牌替代）
        const sameCards = hand.filter(c =>
            c.suit === targetCard.suit && c.rank === targetCard.rank
        );

        if (sameCards.length !== 4) return false;

        // 移除这4张牌
        this.gameState.hands[playerId] = hand.filter(c =>
            !(c.suit === targetCard.suit && c.rank === targetCard.rank)
        );

        // 加入展示区
        this.gameState.showedCards[playerId].gang.push(sameCards);

        // 标记需要从牌墙补牌
        this.gameState.pendingGangDraw = true;

        return sameCards;
    }

    // 检查是否可以暗杠
    canGang(playerId) {
        const hand = this.gameState.hands[playerId];
        if (!hand) return [];

        const wild = this.gameState.wildCard;
        const counts = {};
        for (const card of hand) {
            // 万能牌不计入暗杠牌数
            if (this.isWildCard(card)) continue;
            // 红中：癞子是箭牌时不能杠，不计入暗杠候选
            if (card.type === 'arrow' && card.rank === '中' && wild && wild.type === 'arrow') continue;
            const key = `${card.suit}_${card.rank}`;
            counts[key] = (counts[key] || 0) + 1;
        }

        const gangable = [];
        for (const [key, count] of Object.entries(counts)) {
            if (count === 4) {
                const [suit, rank] = key.split('_');
                gangable.push({ suit, rank });
            }
        }

        return gangable;
    }

    // 检查是否有牌可以换（发或红中），支持多次换
    hasFa(playerId) {
        const hand = this.gameState.hands[playerId];
        if (!hand) return false;

        const wild = this.gameState.wildCard;
        const isWildFa = wild && wild.type === 'arrow' && wild.rank === '发';

        // 如果万能牌是"发"，用红中换牌；否则用"发"换牌
        if (isWildFa) {
            return hand.some(c => c.type === 'arrow' && c.rank === '中');
        } else {
            return hand.some(c => c.type === 'arrow' && c.rank === '发');
        }
    }

    // 获取当前用于换牌的牌名（发或中）
    getExchangeCardName() {
        const wild = this.gameState.wildCard;
        const isWildFa = wild && wild.type === 'arrow' && wild.rank === '发';
        return isWildFa ? '中' : '发';
    }

    // 下一位玩家
    // 出牌方向：东→南→西→北（座位1→2→3→4）= 逆时针
    // playerIds按座位号排序，所以 +1 就是逆时针下一个
    nextPlayer() {
        this.gameState.currentPlayer = (this.gameState.currentPlayer + 1) % 4;
        // 每回合重置换"发"限制，允许玩家每回合换一次
        const nextPid = this.getCurrentPlayerId();
        if (nextPid) {
            this.gameState.faUsed[nextPid] = false;
        }
    }

    // 获取当前玩家ID
    getCurrentPlayerId() {
        const playerIds = this.getSortedPlayerIds();
        return playerIds[this.gameState.currentPlayer];
    }

    // ==================== AI玩家逻辑 ====================

    // 添加AI玩家
    addAIPlayer(seatNum) {
        if (this.players.size >= this.maxPlayers) return false;
        if (this.gameState.started) return false;

        // 先确定座位
        let actualSeat = seatNum;
        if (!actualSeat) {
            const occupiedSeats = new Set(Array.from(this.players.values()).map(p => p.seatNum));
            for (let i = 1; i <= 4; i++) {
                if (!occupiedSeats.has(i)) {
                    actualSeat = i;
                    break;
                }
            }
        }

        // 检查座位是否已被占用
        const occupied = Array.from(this.players.values()).some(p => p.seatNum === actualSeat);
        if (occupied) return false;

        const aiId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // 座位映射：1=东(庄家), 2=南, 3=西, 4=北（逆时针：东→南→西→北）
        const seatToName = { 1: '小东', 2: '小南', 3: '小西', 4: '小北' };
        const aiName = seatToName[actualSeat] || `AI玩家${actualSeat}`;

        this.players.set(aiId, {
            ws: null, // AI没有WebSocket连接
            id: aiId,
            name: aiName,
            seatNum: actualSeat,
            ready: true, // AI默认准备
            isAI: true
        });

        console.log(`牌桌${this.tableNumber} 添加AI玩家: ${aiName} 座位${actualSeat}`);
        return aiId;
    }

    // 检查并执行AI行动
    checkAITurn() {
        // 检查骰子阶段
        if (this.gameState.roundPhase === 'dice' && this.diceState.currentRoller) {
            const roller = this.players.get(this.diceState.currentRoller);
            if (roller && roller.isAI) {
                // AI延迟500ms后掷骰子
                setTimeout(() => this.aiRollDice(this.diceState.currentRoller), 500);
            } else if (roller && !roller.isAI && (!roller.ws || roller.ws.readyState !== WebSocket.OPEN)) {
                // 断线真人玩家自动托管
                console.log(`玩家 ${roller.name} 已断线，自动掷骰子`);
                setTimeout(() => this.aiRollDice(this.diceState.currentRoller), 1000);
            }
        }

        // 检查游戏阶段
        if (this.gameState.roundPhase === 'playing') {
            const currentPlayerId = this.getCurrentPlayerId();
            const currentPlayer = this.players.get(currentPlayerId);
            if (currentPlayer) {
                const hand = this.gameState.hands[currentPlayerId];
                const handCount = hand ? hand.length : 0;
                // 庄家首回合已有14张牌，直接出牌；其他情况先摸牌再出牌
                if (handCount >= 14) {
                    // 已有14张（庄家首回合），直接出牌
                    if (currentPlayer.isAI) {
                        setTimeout(() => this.aiPlayCard(currentPlayerId), 800);
                    } else if (!currentPlayer.ws || currentPlayer.ws.readyState !== WebSocket.OPEN) {
                        setTimeout(() => this.aiPlayCard(currentPlayerId), 2000);
                    }
                } else {
                    if (currentPlayer.isAI) {
                        setTimeout(() => this.aiDrawCard(currentPlayerId), 800);
                    } else if (!currentPlayer.ws || currentPlayer.ws.readyState !== WebSocket.OPEN) {
                        console.log(`玩家 ${currentPlayer.name} 已断线，自动出牌`);
                        setTimeout(() => this.aiDrawCard(currentPlayerId), 2000);
                    }
                }
            }
        }
    }

    // AI掷骰子
    aiRollDice(playerId) {
        if (this.diceState.currentRoller !== playerId) return;

        const player = this.players.get(playerId);
        if (!player || !player.isAI) return;

        console.log(`AI ${player.name} 掷骰子`);

        this.rollDice(playerId);

        // 检查第二次掷骰子
        setTimeout(() => this.checkAITurn(), 300);
    }

    // AI摸牌阶段（先摸牌，延迟后再出牌）
    aiDrawCard(playerId) {
        const currentPlayerId = this.getCurrentPlayerId();
        if (currentPlayerId !== playerId) return;

        const player = this.players.get(playerId);
        if (!player) return;

        // AI回合：先摸牌
        const drawnCard = this.drawCard(playerId);
        if (!drawnCard) {
            // 牌堆空，流局
            this.broadcastMessage('牌堆已空，流局！');
            this.endRound(null);
            this.broadcastRoundEnd(null, null, 0);
            this.broadcastGameState();
            return;
        }

        console.log(`AI ${player.name} 摸牌: ${drawnCard.rank}${drawnCard.suit || ''}`);

        const hand = this.gameState.hands[playerId];
        if (!hand || hand.length === 0) return;

        // AI策略：检查是否可以胡牌
        if (this.checkPlayerCanHu(playerId)) {
            console.log(`AI ${player.name} 检测到可以胡牌！`);
            if (this.checkAndHu(playerId)) {
                this.broadcastGameState();
                return; // 胡牌成功，结束回合
            }
        }

        // AI策略：检查是否可以暗杠
        const gangable = this.canGang(playerId);
        if (gangable.length > 0) {
            const gangTarget = gangable[0];
            const gangCard = hand.find(c => c.suit === gangTarget.suit && c.rank === gangTarget.rank);
            if (gangCard && Math.random() > 0.3) {
                const result = this.doGang(playerId, gangCard.id);
                if (result) {
                    console.log(`AI ${player.name} 暗杠: ${gangTarget.rank}${gangTarget.suit}`);
                    this.broadcastMessage(`AI ${player.name} 暗杠！`);
                    // 暗杠后从牌墙反方向摸一张牌补回来（规则：从牌墙发牌起始点开始反向摸牌）
                    const bonusCard = this.drawCardReverse(playerId);
                    if (!bonusCard) {
                        this.broadcastMessage('牌堆已空，流局！');
                        this.endRound(null);
                        this.broadcastRoundEnd(null, null, 0);
                        this.broadcastGameState();
                        return;
                    }
                    // 杠上开花检查：补牌后检查是否能胡
                    if (this.checkPlayerCanHu(playerId)) {
                        console.log(`AI ${player.name} 杠上开花！`);
                        this.broadcastMessage(`AI ${player.name} 杠上开花！`);
                        if (this.checkAndHu(playerId)) {
                            this.broadcastGameState();
                            return;
                        }
                    }
                }
            }
        }

        this.broadcastGameState();

        // 延迟1秒后出牌
        setTimeout(() => this.aiPlayCard(playerId), 1000);
    }

    // AI出牌阶段
    aiPlayCard(playerId) {
        const currentPlayerId = this.getCurrentPlayerId();
        if (currentPlayerId !== playerId) return;

        const player = this.players.get(playerId);
        if (!player) return;

        const hand = this.gameState.hands[playerId];
        if (!hand || hand.length === 0) return;

        // AI策略：先检查是否可以换牌（发/中），优先换
        if (this.hasFa(playerId)) {
            const faResult = this.changeFa(playerId);
            if (faResult) {
                const exchangeName = this.getExchangeCardName();
                console.log(`AI ${player.name} 自动换"${exchangeName}"`);
                this.broadcastMessage(`AI ${player.name} 打出"${exchangeName}"自动换牌`);
                this.broadcastGameState();
                // 换牌后继续出牌
                setTimeout(() => this.aiPlayCard(playerId), 500);
                return;
            }
        }

        // AI策略：选牌出（癞子、红中、可换牌都不选）
        const wild = this.gameState.wildCard;
        const cardScores = hand.map(card => {
            let score = 0;
            // 万能牌（癞子）绝不出
            if (wild && card.suit === wild.suit && card.rank === wild.rank) {
                score -= 200;
            }
            // 红中可替代万能牌，绝不出
            if (card.type === 'arrow' && card.rank === '中') {
                score -= 200;
            }
            // 可换牌（发/中）绝不出（应通过换牌机制处理）
            if (this.isExchangeCard(card)) {
                score -= 200;
            }
            // 风牌优先出（非万能牌的风牌）
            if (card.type === 'wind') {
                score += 10;
            }
            // 随机因素
            score += Math.random() * 5;
            return { card, score };
        });

        // 按分数排序，选最高的
        cardScores.sort((a, b) => b.score - a.score);
        const selectedCard = cardScores[0].card;

        console.log(`AI ${player.name} 出牌: ${selectedCard.rank}${selectedCard.suit || ''}`);

        const result = this.playCard(playerId, selectedCard.id);
        if (result === 'exchange') {
            // 换牌成功，继续出牌
            this.broadcastGameState();
            setTimeout(() => this.aiPlayCard(playerId), 500);
        } else if (result) {
            this.broadcastGameState();
            // 检查下一个是否也是AI
            this.checkAITurn();
        }
    }

    // 获取AI玩家数量
    getAIPlayerCount() {
        let count = 0;
        for (const player of this.players.values()) {
            if (player.isAI) count++;
        }
        return count;
    }

    // 广播玩家列表
    broadcastPlayerList() {
        const players = Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            seatNum: p.seatNum,
            ready: p.ready,
            isAI: p.isAI,
            totalScore: this.totalScores[p.id] || 0
        }));

        const message = JSON.stringify({
            type: 'playerList',
            players,
            tableNumber: this.tableNumber,
            started: this.gameState.started,
            roundPhase: this.gameState.roundPhase
        });

        for (const player of this.players.values()) {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(message);
            }
        }

        for (const spectator of this.spectators.values()) {
            if (spectator.ws && spectator.ws.readyState === WebSocket.OPEN) {
                spectator.ws.send(message);
            }
        }
    }

    // 向指定ws发送玩家列表（用于重连，不广播给所有人）
    sendPlayerList(ws) {
        const players = Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            seatNum: p.seatNum,
            ready: p.ready,
            isAI: p.isAI,
            totalScore: this.totalScores[p.id] || 0
        }));

        ws.send(JSON.stringify({
            type: 'playerList',
            players,
            tableNumber: this.tableNumber,
            started: this.gameState.started,
            roundPhase: this.gameState.roundPhase
        }));
    }

    // 广播游戏状态
    broadcastGameState() {
        const playerIds = this.getSortedPlayerIds();

        // 调试：打印万能牌信息
        console.log(`广播游戏状态，万能牌: ${JSON.stringify(this.gameState.wildCard)}`);

        for (const [playerId, player] of this.players) {
            if (!player.ws || player.ws.readyState !== WebSocket.OPEN) continue;

            const state = this.getPlayerGameState(playerId);
            console.log(`发送游戏状态给 ${player.name}: 手牌数量=${state.myHand.length}, 万能牌: ${JSON.stringify(state.wildCard)}`);
            player.ws.send(JSON.stringify({
                type: 'gameState',
                data: state
            }));
        }
    }

    // 向指定玩家发送游戏状态（用于重连）
    sendGameStateToPlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player || !player.ws || player.ws.readyState !== WebSocket.OPEN) return;
        const state = this.getPlayerGameState(playerId);
        player.ws.send(JSON.stringify({
            type: 'gameState',
            data: state
        }));
    }

    // 获取单个玩家视角的游戏状态
    getPlayerGameState(playerId) {
        const playerIds = this.getSortedPlayerIds();
        const myIndex = playerIds.indexOf(playerId);

        // 构建各玩家信息
        const playerInfo = {};
        for (let i = 0; i < playerIds.length; i++) {
            const pid = playerIds[i];
            const p = this.players.get(pid);
            playerInfo[pid] = {
                name: p?.name || '',
                seatNum: p?.seatNum || (i + 1),
                handCount: this.gameState.hands[pid]?.length || 0,
                showedCards: this.gameState.showedCards[pid] || { fa: [], gang: [] },
                discardedCards: this.gameState.discardedCards[pid] || [],
                discardedCount: this.gameState.discardedCards[pid]?.length || 0
            };
        }

        // 只返回自己的手牌
        const myHand = this.gameState.hands[playerId] || [];

        // 获取当前玩家的座位号
        const currentPid = playerIds[this.gameState.currentPlayer];
        const currentPlayerSeat = this.players.get(currentPid)?.seatNum || 1;

        // 获取庄家的座位号
        const dealerPid = playerIds[this.gameState.dealer];
        const dealerSeat = this.players.get(dealerPid)?.seatNum || 1;

        return {
            started: this.gameState.started,
            currentPlayer: this.gameState.currentPlayer,
            currentPlayerSeat,
            dealer: this.gameState.dealer,
            dealerSeat,
            myIndex,
            mySeatNum: this.players.get(playerId)?.seatNum || 1,
            myHand,
            wildCard: this.gameState.wildCard,
            shownCard: this.gameState.shownCard || null,
            shownCardSkipped: this.gameState.shownCardSkipped || false,
            drawInfo: this.gameState.drawInfo ? {
                shownDirection: this.gameState.drawInfo.shownDirection,
                shownPile: this.gameState.drawInfo.shownPile
            } : null,
            deckCount: this.gameState.deck.length,
            totalGameTime: this.gameState.totalGameTime,
            playerInfo,
            discardedCount: this.gameState.discardedPile.length,
            wallState: this.gameState.wallState || { 1: 17, 2: 17, 3: 17, 4: 17 },
            roundPhase: this.gameState.roundPhase,
            currentRound: this.currentRound,
            canChangeFa: this.hasFa(playerId) && this.getCurrentPlayerId() === playerId,
            canGang: this.canGang(playerId).length > 0 && this.getCurrentPlayerId() === playerId,
            canHu: this.checkPlayerCanHu(playerId) && this.getCurrentPlayerId() === playerId,
            pendingGangDraw: this.gameState.pendingGangDraw && this.getCurrentPlayerId() === playerId
        };
    }

    // 广播消息
    broadcastMessage(text) {
        const message = JSON.stringify({ type: 'message', text });
        for (const player of this.players.values()) {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(message);
            }
        }
    }

    // 获取牌桌信息（用于大厅显示）
    getTableInfo() {
        return {
            id: this.id,
            tableNumber: this.tableNumber,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            started: this.gameState.started,
            deckCount: this.gameState.deck ? this.gameState.deck.length : 0,
            players: Array.from(this.players.values()).map(p => ({
                name: p.name,
                seatNum: p.seatNum,
                ready: p.ready
            }))
        };
    }
}

// ==================== WebSocket连接处理 ====================
wss.on('connection', (ws) => {
    let playerId = null;
    let playerName = null;
    let currentTableId = null;

    console.log('新客户端连接');

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            switch (msg.type) {
                case 'login':
                    playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    playerName = msg.name || '玩家';

                    // 添加到已登录客户端集合
                    loggedInClients.add(ws);

                    ws.send(JSON.stringify({
                        type: 'loginSuccess',
                        playerId,
                        playerName
                    }));

                    // 检查是否有同名的断线玩家，自动重连
                    let reconnected = false;
                    console.log(`[重连检查] 玩家: ${playerName}, 当前牌桌数: ${tables.size}`);
                    for (const [tid, table] of tables) {
                        for (const [pid, player] of table.players) {
                            console.log(`[重连检查] 牌桌${tid} 玩家: ${player.name}, ws=${player.ws ? '有' : 'null'}, isAI=${player.isAI}`);
                            if (player.name === playerName && player.ws === null && !player.isAI) {
                                // 找到同名断线玩家，重连
                                player.ws = ws;
                                playerId = pid;
                                currentTableId = tid;
                                reconnected = true;
                                console.log(`${playerName} 重连到牌桌 ${tid}`);
                                // 重新发送登录成功（更新playerId）
                                ws.send(JSON.stringify({
                                    type: 'loginSuccess',
                                    playerId: pid,
                                    playerName
                                }));
                                // 直接发送玩家列表（让客户端进入游戏界面）
                                table.sendPlayerList(ws);
                                // 如果游戏进行中，发送当前游戏状态
                                if (table.gameState.started) {
                                    table.sendGameStateToPlayer(pid);
                                }
                                // 如果在骰子阶段，补发骰子状态
                                if (table.gameState.roundPhase === 'dice' && table.diceState) {
                                    const diceMsg = JSON.stringify({
                                        type: 'diceState',
                                        data: {
                                            firstRoll: table.diceState.firstRoll,
                                            secondRoll: table.diceState.secondRoll,
                                            currentRoller: table.diceState.currentRoller,
                                            rollPhase: table.diceState.rollPhase,
                                            roundPhase: table.gameState.roundPhase,
                                            shownCard: table.gameState.shownCard || null,
                                            wildCard: table.gameState.wildCard || null,
                                            drawInfo: table.gameState.drawInfo || null
                                        }
                                    });
                                    player.ws.send(diceMsg);
                                }
                                break;
                            }
                        }
                        if (reconnected) break;
                    }

                    if (!reconnected) {
                        // 发送牌桌列表
                        sendTableList(ws);
                    }
                    break;

                case 'getTableList':
                    sendTableList(ws);
                    break;

                case 'createTable':
                    // 优先加入已有的未满桌，而不是无条件创建新桌
                    const existingTable = Array.from(tables.values()).find(t =>
                        !t.gameState.started && t.players.size < t.maxPlayers
                    );
                    let targetTable;
                    if (existingTable) {
                        targetTable = existingTable;
                        console.log(`[createTable] 找到已有空桌 ${existingTable.id} (桌号${existingTable.tableNumber})，加入该桌`);
                        if (joinTable(ws, playerId, playerName, existingTable.id, msg.seatNum)) {
                            currentTableId = existingTable.id;
                        }
                        targetTable.broadcastPlayerList();
                        broadcastTableList();
                    } else {
                        const newTable = createTable();
                        if (joinTable(ws, playerId, playerName, newTable.id, msg.seatNum)) {
                            currentTableId = newTable.id;
                        }
                        newTable.broadcastPlayerList();
                        broadcastTableList();
                    }
                    break;

                case 'joinTable':
                    if (joinTable(ws, playerId, playerName, msg.tableId, msg.seatNum)) {
                        currentTableId = msg.tableId;
                        // 广播牌桌列表更新给所有人
                        console.log(`[DEBUG joinTable] ${playerName} 加入 ${msg.tableId}，广播 tableList`);
                        broadcastTableList();
                    } else {
                        console.log(`[DEBUG joinTable] ${playerName} 加入失败: ${msg.tableId}`);
                    }
                    break;

                case 'ready':
                    if (currentTableId) {
                        const table = tables.get(currentTableId);
                        if (table) {
                            table.setPlayerReady(playerId, msg.ready);
                        }
                    }
                    break;

                case 'diceRoll':
                    if (currentTableId) {
                        const table = tables.get(currentTableId);
                        if (table && table.diceState.currentRoller === playerId) {
                            const result = table.rollDice(playerId);
                            if (!result.success) {
                                ws.send(JSON.stringify({ type: 'error', message: result.message }));
                            }
                        }
                    }
                    break;

                case 'play':
                    if (currentTableId) {
                        const table = tables.get(currentTableId);
                        if (table && table.getCurrentPlayerId() === playerId) {
                            const result = table.playCard(playerId, msg.cardId);
                            if (result === 'exchange') {
                                // 换牌成功，当前玩家继续出牌（不出其他牌就不轮转）
                                table.broadcastGameState();
                            } else if (result) {
                                table.broadcastGameState();
                                // 检查AI出牌
                                table.checkAITurn();
                            }
                        }
                    }
                    break;

                case 'changeFa':
                    if (currentTableId) {
                        const table = tables.get(currentTableId);
                        if (table && table.getCurrentPlayerId() === playerId) {
                            const result = table.changeFa(playerId);
                            if (result) {
                                table.broadcastMessage(`${playerName} 换了一张"發"`);
                                table.broadcastGameState();
                            }
                        }
                    }
                    break;

                case 'gang':
                    if (currentTableId) {
                        const table = tables.get(currentTableId);
                        if (table && table.getCurrentPlayerId() === playerId) {
                            const result = table.doGang(playerId, msg.cardId);
                            if (result) {
                                table.broadcastMessage(`${playerName} 暗杠！`);
                                table.broadcastGameState();
                            }
                        }
                    }
                    break;

                case 'draw':
                    if (currentTableId) {
                        const table = tables.get(currentTableId);
                        if (table && table.getCurrentPlayerId() === playerId) {
                            const isGangDraw = table.gameState.pendingGangDraw;
                            if (isGangDraw) table.gameState.pendingGangDraw = false;
                            // 暗杠补牌使用反向摸牌，普通摸牌使用正向摸牌
                            const card = isGangDraw ? table.drawCardReverse(playerId) : table.drawCard(playerId);
                            if (card) {
                                table.broadcastGameState();
                            } else {
                                // 流局处理
                                table.endRound(null);
                                table.broadcastRoundEnd(null, null, 0);
                            }
                        }
                    }
                    break;

                case 'hu':
                    if (currentTableId) {
                        const table = tables.get(currentTableId);
                        if (table && table.gameState.roundPhase === 'playing') {
                            const result = table.checkAndHu(playerId);
                            if (result) {
                                // 胡牌成功
                            } else {
                                ws.send(JSON.stringify({ type: 'error', message: '当前不能胡牌' }));
                            }
                        }
                    }
                    break;

                case 'chat':
                    if (currentTableId) {
                        const table = tables.get(currentTableId);
                        if (table) {
                            table.broadcastMessage(`${playerName}: ${msg.text}`);
                        }
                    }
                    break;
            }
        } catch (e) {
            console.error('消息处理错误:', e);
        }
    });

    ws.on('close', () => {
        console.log('客户端断开:', playerName);

        // 从已登录客户端集合中移除
        loggedInClients.delete(ws);

        if (currentTableId && playerId) {
            const table = tables.get(currentTableId);
            if (table) {
                // 标记玩家断开
                const player = table.players.get(playerId);
                if (player) {
                    player.ws = null;
                    player.ready = false;
                }

                // 如果断线的是当前出牌/掷骰子的玩家，自动托管
                if (table.gameState.roundPhase === 'playing' || table.gameState.roundPhase === 'dice') {
                    setTimeout(() => table.checkAITurn(), 1000);
                }

                // 如果游戏未开始，直接移除玩家
                if (!table.gameState.started) {
                    // 等待5秒让客户端有机会重连
                    setTimeout(() => {
                        const stillDisconnected = table.players.get(playerId);
                        if (stillDisconnected && stillDisconnected.ws === null) {
                            table.removePlayer(playerId);
                            // 检查是否所有玩家都已断开连接，如果是则删除房间
                            if (table.isAllPlayersDisconnected()) {
                                tables.delete(currentTableId);
                                console.log(`牌桌 ${currentTableId} 所有人已离开，自动解散`);
                                ensureEmptyTable();
                            }
                            broadcastTableList();
                        }
                    }, 5000);
                    return; // 延迟后才会移除
                }

                // 游戏已开始，检查是否所有玩家都已断开连接
                if (table.isAllPlayersDisconnected()) {
                    tables.delete(currentTableId);
                    console.log(`牌桌 ${currentTableId} 所有人已离开，自动解散`);
                    ensureEmptyTable();
                } else {
                    table.broadcastPlayerList();
                }
            }
            playerToTable.delete(playerId);

            // 广播牌桌列表更新（因为有人离开）
            broadcastTableList();
        }
    });
});

// 发送牌桌列表
function sendTableList(ws) {
    const tableList = Array.from(tables.values()).map(t => t.getTableInfo());
    ws.send(JSON.stringify({
        type: 'tableList',
        tables: tableList
    }));
}

// 广播牌桌列表给所有已登录客户端
function broadcastTableList() {
    const tableList = Array.from(tables.values()).map(t => t.getTableInfo());
    console.log(`[tableList] 广播: ${tableList.length}张桌, 每桌: ${tableList.map(t => `${t.tableNumber}号(${t.playerCount}/${t.maxPlayers}, ${t.started?'开始':'未开始'})`).join(', ')}`);
    const message = JSON.stringify({
        type: 'tableList',
        tables: tableList
    });

    // 广播给所有连接的客户端
    let count = 0;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
            count++;
        }
    });
    console.log(`[tableList] 广播给 ${count} 个客户端`);
}

// 确保至少有一个空桌（只在完全没有桌子时创建初始空桌）
function ensureEmptyTable() {
    const hasEmptyTable = Array.from(tables.values()).some(t =>
        !t.gameState.started && t.players.size < t.maxPlayers
    );
    if (!hasEmptyTable && tables.size === 0) {
        const newTable = createTable();
        console.log(`[ensureEmptyTable] 首次启动，创建初始空桌: ${newTable.id} (桌号${newTable.tableNumber})`);
    }
}

// 创建牌桌
function createTable() {
    tableCounter++;
    const tableId = `table_${tableCounter}`;
    const table = new GameTable(tableId, tableCounter);
    tables.set(tableId, table);
    console.log(`创建新牌桌: ${tableId}`);
    return table;
}

// 加入牌桌
function joinTable(ws, playerId, playerName, tableId, seatNum) {
    const table = tables.get(tableId);
    if (!table) {
        ws.send(JSON.stringify({ type: 'error', message: '牌桌不存在' }));
        return false;
    }

    if (table.addPlayer(ws, playerId, playerName, seatNum)) {
        playerToTable.set(playerId, tableId);
        table.broadcastPlayerList();
        console.log(`${playerName} 加入牌桌 ${tableId}`);
        return true;
    } else {
        ws.send(JSON.stringify({ type: 'error', message: '无法加入牌桌（已满或游戏已开始）' }));
        return false;
    }
}

// 获取本机局域网IP（排除WSL/虚拟网卡）
function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();

    // 优先返回非虚拟网卡的局域网IP
    for (const name of Object.keys(interfaces)) {
        // 跳过WSL、Hyper-V、VMware等虚拟网卡
        if (/WSL|Hyper|VMware|VirtualBox|vEthernet|Loopback|Docker/i.test(name)) continue;
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    // 启动时创建初始空桌
    ensureEmptyTable();
    console.log('');
    console.log('Majiang Server Started!');
    console.log(`Game URL: http://localhost:${PORT}`);
    console.log(`LAN URL: http://${localIP}:${PORT}`);
    console.log('');
});

// 定时清理空桌子（每5分钟检查一次）
setInterval(() => {
    for (const [tableId, table] of tables) {
        // 如果桌子没有玩家，或者所有玩家都已断开连接
        if (table.players.size === 0) {
            tables.delete(tableId);
            console.log(`Cleaned up empty table: ${tableId}`);
        } else {
            // 检查是否所有玩家都已断开
            let allDisconnected = true;
            for (const player of table.players.values()) {
                if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    allDisconnected = false;
                    break;
                }
            }
            if (allDisconnected && !table.gameState.started) {
                tables.delete(tableId);
                console.log(`Cleaned up disconnected table: ${tableId}`);
            }
        }
    }
    // 清理后确保至少有一个空桌
    ensureEmptyTable();
}, 300000); // 5分钟

// ==================== 胡牌判定引擎 ====================

/**
 * 检查手牌是否可以胡牌
 * @param {Array} hand - 手牌数组
 * @param {Object|null} wildCard - 万能牌信息 { suit, rank, type }
 * @param {boolean} includeNewCard - 是否包含刚摸的牌（14张）
 * @returns {boolean} 是否可以胡牌
 */
function canHu(hand, wildCard) {
    if (!hand || hand.length === 0) return false;

    // 14张才能胡（13张+1张刚摸的）
    if (hand.length < 14) return false;
    // 只检查14张的情况（标准胡牌）
    const cards = hand.slice(0, 14);

    // 统计红中数量
    let zhongCount = 0;
    for (const card of cards) {
        if (isZhong(card)) zhongCount++;
    }

    // 红中当作癞子牌面的那张普通牌使用（无论癞子是什么牌）
    // 规则：红中始终可替代癞子牌面，也可做普通红中使用
    if (zhongCount === 0) {
        // 无红中，直接检查
        if (isYaoPaiHu(cards, wildCard)) return true;
        if (isLangPaiHu(cards, wildCard)) return true;
        if (isQiDuiHu(cards, wildCard)) return true;
        if (isNormalHu(cards, wildCard)) return true;
        return false;
    }

    // 有红中时，枚举每张红中的身份：
    // 0到zhongCount张红中当作癞子牌面的牌（固定替换），其余当作普通红中
    for (let asWild = 0; asWild <= zhongCount; asWild++) {
        const asNormal = zhongCount - asWild;
        // 构建虚拟手牌：asWild张红中替换为癞子牌面的牌，asNormal张保留为普通红中
        const virtualCards = [];
        let zhongAdded = 0;
        for (const card of cards) {
            if (isZhong(card)) {
                zhongAdded++;
                if (zhongAdded <= asWild && wildCard) {
                    // 替换为癞子牌面的牌（不是万能牌，是一张具体的普通牌）
                    virtualCards.push({ ...wildCard, _replacedByZhong: true });
                } else {
                    virtualCards.push(card); // 普通红中
                }
            } else {
                virtualCards.push(card);
            }
        }

        // 直接用各胡牌检查函数（不需要 checkHuWithVirtualCards）
        if (isYaoPaiHu(virtualCards, wildCard)) return true;
        if (isLangPaiHu(virtualCards, wildCard)) return true;
        if (isQiDuiHu(virtualCards, wildCard)) return true;
        if (isNormalHu(virtualCards, wildCard)) return true;
    }

    return false;
}

/**
 * 判断牌是否是万能牌（癞子本身，不含红中）
 */
function isWild(card, wildCard) {
    if (!wildCard) return false;
    // 红中替换为癞子牌面的牌不是万能牌，只是普通牌
    if (card._replacedByZhong) return false;
    if (card.suit === wildCard.suit && String(card.rank) === String(wildCard.rank) && card.type === wildCard.type) return true;
    return false;
}

/**
 * 判断牌是否是红中
 */
function isZhong(card) {
    return card.type === 'arrow' && card.rank === '中';
}

/**
 * 统计非万能牌、万能牌数量
 * 红中替换牌（_replacedByZhong）被视为普通牌，不是万能牌
 */
function analyzeHand(cards, wildCard) {
    const normal = []; // 非万能牌（含普通红中和红中替换牌）
    let wildCount = 0;
    for (const card of cards) {
        if (isWild(card, wildCard)) {
            wildCount++;
        } else {
            // 普通牌、普通红中、红中替换牌都进入normal
            normal.push(card);
        }
    }
    return { normal, wildCount };
}

/**
 * 将红中当作癞子牌面的牌来重新分析手牌
 * 例如癞子是6条，红中就当作6条
 */

/**
 * 生成牌的key
 */
function cardKey(card) {
    return `${card.suit}_${card.rank}`;
}

/**
 * 统计牌面出现次数
 */
function countCards(cards) {
    const counts = {};
    for (const card of cards) {
        const key = cardKey(card);
        counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
}

/**
 * 检查七对胡法
 * 7个对子，万能牌可当任意牌凑对
 */
function isQiDuiHu(cards, wildCard) {
    if (cards.length !== 14) return false;

    const { normal, wildCount } = analyzeHand(cards, wildCard);
    const counts = countCards(normal);

    let pairs = 0;
    let singles = 0;
    for (const count of Object.values(counts)) {
        pairs += Math.floor(count / 2);
        singles += count % 2;
    }

    // 七对需要7个对子，万能牌可以凑单张成对
    return (pairs + Math.min(wildCount, singles) >= 7) && (singles <= wildCount) && ((pairs * 2 + singles + wildCount) === 14);
}

/**
 * 检查幺牌胡法
 * 全由幺牌组成（1、9、风牌、箭牌），必须是14张
 * 幺牌胡法不需要符合常规牌型结构，只需14张全是幺牌
 */
function isYaoPaiHu(cards, wildCard) {
    if (cards.length !== 14) return false;

    const { normal, wildCount } = analyzeHand(cards, wildCard);

    // 所有非万能牌必须是幺牌
    for (const card of normal) {
        if (!isYao(card)) return false;
    }

    // 幺牌胡法：14张全是幺牌（含万能牌替代）即可胡牌
    return true;
}

/**
 * 判断是否是幺牌
 */
function isYao(card) {
    // 数字牌的1和9
    if (card.type === 'number') {
        return card.rank === 1 || card.rank === 9;
    }
    // 风牌和箭牌都是幺牌
    if (card.type === 'wind' || card.type === 'arrow') {
        return true;
    }
    return false;
}

/**
 * 检查浪牌胡法
 * 数字牌按间隔组合（1-4-7、2-5-8、1-5-9等）
 * 风箭牌不重复（各最多1张）
 * 花色限制：筒子≤3张、万子≤3张、条子≤3张
 * 万能牌可以分配到任意花色，但分配后花色总数不得超过3张
 */
function isLangPaiHu(cards, wildCard) {
    if (cards.length !== 14) return false;

    const { normal, wildCount } = analyzeHand(cards, wildCard);

    // 统计各花色数量和具体牌面
    const suitCounts = { '筒': 0, '条': 0, '万': 0 };
    const windArrowSet = new Set();

    for (const card of normal) {
        if (card.type === 'number') {
            suitCounts[card.suit]++;
        } else if (card.type === 'wind') {
            const key = `风_${card.rank}`;
            if (windArrowSet.has(key)) return false;
            windArrowSet.add(key);
        } else if (card.type === 'arrow') {
            const key = `箭_${card.rank}`;
            if (windArrowSet.has(key)) return false;
            windArrowSet.add(key);
        }
    }

    // 花色限制：非万能牌每花色≤3张
    for (const suit of ['筒', '条', '万']) {
        if (suitCounts[suit] > 3) return false;
    }

    // 检查非万能数字牌是否符合浪牌间隔规则
    const bySuit = {};
    const numberCards = normal.filter(c => c.type === 'number');
    for (const card of numberCards) {
        if (!bySuit[card.suit]) bySuit[card.suit] = [];
        bySuit[card.suit].push(card.rank);
    }
    for (const [suit, ranks] of Object.entries(bySuit)) {
        if (!isLangGroup(ranks)) return false;
    }

    // 枚举癞子分配：每张癞子可分配到数字牌花色或风箭牌
    // 递归尝试所有可能的分配方式
    const wildSlots = []; // 可分配的位置
    for (const suit of ['筒', '条', '万']) {
        if (suitCounts[suit] < 3) wildSlots.push({ type: 'number', suit });
    }
    const windArrowTypes = ['风_东', '风_南', '风_西', '风_北', '箭_中', '箭_发', '箭_白'];
    for (const wa of windArrowTypes) {
        if (!windArrowSet.has(wa)) wildSlots.push({ type: 'windArrow', key: wa });
    }

    if (wildCount === 0) {
        return normal.length === 14;
    }

    // 递归枚举：wildIndex 张癞子，分配到 wildSlots 中不同位置
    // 癞子分配到数字牌时需要验证补位后间隔合规
    return tryLangWildAssign(bySuit, suitCounts, windArrowSet, wildSlots, wildCount, 0);
}

/**
 * 递归枚举癞子在浪牌中的分配方式
 */
function tryLangWildAssign(bySuit, suitCounts, windArrowSet, wildSlots, remaining, startIdx) {
    if (remaining === 0) {
        // 所有癞子分配完毕，验证数字牌间隔
        for (const [suit, ranks] of Object.entries(bySuit)) {
            if (ranks.length > 3) return false;
            if (!isLangGroup(ranks)) return false;
        }
        return true;
    }

    // 剩余空位不够分配
    if (startIdx >= wildSlots.length) return false;
    if (wildSlots.length - startIdx < remaining) return false;

    for (let i = startIdx; i < wildSlots.length; i++) {
        const slot = wildSlots[i];
        if (slot.type === 'number') {
            const suit = slot.suit;
            if (suitCounts[suit] >= 3) continue; // 花色已满
            // 枚举该花色可补的牌面（1-9），补后间隔必须合规
            const existing = bySuit[suit] || [];
            for (let rank = 1; rank <= 9; rank++) {
                if (existing.includes(rank)) continue; // 已有此牌面（浪牌不重复数字？允许，因为可能是同花色不同间隔）
                const testRanks = [...existing, rank].sort((a, b) => a - b);
                if (testRanks.length > 3) continue;
                if (!isLangGroup(testRanks)) continue;
                // 分配成功，递归
                const newBySuit = { ...bySuit };
                newBySuit[suit] = [...existing, rank];
                const newSuitCounts = { ...suitCounts };
                newSuitCounts[suit]++;
                if (tryLangWildAssign(newBySuit, newSuitCounts, windArrowSet, wildSlots, remaining - 1, i + 1)) {
                    return true;
                }
            }
        } else {
            // 分配到风箭牌空位
            if (tryLangWildAssign(bySuit, suitCounts, windArrowSet, wildSlots, remaining - 1, i + 1)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * 检查一组数字牌是否符合浪牌间隔规则
 * 规则：同一花色任意两张牌之间相差至少3（不要求差是3的倍数）
 * 有效组合：1-4-7、2-5-8、1-4-9、1-5-9 等
 * 每种花色最多3张
 */
function isLangGroup(ranks) {
    if (ranks.length === 0) return true;
    if (ranks.length > 3) return false;

    // 任意两张牌之间相差至少3
    const sorted = [...ranks].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] < 3) return false;
    }
    return true;
}

/**
 * 检查常规胡法：4组（顺子/刻子/杠）+ 1对将
 * 含万能牌替代
 */
function isNormalHu(cards, wildCard) {
    if (cards.length !== 14) return false;

    const { normal, wildCount } = analyzeHand(cards, wildCard);
    const counts = countCards(normal);

    // 尝试所有可能的将牌（对子），递归检查剩余牌能否组成合法组合
    const allKeys = Object.keys(counts);

    // 先尝试用非万能牌做将
    for (const key of allKeys) {
        if (counts[key] >= 2) {
            const newCounts = { ...counts };
            newCounts[key] -= 2;
            if (newCounts[key] === 0) delete newCounts[key];
            if (canFormSets(newCounts, wildCount, 4)) return true;
        }
    }

    // 尝试用万能牌做将（2张万能牌当一对）
    if (wildCount >= 2) {
        if (canFormSets(counts, wildCount - 2, 4)) return true;
    }

    // 1张万能牌+1张普通牌做将
    if (wildCount >= 1) {
        for (const key of allKeys) {
            if (counts[key] >= 1) {
                const newCounts = { ...counts };
                newCounts[key] -= 1;
                if (newCounts[key] === 0) delete newCounts[key];
                if (canFormSets(newCounts, wildCount - 1, 4)) return true;
            }
        }
    }

    return false;
}

/**
 * 递归检查剩余牌是否能组成指定数量的合法组合（顺子/刻子）
 * @param {Object} counts - 剩余牌计数 { key: count }
 * @param {number} wildCount - 剩余万能牌数量
 * @param {number} setsNeeded - 需要的组合数
 */
function canFormSets(counts, wildCount, setsNeeded) {
    if (setsNeeded === 0) {
        // 所有组合已形成，检查是否还有剩余牌
        const remaining = Object.values(counts).reduce((s, c) => s + c, 0);
        return remaining === 0 && wildCount === 0;
    }

    const keys = Object.keys(counts);
    if (keys.length === 0) {
        // 没有普通牌了，万能牌需要凑成set（3张万能=1个刻子）
        return wildCount >= setsNeeded * 3;
    }

    // 对keys排序：数字牌按花色和rank排序，确保低rank先处理（避免8/9无法作为顺子尾部）
    keys.sort((a, b) => {
        const pa = parseKey(a);
        const pb = parseKey(b);
        if (pa && pb) {
            if (pa.suit !== pb.suit) return pa.suit.localeCompare(pb.suit);
            return (pa.rank || 0) - (pb.rank || 0);
        }
        return 0;
    });

    const key = keys[0];
    const count = counts[key];

    // 尝试组成刻子（3张相同）
    if (count >= 3) {
        const newCounts = { ...counts };
        newCounts[key] -= 3;
        if (newCounts[key] === 0) delete newCounts[key];
        if (canFormSets(newCounts, wildCount, setsNeeded - 1)) return true;
    }

    // 尝试用万能牌补刻子（2普通+1万能）
    if (count >= 2 && wildCount >= 1) {
        const newCounts = { ...counts };
        newCounts[key] -= 2;
        if (newCounts[key] === 0) delete newCounts[key];
        if (canFormSets(newCounts, wildCount - 1, setsNeeded - 1)) return true;
    }

    // 尝试用万能牌补刻子（1普通+2万能）
    if (count >= 1 && wildCount >= 2) {
        const newCounts = { ...counts };
        newCounts[key] -= 1;
        if (newCounts[key] === 0) delete newCounts[key];
        if (canFormSets(newCounts, wildCount - 2, setsNeeded - 1)) return true;
    }

    // 尝试顺子（需要解析key获取suit和rank）
    const parsed = parseKey(key);
    if (parsed && parsed.type === 'number') {
        const suit = parsed.suit;
        const rank = parsed.rank;

        // 辅助函数：尝试从当前牌以指定偏移组成顺子
        function tryShunzi(offsets, useWild) {
            // offsets: [0, 1, 2] 表示 rank, rank+1, rank+2 等
            // useWild: 用癞子补的偏移位置
            const keys = offsets.map(o => `${suit}_${rank + o}`);
            const cs = keys.map(k => counts[k] || 0);
            // 检查非癞子补的位置是否有牌
            for (let i = 0; i < 3; i++) {
                if (i !== useWild && cs[i] <= 0) return false;
            }
            if (useWild >= 0 && wildCount < 1) return false;
            return true;
        }

        function doShunzi(offsets, useWildCount) {
            const newCounts = { ...counts };
            let wc = wildCount;
            for (const o of offsets) {
                const k = `${suit}_${rank + o}`;
                if (newCounts[k] && newCounts[k] > 0) {
                    newCounts[k]--;
                    if (newCounts[k] === 0) delete newCounts[k];
                } else {
                    wc--;
                }
            }
            return canFormSets(newCounts, wc, setsNeeded - 1);
        }

        // 枚举所有可能的顺子：当前牌在顺子中的位置
        // 当前牌在位置0: rank, rank+1, rank+2 (需要 rank <= 7)
        // 当前牌在位置1: rank-1, rank, rank+1 (需要 rank >= 2 && rank <= 8)
        // 当前牌在位置2: rank-2, rank-1, rank (需要 rank >= 3)
        const shunziConfigs = [];
        if (rank <= 7) shunziConfigs.push([0, 1, 2]);
        if (rank >= 2 && rank <= 8) shunziConfigs.push([-1, 0, 1]);
        if (rank >= 3) shunziConfigs.push([-2, -1, 0]);

        for (const offsets of shunziConfigs) {
            const keys = offsets.map(o => `${suit}_${rank + o}`);
            const cs = keys.map(k => counts[k] || 0);
            const missing = cs.filter(c => c <= 0).length;

            if (missing === 0) {
                // 三张都有
                const newCounts = { ...counts };
                for (const k of keys) {
                    newCounts[k]--;
                    if (newCounts[k] === 0) delete newCounts[k];
                }
                if (canFormSets(newCounts, wildCount, setsNeeded - 1)) return true;
            } else if (missing === 1 && wildCount >= 1) {
                // 缺1张，用1张癞子补
                const newCounts = { ...counts };
                let wc = wildCount;
                for (const k of keys) {
                    if (newCounts[k] && newCounts[k] > 0) {
                        newCounts[k]--;
                        if (newCounts[k] === 0) delete newCounts[k];
                    } else {
                        wc--;
                    }
                }
                if (canFormSets(newCounts, wc, setsNeeded - 1)) return true;
            } else if (missing === 2 && wildCount >= 2) {
                // 缺2张，用2张癞子补
                const newCounts = { ...counts };
                let wc = wildCount;
                for (const k of keys) {
                    if (newCounts[k] && newCounts[k] > 0) {
                        newCounts[k]--;
                        if (newCounts[k] === 0) delete newCounts[k];
                    } else {
                        wc--;
                    }
                }
                if (canFormSets(newCounts, wc, setsNeeded - 1)) return true;
            }
        }
    }

    // 如果当前牌无法组成任何合法组合，尝试用万能牌帮忙
    // 万能牌3张=1个刻子
    if (count === 1 && wildCount >= 2) {
        const newCounts = { ...counts };
        delete newCounts[key];
        if (canFormSets(newCounts, wildCount - 2, setsNeeded - 1)) return true;
    }

    // 无法组成，回溯失败
    return false;
}

/**
 * 解析牌key
 */
function parseKey(key) {
    const parts = key.split('_');
    const suit = parts[0];
    const rankStr = parts[1];

    if (['筒', '条', '万'].includes(suit)) {
        return { type: 'number', suit, rank: parseInt(rankStr) };
    } else if (suit === '风') {
        return { type: 'wind', suit, rank: rankStr };
    } else if (suit === '箭') {
        return { type: 'arrow', suit, rank: rankStr };
    }
    return null;
}

/**
 * 计算胡牌得分
 * 得分 = 1(基础分) + "发"数量 × 1 + 暗杠数量 × 2
 */
function calculateScore(showedCards) {
    let score = 1; // 基础分
    if (showedCards) {
        // 每个"发"加1分
        score += (showedCards.fa || []).length;
        // 每个暗杠加2分
        score += (showedCards.gang || []).length * 2;
    }
    return score;
}

/**
 * 将胡牌手牌按牌型分组排序，用于展示
 * 返回分组的二维数组，每组是顺子/刻子/将牌
 */
function groupHuCards(hand, wildCard) {
    if (!hand || hand.length < 14) return [hand || []];
    const cards = hand.slice(0, 14);

    // 处理红中替换枚举
    let bestGroups = null;
    let zhongCount = 0;
    for (const card of cards) {
        if (isZhong(card)) zhongCount++;
    }

    const tryCards = (testCards) => {
        // 尝试七对
        const g = tryGroupQiDui(testCards, wildCard);
        if (g) return g;
        // 尝试常规胡分组
        const g2 = tryGroupNormal(testCards, wildCard);
        if (g2) return g2;
        // 幺牌/浪牌：按花色排序展示
        return sortBySuit(testCards);
    };

    if (zhongCount === 0) {
        return tryCards(cards);
    }

    // 枚举红中替换
    for (let asWild = 0; asWild <= zhongCount; asWild++) {
        const virtualCards = [];
        let za = 0;
        for (const card of cards) {
            if (isZhong(card)) {
                za++;
                if (za <= asWild && wildCard) {
                    virtualCards.push({ ...wildCard, _replacedByZhong: true, _originalId: card.id, _originalRank: '中' });
                } else {
                    virtualCards.push(card);
                }
            } else {
                virtualCards.push(card);
            }
        }
        const result = tryCards(virtualCards);
        if (result) return result;
    }
    return sortBySuit(cards);
}

/**
 * 尝试七对分组
 */
function tryGroupQiDui(cards, wildCard) {
    const { normal, wildCount } = analyzeHand(cards, wildCard);
    const counts = countCards(normal);
    let pairs = 0, singles = 0;
    for (const count of Object.values(counts)) {
        pairs += Math.floor(count / 2);
        singles += count % 2;
    }
    if (wildCount >= singles && pairs + Math.min(wildCount, singles) >= 7 &&
        (pairs * 2 + singles + wildCount) === 14) {
        // 是七对：按对子分组
        const groups = [];
        const used = new Set();
        for (const [key, count] of Object.entries(counts)) {
            const p = parseKey(key);
            if (!p) continue;
            const pairCount = Math.floor(count / 2);
            for (let i = 0; i < pairCount; i++) {
                groups.push(cards.filter(c => !used.has(c.id) && cardKey(c) === key).slice(0, 2));
                cards.filter(c => !used.has(c.id) && cardKey(c) === key).slice(0, 2).forEach(c => used.add(c.id));
            }
            if (count % 2 === 1) {
                // 单张配癞子
                const remaining = cards.filter(c => !used.has(c.id) && cardKey(c) === key);
                if (remaining.length > 0) {
                    // 找一张癞子
                    const wildCard2 = cards.find(c => !used.has(c.id) && isWild(c, wildCard));
                    if (wildCard2) {
                        groups.push([remaining[0], wildCard2]);
                        used.add(remaining[0].id);
                        used.add(wildCard2.id);
                    }
                }
            }
        }
        // 剩余癞子自组对
        const remainingWilds = cards.filter(c => !used.has(c.id) && isWild(c, wildCard));
        while (remainingWilds.length >= 2) {
            groups.push([remainingWilds.shift(), remainingWilds.shift()]);
        }
        return groups.length === 7 ? groups : null;
    }
    return null;
}

/**
 * 尝试常规胡分组（面子+将牌）
 */
function tryGroupNormal(cards, wildCard) {
    const { normal, wildCount } = analyzeHand(cards, wildCard);
    const counts = countCards(normal);
    const allKeys = Object.keys(counts);

    // 尝试用非万能牌做将
    for (const key of allKeys) {
        if (counts[key] >= 2) {
            const newCounts = { ...counts };
            newCounts[key] -= 2;
            if (newCounts[key] === 0) delete newCounts[key];
            const sets = tryFormSetsDetailed(newCounts, wildCount, 4);
            if (sets) {
                const jiang = getCardsByKey(cards, key, 2, wildCard);
                return [...sets, jiang];
            }
        }
    }
    // 用万能牌做将
    if (wildCount >= 2) {
        const sets = tryFormSetsDetailed(counts, wildCount - 2, 4);
        if (sets) {
            const wilds = cards.filter(c => isWild(c, wildCard)).slice(0, 2);
            return [...sets, wilds];
        }
    }
    // 1张万能+1张普通
    if (wildCount >= 1) {
        for (const key of allKeys) {
            if (counts[key] >= 1) {
                const newCounts = { ...counts };
                newCounts[key] -= 1;
                if (newCounts[key] === 0) delete newCounts[key];
                const sets = tryFormSetsDetailed(newCounts, wildCount - 1, 4);
                if (sets) {
                    const oneCard = getCardsByKey(cards, key, 1, wildCard);
                    const wild = cards.find(c => isWild(c, wildCard) && !oneCard.includes(c));
                    return [...sets, [...oneCard, wild]];
                }
            }
        }
    }
    return null;
}

/**
 * 递归拆分面子，返回具体牌的二维数组
 */
function tryFormSetsDetailed(counts, wildCount, setsNeeded) {
    if (setsNeeded === 0) {
        const remaining = Object.values(counts).reduce((s, c) => s + c, 0);
        if (remaining === 0 && wildCount === 0) return [];
        return null;
    }

    const keys = Object.keys(counts);
    if (keys.length === 0) {
        if (wildCount >= setsNeeded * 3) {
            // 全用癞子凑，返回空占位
            const result = [];
            for (let i = 0; i < setsNeeded; i++) result.push([]);
            return result;
        }
        return null;
    }

    const key = keys[0];
    const count = counts[key];
    const parsed = parseKey(key);

    // 尝试刻子
    if (count >= 3) {
        const nc = { ...counts };
        nc[key] -= 3;
        if (nc[key] === 0) delete nc[key];
        const sub = tryFormSetsDetailed(nc, wildCount, setsNeeded - 1);
        if (sub) return [getCardsByKeyGlobal(key, 3), ...sub];
    }

    // 2张+1癞子=刻子
    if (count >= 2 && wildCount >= 1) {
        const nc = { ...counts };
        nc[key] -= 2;
        if (nc[key] === 0) delete nc[key];
        const sub = tryFormSetsDetailed(nc, wildCount - 1, setsNeeded - 1);
        if (sub) return [getCardsByKeyGlobal(key, 2), ...sub];
    }

    // 1张+2癞子=刻子
    if (count >= 1 && wildCount >= 2) {
        const nc = { ...counts };
        delete nc[key];
        const sub = tryFormSetsDetailed(nc, wildCount - 2, setsNeeded - 1);
        if (sub) return [getCardsByKeyGlobal(key, 1), ...sub];
    }

    // 顺子（数字牌）
    if (parsed && parsed.type === 'number') {
        const suit = parsed.suit;
        const rank = parsed.rank;
        // 当前牌在顺子的3个位置
        const positions = [
            [rank, rank + 1, rank + 2],
            [rank - 1, rank, rank + 1],
            [rank - 2, rank - 1, rank]
        ];
        for (const pos of positions) {
            if (pos.some(r => r < 1 || r > 9)) continue;
            const sKeys = pos.map(r => `${suit}_${r}`);
            // 检查是否有足够的牌
            let missing = 0;
            const nc = { ...counts };
            for (const sk of sKeys) {
                if (nc[sk] && nc[sk] > 0) {
                    nc[sk]--;
                    if (nc[sk] === 0) delete nc[sk];
                } else {
                    missing++;
                }
            }
            if (missing <= wildCount) {
                const sub = tryFormSetsDetailed(nc, wildCount - missing, setsNeeded - 1);
                if (sub) {
                    const setCards = sKeys.map(sk => getCardsByKeyGlobal(sk, 1)[0]).filter(Boolean);
                    return [setCards, ...sub];
                }
            }
        }
    }

    // 3张癞子=1刻子
    if (count === 1 && wildCount >= 2) {
        const nc = { ...counts };
        delete nc[key];
        const sub = tryFormSetsDetailed(nc, wildCount - 2, setsNeeded - 1);
        if (sub) return [getCardsByKeyGlobal(key, 1), ...sub];
    }

    return null;
}

/**
 * 辅助：从全局牌池取N张指定key的牌
 */
let _groupCardsPool = [];
function getCardsByKeyGlobal(key, n) {
    const result = [];
    for (const c of _groupCardsPool) {
        if (result.length >= n) break;
        if (cardKey(c) === key) result.push(c);
    }
    return result;
}

/**
 * 辅助：从cards中取N张指定key的牌
 */
function getCardsByKey(cards, key, n, wildCard) {
    const result = [];
    for (const c of cards) {
        if (result.length >= n) break;
        if (cardKey(c) === key) result.push(c);
    }
    // 不够的话用癞子补
    while (result.length < n) {
        const w = cards.find(c => isWild(c, wildCard) && !result.includes(c));
        if (w) result.push(w);
        else break;
    }
    return result;
}

/**
 * 按花色排序
 */
function sortBySuit(cards) {
    const suitOrder = { '筒': 1, '条': 2, '万': 3, '风': 4, '箭': 5 };
    const sorted = [...cards].sort((a, b) => {
        const sa = suitOrder[a.suit] || 9;
        const sb = suitOrder[b.suit] || 9;
        if (sa !== sb) return sa - sb;
        const ra = typeof a.rank === 'number' ? a.rank : 0;
        const rb = typeof b.rank === 'number' ? b.rank : 0;
        return ra - rb;
    });
    return [sorted];
}

// 导出
module.exports = { GameTable, createDeck, shuffle, canHu, calculateScore, groupHuCards };
