/**
 * 掼蛋游戏 - AI 玩家自动化测试
 * 模拟 4 个 AI 玩家进行完整游戏测试
 * 运行: node ai-players-test.js
 */

const WebSocket = require('ws');

const SERVER_URL = 'ws://localhost:8081';

// ==================== AI 玩家类 ====================
class AIPlayer {
    constructor(name, seatNum = null) {
        this.name = name;
        this.seatNum = seatNum;
        this.ws = null;
        this.playerId = null;
        this.roomId = null;
        this.myHand = [];
        this.myInfo = null;
        this.gameState = null;
        this.logs = [];
    }

    log(msg) {
        const time = new Date().toLocaleTimeString();
        const logMsg = `[${time}] 🤖 ${this.name}: ${msg}`;
        this.logs.push(logMsg);
        console.log(logMsg);
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(SERVER_URL);

            this.ws.on('open', () => {
                this.log('已连接到服务器');
                resolve();
            });

            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data.toString()));
            });

            this.ws.on('error', (err) => {
                this.log(`连接错误: ${err.message}`);
                reject(err);
            });

            this.ws.on('close', () => {
                this.log('连接已关闭');
            });
        });
    }

    handleMessage(msg) {
        switch (msg.type) {
            case 'roomList':
                this.log(`收到房间列表: ${msg.rooms.length} 个房间`);
                break;

            case 'roomCreated':
                this.playerId = msg.playerId;
                this.roomId = msg.roomId;
                this.log(`创建房间成功: ${this.roomId}`);
                break;

            case 'roomJoined':
                this.playerId = msg.playerId;
                this.roomId = msg.roomId;
                this.log(`加入房间成功: ${this.roomId}`);
                break;

            case 'playerList':
                this.log(`房间玩家: ${msg.players.map(p => `${p.name}(座位${p.playerNum})`).join(', ')}`);
                break;

            case 'gameStart':
            case 'newRound':
                this.gameState = msg.gameState;
                this.myHand = msg.gameState.myHand || [];
                this.myInfo = msg.gameState.myInfo;
                this.log(`游戏开始! 手牌: ${this.myHand.length} 张`);
                this.checkMyTurn();
                break;

            case 'gameState':
                this.gameState = msg.gameState;
                this.myHand = msg.gameState.myHand || [];
                this.checkMyTurn();
                break;

            case 'playerFinished':
                this.log(`🏆 ${msg.playerName} 第 ${msg.rank} 名出完牌!`);
                break;

            case 'roundEnd':
                this.log(`回合结束! 队伍${msg.winner}获胜, 升级 ${msg.levelUp} 级`);
                // 自动开始下一局
                setTimeout(() => {
                    this.send({ type: 'newRound', playerId: this.playerId });
                }, 2000);
                break;

            case 'gameOver':
                this.log(`🎮 游戏结束! 队伍${msg.winner}最终获胜!`);
                break;

            case 'playError':
                this.log(`❌ 出牌错误: ${msg.message}`);
                // 如果出牌失败，尝试过牌
                if (msg.message !== '你必须出牌') {
                    setTimeout(() => this.pass(), 500);
                }
                break;

            case 'chat':
                // this.log(`💬 ${msg.playerName}: ${msg.message}`);
                break;

            case 'error':
                this.log(`❌ 错误: ${msg.message}`);
                break;
        }
    }

    send(msg) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    createRoom() {
        this.log('正在创建房间...');
        this.send({ type: 'createRoom', playerName: this.name });
    }

    joinRoom(roomId) {
        this.log(`正在加入房间 ${roomId}...`);
        const msg = { type: 'joinRoom', roomId, playerName: this.name };
        if (this.seatNum) msg.seatNum = this.seatNum;
        this.send(msg);
    }

    setReady(ready = true) {
        this.log(ready ? '准备!' : '取消准备');
        this.send({ type: 'ready', playerId: this.playerId, ready });
    }

    checkMyTurn() {
        if (!this.gameState || !this.myInfo) return;

        const playerIds = Object.keys(this.gameState.playerInfo);
        const currentTurn = this.gameState.currentPlayer;
        const currentPlayerId = playerIds[currentTurn];

        if (currentPlayerId === this.playerId) {
            this.log(`轮到我出牌!`);
            setTimeout(() => this.makeDecision(), 1000);
        }
    }

    // ==================== AI 决策逻辑 ====================
    makeDecision() {
        if (!this.myHand || this.myHand.length === 0) return;

        const lastPlay = this.gameState?.lastPlay;
        const isMyLead = !lastPlay || this.gameState.lastPlayer === this.playerId;

        if (isMyLead) {
            // 我先出牌 - 出最小的单张
            this.playSmallestCard();
        } else {
            // 需要压过上家
            const validPlay = this.findValidPlay(lastPlay);
            if (validPlay) {
                this.playCards(validPlay);
            } else {
                this.pass();
            }
        }
    }

    // 找出能压过上家的牌
    findValidPlay(lastPlay) {
        if (!lastPlay) return [this.myHand[this.myHand.length - 1]];

        const type = lastPlay.type;
        const value = lastPlay.value;

        // 根据上家牌型找能压的牌
        switch (type) {
            case 'single':
                for (let i = this.myHand.length - 1; i >= 0; i--) {
                    if (this.myHand[i].value > value) {
                        return [this.myHand[i]];
                    }
                }
                break;

            case 'pair':
                const pairs = this.findPairs();
                for (const pair of pairs) {
                    if (pair[0].value > value) {
                        return pair;
                    }
                }
                break;

            case 'triple':
                const triples = this.findTriples();
                for (const triple of triples) {
                    if (triple[0].value > value) {
                        return triple;
                    }
                }
                break;

            case 'bomb':
                const bombs = this.findBombs();
                for (const bomb of bombs) {
                    if (bomb.length > lastPlay.length || (bomb.length === lastPlay.length && bomb[0].value > value)) {
                        return bomb;
                    }
                }
                break;
        }

        // 尝试用炸弹压
        if (type !== 'bomb' && type !== 'rocket') {
            const bombs = this.findBombs();
            if (bombs.length > 0) {
                return bombs[0];
            }
        }

        return null;
    }

    findPairs() {
        const pairs = [];
        const counts = {};
        this.myHand.forEach(card => {
            const key = card.value;
            if (!counts[key]) counts[key] = [];
            counts[key].push(card);
        });
        Object.values(counts).forEach(cards => {
            if (cards.length >= 2) {
                pairs.push(cards.slice(0, 2));
            }
        });
        return pairs.sort((a, b) => a[0].value - b[0].value);
    }

    findTriples() {
        const triples = [];
        const counts = {};
        this.myHand.forEach(card => {
            const key = card.value;
            if (!counts[key]) counts[key] = [];
            counts[key].push(card);
        });
        Object.values(counts).forEach(cards => {
            if (cards.length >= 3) {
                triples.push(cards.slice(0, 3));
            }
        });
        return triples.sort((a, b) => a[0].value - b[0].value);
    }

    findBombs() {
        const bombs = [];
        const counts = {};
        this.myHand.forEach(card => {
            const key = card.value;
            if (!counts[key]) counts[key] = [];
            counts[key].push(card);
        });
        Object.values(counts).forEach(cards => {
            if (cards.length >= 4) {
                bombs.push(cards);
            }
        });

        // 检查王炸
        const jokers = this.myHand.filter(c => c.isJoker);
        const bigJokers = jokers.filter(c => c.rank === '大王');
        const smallJokers = jokers.filter(c => c.rank === '小王');
        if (bigJokers.length === 2 && smallJokers.length === 2) {
            bombs.push([...bigJokers, ...smallJokers]);
        }

        return bombs.sort((a, b) => a.length - b.length || a[0].value - b[0].value);
    }

    // 出最小的牌
    playSmallestCard() {
        if (this.myHand.length === 0) return;

        // 尝试出对子
        const pairs = this.findPairs();
        if (pairs.length > 0 && Math.random() > 0.5) {
            this.playCards(pairs[0]);
            return;
        }

        // 尝试出三张
        const triples = this.findTriples();
        if (triples.length > 0 && Math.random() > 0.7) {
            this.playCards(triples[0]);
            return;
        }

        // 出最小单张
        const smallestCard = this.myHand[this.myHand.length - 1];
        this.playCards([smallestCard]);
    }

    playCards(cards) {
        const cardStr = cards.map(c => `${c.suit}${c.rank}`).join(' ');
        this.log(`出牌: ${cardStr}`);
        this.send({ type: 'play', playerId: this.playerId, cards });
    }

    pass() {
        this.log('不出 (过)');
        this.send({ type: 'pass', playerId: this.playerId });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// ==================== 游戏测试流程 ====================
async function runGameTest() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     🤖 掼蛋 AI 玩家自动化测试 🤖              ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('\n');

    // 创建 4 个 AI 玩家
    const players = [
        new AIPlayer('🤖 AI-小红', 1),
        new AIPlayer('🤖 AI-小蓝', 2),
        new AIPlayer('🤖 AI-大红', 3),
        new AIPlayer('🤖 AI-大蓝', 4)
    ];

    try {
        // 1. 连接所有玩家
        console.log('📡 步骤 1: 连接所有 AI 玩家...');
        await Promise.all(players.map(p => p.connect()));
        console.log('✅ 所有玩家已连接\n');

        await sleep(500);

        // 2. 创建房间
        console.log('🏠 步骤 2: 创建房间...');
        players[0].createRoom();
        await sleep(1000);

        // 3. 其他玩家加入
        console.log('🚪 步骤 3: 其他玩家加入房间...');
        const roomId = players[0].roomId;
        for (let i = 1; i < players.length; i++) {
            players[i].joinRoom(roomId);
            await sleep(500);
        }

        // 4. 等待所有玩家准备
        console.log('⏳ 步骤 4: 所有玩家准备...');
        await sleep(1000);
        players.forEach(p => p.setReady(true));

        console.log('\n🎮 游戏开始! AI 玩家正在自动对战中...\n');
        console.log('='.repeat(50));

        // 游戏会自动进行，保持运行
        // 10 分钟后自动结束测试
        setTimeout(() => {
            console.log('\n⏰ 测试时间到达，结束测试...');
            players.forEach(p => p.disconnect());
            process.exit(0);
        }, 10 * 60 * 1000);

    } catch (err) {
        console.error('❌ 测试失败:', err.message);
        players.forEach(p => p.disconnect());
        process.exit(1);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
runGameTest();
