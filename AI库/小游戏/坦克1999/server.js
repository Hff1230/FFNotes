// WebSocket服务器 - 坦克大战局域网版
// 运行方式: node server.js

const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

// 游戏房间管理
const rooms = new Map();
const playerToRoom = new Map();

// 房间类
class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.gameState = {
            started: false,
            map: null,
            tanks: [],
            bullets: [],
            powerUps: [],
            particles: [],
            enemies: [],
            level: 1,
            enemiesRemaining: 20
        };
        this.maxPlayers = 4;
        this.lastUpdate = Date.now();
    }

    addPlayer(ws, playerId, playerName) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }

        const playerNum = this.players.size + 1;
        this.players.set(playerId, {
            ws,
            id: playerId,
            name: playerName,
            playerNum,
            tank: null,
            score: 0,
            lives: 3,
            ready: false
        });

        return true;
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player && player.tank) {
            // 移除玩家的坦克
            this.gameState.tanks = this.gameState.tanks.filter(t => t.owner !== playerId);
        }
        this.players.delete(playerId);

        // 如果房间为空，删除房间
        if (this.players.size === 0) {
            return true; // 房间应被删除
        }
        return false;
    }

    setPlayerReady(playerId, ready) {
        const player = this.players.get(playerId);
        if (player) {
            player.ready = ready;
            this.checkStartGame();
        }
    }

    checkStartGame() {
        // 检查是否所有玩家都准备好了
        const allReady = Array.from(this.players.values()).every(p => p.ready);
        const minPlayers = 2;

        if (allReady && this.players.size >= minPlayers && !this.gameState.started) {
            this.startGame();
        }
    }

    startGame() {
        this.gameState.started = true;
        this.gameState.level = 1;
        this.gameState.enemiesRemaining = 20;

        // 生成地图
        this.gameState.map = this.generateMap(this.gameState.level);

        // 初始化玩家坦克
        this.gameState.tanks = [];
        const spawnPoints = [
            {x: 4, y: 11},
            {x: 8, y: 11},
            {x: 2, y: 10},
            {x: 10, y: 10}
        ];

        let spawnIndex = 0;
        for (let [id, player] of this.players) {
            const spawn = spawnPoints[spawnIndex % spawnPoints.length];
            player.tank = {
                x: spawn.x * 40 + 20,
                y: spawn.y * 40 + 20,
                direction: 0,
                owner: id,
                playerNum: player.playerNum,
                hp: 1,
                active: true,
                shield: true,
                shieldTime: 180,
                powerLevel: 1
            };
            this.gameState.tanks.push(player.tank);
            spawnIndex++;
        }

        // 初始化敌人
        this.spawnEnemies();

        // 广播游戏开始
        this.broadcast({
            type: 'gameStart',
            gameState: this.gameState
        });

        // 开始游戏循环
        this.gameLoop();
    }

    generateMap(level) {
        const TILE_SIZE = 40;
        const MAP_SIZE = 13;

        const TILE = {
            EMPTY: 0,
            BRICK: 1,
            STEEL: 2,
            GRASS: 3,
            WATER: 4,
            BASE: 5
        };

        let map = Array(MAP_SIZE).fill(null).map(() => Array(MAP_SIZE).fill(TILE.EMPTY));

        // 基地
        const bx = 6, by = 12;
        map[by][bx] = TILE.BASE;
        map[by][bx-1] = TILE.BRICK;
        map[by][bx+1] = TILE.BRICK;
        map[by-1][bx-1] = TILE.BRICK;
        map[by-1][bx] = TILE.BRICK;
        map[by-1][bx+1] = TILE.BRICK;

        // 根据关卡生成地形
        for (let y = 2; y < 9; y++) {
            for (let x = 2; x < 11; x++) {
                if (Math.random() < 0.4 + level * 0.05) {
                    const r = Math.random();
                    if (r < 0.6) {
                        map[y][x] = TILE.BRICK;
                    } else if (r < 0.75) {
                        map[y][x] = TILE.STEEL;
                    } else if (r < 0.85) {
                        map[y][x] = TILE.WATER;
                    } else {
                        map[y][x] = TILE.GRASS;
                    }
                }
            }
        }

        return map;
    }

    spawnEnemies() {
        this.gameState.enemies = [];
        const spawnPoints = [
            {x: 0, y: 0},
            {x: 260, y: 0},
            {x: 520, y: 0}
        ];

        for (let i = 0; i < 4; i++) {
            const spawn = spawnPoints[i % 3];
            const types = [1, 1, 1, 2, 2, 3, 4];
            const type = types[Math.floor(Math.random() * types.length)];

            this.gameState.enemies.push({
                x: spawn.x,
                y: spawn.y,
                direction: 2,
                type: type,
                hp: type === 3 ? 2 : 1,
                speed: type === 2 ? 2.5 : (type === 3 ? 1 : (type === 4 ? 2 : 1.5)),
                active: true,
                moveTimer: 0,
                shootTimer: 0
            });
        }
    }

    gameLoop() {
        if (!this.gameState.started) return;

        const now = Date.now();
        const dt = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // 更新游戏状态
        this.update(dt);

        // 广播状态
        this.broadcast({
            type: 'gameState',
            gameState: this.gameState
        });

        // 继续循环
        setTimeout(() => this.gameLoop(), 1000 / 60);
    }

    update(dt) {
        // 更新坦克
        this.gameState.tanks.forEach(tank => {
            if (!tank.active) return;

            // 更新护盾
            if (tank.shield) {
                tank.shieldTime--;
                if (tank.shieldTime <= 0) {
                    tank.shield = false;
                }
            }
        });

        // 更新敌人AI
        this.gameState.enemies.forEach(enemy => {
            if (!enemy.active) return;

            enemy.moveTimer++;
            enemy.shootTimer++;

            // AI移动
            if (enemy.moveTimer > 30) {
                enemy.moveTimer = 0;
                if (Math.random() < 0.3) {
                    enemy.direction = Math.floor(Math.random() * 4);
                }
            }

            const speed = enemy.speed;
            switch(enemy.direction) {
                case 0: enemy.y -= speed; break;
                case 1: enemy.x += speed; break;
                case 2: enemy.y += speed; break;
                case 3: enemy.x -= speed; break;
            }

            // 边界检测
            enemy.x = Math.max(20, Math.min(500, enemy.x));
            enemy.y = Math.max(20, Math.min(500, enemy.y));

            // AI射击
            if (enemy.shootTimer > 90) {
                enemy.shootTimer = 0;
                if (Math.random() < 0.5) {
                    this.gameState.bullets.push({
                        x: enemy.x,
                        y: enemy.y,
                        direction: enemy.direction,
                        owner: 'enemy',
                        speed: 3,
                        active: true
                    });
                }
            }
        });

        // 更新子弹
        this.gameState.bullets = this.gameState.bullets.filter(bullet => {
            if (!bullet.active) return false;

            switch(bullet.direction) {
                case 0: bullet.y -= bullet.speed; break;
                case 1: bullet.x += bullet.speed; break;
                case 2: bullet.y += bullet.speed; break;
                case 3: bullet.x -= bullet.speed; break;
            }

            // 边界检测
            if (bullet.x < 0 || bullet.x > 520 || bullet.y < 0 || bullet.y > 520) {
                return false;
            }

            // 地图碰撞
            const tileX = Math.floor(bullet.x / 40);
            const tileY = Math.floor(bullet.y / 40);

            if (tileX >= 0 && tileX < 13 && tileY >= 0 && tileY < 13) {
                const tile = this.gameState.map[tileY][tileX];
                if (tile === 1) { // 砖墙
                    this.gameState.map[tileY][tileX] = 0;
                    bullet.active = false;
                    return false;
                } else if (tile === 2) { // 钢墙
                    bullet.active = false;
                    return false;
                } else if (tile === 5) { // 基地
                    this.gameState.map[tileY][tileX] = 0;
                    bullet.active = false;
                    this.gameOver(false);
                    return false;
                }
            }

            // 坦克碰撞
            this.gameState.tanks.forEach(tank => {
                if (tank.active && bullet.owner !== tank.owner && !tank.shield) {
                    const dx = bullet.x - tank.x;
                    const dy = bullet.y - tank.y;
                    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
                        tank.hp--;
                        bullet.active = false;
                        if (tank.hp <= 0) {
                            tank.active = false;
                            const player = this.players.get(tank.owner);
                            if (player) {
                                player.lives--;
                                if (player.lives > 0) {
                                    // 重生
                                    setTimeout(() => {
                                        const spawn = [{x: 4, y: 11}, {x: 8, y: 11}][tank.playerNum - 1];
                                        tank.x = spawn.x * 40 + 20;
                                        tank.y = spawn.y * 40 + 20;
                                        tank.hp = 1;
                                        tank.active = true;
                                        tank.shield = true;
                                        tank.shieldTime = 180;
                                    }, 2000);
                                } else {
                                    this.checkGameOver();
                                }
                            }
                        }
                    }
                }
            });

            // 敌人碰撞
            this.gameState.enemies.forEach(enemy => {
                if (enemy.active && bullet.owner !== 'enemy') {
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
                        enemy.hp--;
                        bullet.active = false;
                        if (enemy.hp <= 0) {
                            enemy.active = false;
                            this.gameState.enemiesRemaining--;

                            // 加分
                            const player = this.players.get(bullet.owner);
                            if (player) {
                                player.score += enemy.type * 100;
                            }

                            if (this.gameState.enemiesRemaining <= 0) {
                                this.nextLevel();
                            }
                        }
                    }
                }
            });

            return bullet.active;
        });

        // 检查是否需要生成新敌人
        if (this.gameState.enemies.filter(e => e.active).length < 4 &&
            this.gameState.enemies.filter(e => e.active).length + (20 - this.gameState.enemiesRemaining) < 20) {
            const spawnPoints = [{x: 0, y: 0}, {x: 260, y: 0}, {x: 520, y: 0}];
            const spawn = spawnPoints[Math.floor(Math.random() * 3)];
            const types = [1, 1, 1, 2, 2, 3, 4];
            const type = types[Math.floor(Math.random() * types.length)];

            this.gameState.enemies.push({
                x: spawn.x,
                y: spawn.y,
                direction: 2,
                type: type,
                hp: type === 3 ? 2 : 1,
                speed: type === 2 ? 2.5 : (type === 3 ? 1 : (type === 4 ? 2 : 1.5)),
                active: true,
                moveTimer: 0,
                shootTimer: 0
            });
        }
    }

    handlePlayerMove(playerId, direction, shooting) {
        const player = this.players.get(playerId);
        if (!player || !player.tank || !player.tank.active) return;

        const tank = player.tank;
        tank.direction = direction;

        const speed = 2;
        let newX = tank.x;
        let newY = tank.y;

        switch(direction) {
            case 0: newY -= speed; break;
            case 1: newX += speed; break;
            case 2: newY += speed; break;
            case 3: newX -= speed; break;
        }

        // 简单碰撞检测
        const tileX = Math.floor(newX / 40);
        const tileY = Math.floor(newY / 40);

        if (tileX >= 0 && tileX < 13 && tileY >= 0 && tileY < 13) {
            const tile = this.gameState.map[tileY][tileX];
            if (tile !== 1 && tile !== 2 && tile !== 4 && tile !== 5) {
                tank.x = Math.max(20, Math.min(500, newX));
                tank.y = Math.max(20, Math.min(500, newY));
            }
        }

        // 射击
        if (shooting && tank.shootTimer === undefined) {
            tank.shootTimer = 0;
        }

        if (shooting && (!tank.lastShoot || Date.now() - tank.lastShoot > 300)) {
            tank.lastShoot = Date.now();
            this.gameState.bullets.push({
                x: tank.x,
                y: tank.y,
                direction: tank.direction,
                owner: playerId,
                speed: 4,
                active: true
            });
        }
    }

    nextLevel() {
        this.gameState.level++;
        if (this.gameState.level > 5) {
            this.gameOver(true);
        } else {
            this.gameState.enemiesRemaining = 20;
            this.gameState.map = this.generateMap(this.gameState.level);
            this.spawnEnemies();
        }
    }

    checkGameOver() {
        const allDead = Array.from(this.players.values()).every(p => p.lives <= 0);
        if (allDead) {
            this.gameOver(false);
        }
    }

    gameOver(won) {
        this.gameState.started = false;
        this.broadcast({
            type: 'gameOver',
            won: won,
            scores: Array.from(this.players.values()).map(p => ({
                name: p.name,
                score: p.score
            }))
        });
    }

    broadcast(message) {
        const data = JSON.stringify(message);
        this.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(data);
            }
        });
    }

    getGameState() {
        return this.gameState;
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

        case 'startGame':
            setReady(ws, data.playerId, true);
            break;

        case 'playerMove':
            handlePlayerMove(ws, data);
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
            message: '房间已满'
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
            ready: p.ready
        }))
    }));

    // 广播给其他玩家
    room.broadcast({
        type: 'playerJoined',
        player: {
            id: playerId,
            name: playerName,
            playerNum: room.players.get(playerId).playerNum
        }
    });

    console.log(`玩家加入: ${roomId}, 玩家: ${playerName}`);
}

function setReady(ws, playerId, ready) {
    const roomId = playerToRoom.get(playerId);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.setPlayerReady(playerId, ready);

    room.broadcast({
        type: 'playerReady',
        playerId: playerId,
        ready: ready
    });
}

function handlePlayerMove(ws, data) {
    const roomId = playerToRoom.get(data.playerId);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.gameState.started) return;

    room.handlePlayerMove(data.playerId, data.direction, data.shooting);
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
    // 查找并移除玩家
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
                        playerId: playerId
                    });
                }
                break;
            }
        }
    }
}

console.log(`🎮 坦克大战局域网服务器运行在端口 ${PORT}`);
console.log(`等待玩家连接...`);
