# WebSocket 联机模式

局域网多人游戏的 WebSocket 实现模式。

## 服务器结构

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// 房间管理
const rooms = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        handleMessage(ws, msg);
    });
});
```

## 消息类型

| 类型 | 用途 | 数据 |
|------|------|------|
| join | 加入房间 | roomId, playerName |
| leave | 离开房间 | roomId |
| gameAction | 游戏操作 | action, data |
| sync | 状态同步 | gameState |
| chat | 聊天消息 | message |

## 状态同步

```javascript
// 广播给房间所有玩家
function broadcast(roomId, message) {
    const room = rooms.get(roomId);
    room.players.forEach(player => {
        player.ws.send(JSON.stringify(message));
    });
}

// 广播游戏状态
function syncGameState(roomId) {
    broadcast(roomId, {
        type: 'sync',
        state: rooms.get(roomId).gameState
    });
}
```

## 断线重连

```javascript
// 保存玩家状态
player.lastState = {
    hand: [...player.hand],
    score: player.score
};

// 重连时恢复
function handleReconnect(ws, playerId) {
    const player = findPlayer(playerId);
    if (player) {
        player.ws = ws;
        ws.send(JSON.stringify({
            type: 'reconnect',
            state: player.lastState
        }));
    }
}
```

## 心跳检测

```javascript
// 定期检测连接状态
setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

ws.on('pong', () => {
    ws.isAlive = true;
});
```
