// 临时脚本：查看当前游戏桌上玩家的手牌
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8081');

ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'login', name: '__checker__' }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'loginSuccess') {
        // 请求牌桌列表
        ws.send(JSON.stringify({ type: 'getTableList' }));
    }
    ws.close();
});
