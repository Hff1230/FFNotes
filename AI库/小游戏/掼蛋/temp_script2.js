
    // ==================== 游戏状态 ====================
    let ws = null;
    let playerId = null;
    let roomId = null;
    let playerName = '';
    let isReady = false;
    let gameState = null;
    let selectedCards = [];
    let myInfo = null;
    let isSpectator = false; // 是否为观战者

    let LEVEL_TO_RANK = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };


    // ==================== WebSocket连接 ====================
    function connect(serverAddress) {
        return new Promise((resolve, reject) => {
            ws = new WebSocket(`ws://${serverAddress}`);

            ws.onopen = () => {
                updateConnectionStatus(true);
                showNotification('已连接到服务器');
                resolve();
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleMessage(data);
            };

            ws.onclose = () => {
                updateConnectionStatus(false);
                showNotification('与服务器断开连接');
            };

            ws.onerror = (error) => {
                console.error('WebSocket错误:', error);
                updateConnectionStatus(false);
                reject(error);
            };
        });
    }

    function updateConnectionStatus(connected) {
        const status = document.getElementById('connectionStatus');
        if (connected) {
            status.textContent = '已连接';
            status.className = 'connected';
        } else {
            status.textContent = '未连接';
            status.className = 'disconnected';
        }
    }

    // ==================== 消息处理 ====================
    function handleMessage(data) {
        switch(data.type) {
            case 'roomList':
                renderTableList(data.rooms);
                break;
            case 'roomCreated':
                handleRoomCreated(data);
                break;
            case 'roomJoined':
                handleRoomJoined(data);
                break;
            case 'playerList':
                updatePlayerList(data.players);
                break;
            case 'playerJoined':
                showNotification(`${data.player.name} 加入了游戏`);
                break;
            case 'playerLeft':
                showNotification(`${data.playerName} 离开了游戏`);
                break;
            case 'spectatorJoined':
                // 观战者自己加入成功
                handleSpectatorJoined(data);
                break;
            case 'spectatorJoinedNotify':
                // 有观战者加入（通知）
                showNotification(`👁️ ${data.spectatorName} 开始观战`);
                break;
            case 'spectatorLeft':
                showNotification(`👁️ ${data.spectatorName} 停止观战`);
                break;
            case 'spectatorViewState':
                // 观战者切换查看玩家后的状态更新
                gameState = data.gameState;
                updateSpectatorUI();
                break;
            case 'gameStart':
                handleGameStart(data);
                break;
            case 'gameState':
                handleGameState(data);
                break;
            case 'playError':
                showNotification(data.message);
                break;
            case 'playerFinished':
                showNotification(`🎉 ${data.playerName} 第${data.rank}个出完牌！`);
                break;
            case 'roundEnd':
                handleRoundEnd(data);
                break;
            case 'newRound':
                handleNewRound(data);
                break;
            case 'chat':
                handleChat(data);
                break;
            case 'error':
                showNotification(data.message);
                break;
        }
    }

    // ==================== 牌桌列表 ====================
    function renderTableList(rooms) {
        const grid = document.getElementById('tableGrid');

        // 保留创建新桌卡片
        grid.innerHTML = `
            <div class="table-card create-table-card">
                <div class="plus">+</div>
                <div class="text">创建新桌</div>
                <div class="mode-selector">
                    <div class="mode-btn fast" data-mode="fast">⚡ 快速 7秒</div>
                    <div class="mode-btn normal" data-mode="normal">🎮 正常 15秒</div>
                </div>
                <div class="spectator-toggle">
                    <input type="checkbox" id="allowSpectator">
                    <label for="allowSpectator">👁️ 允许观战（可看一人手牌）</label>
                </div>
            </div>
        `;

        // 添加模式按钮点击事件委托
        grid.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const mode = this.getAttribute('data-mode');
                createRoom(mode);
            });
        });

        // 添加现有房间
        rooms.forEach(room => {
            const card = document.createElement('div');
            const isFull = room.playerCount >= room.maxPlayers;
            const isPlaying = room.started;
            const isFast = room.mode === 'fast';

            card.className = `table-card ${isFull ? 'full' : ''} ${isPlaying ? 'playing' : ''}`;

            // 模式标签
            const modeLabel = isFast ? '⚡' : '🎮';
            const modeClass = isFast ? 'fast' : 'normal';

            // 生成圆桌座位显示
            let seatsHtml = '';
            for (let i = 0; i < 4; i++) {
                const seatNum = i + 1;
                // 根据 playerNum 查找对应座位的玩家，而不是依赖数组索引
                const player = room.players.find(p => p.playerNum === seatNum);
                const occupied = !!player;
                // 1、3号位是红队（对家），2、4号位是蓝队（对家）
                const team = (i % 2 === 0) ? 'team1' : 'team2';
                const occupiedClass = occupied ? 'occupied' : '';
                // 点击空位时传递座位号
                const clickHandler = (!occupied && !isPlaying) ? `onclick="event.stopPropagation(); joinRoomById('${room.roomId}', ${seatNum})"` : '';
                const title = occupied && player ? player.name : (isPlaying ? '' : '点击加入');
                const displayChar = occupied ? (player ? player.name.charAt(0) : '?') : '+';

                seatsHtml += `
                    <div class="mini-seat mini-seat-${seatNum}">
                        <div class="mini-seat-avatar ${team} ${occupiedClass}" ${clickHandler} title="${title}">
                            ${displayChar}
                        </div>
                    </div>
                `;
            }

            // 状态文字
            let statusText = `${room.playerCount}/4 人`;
            if (room.allowSpectator && room.spectatorCount > 0) statusText += ` | ${room.spectatorCount}人观战`;
            if (isPlaying) statusText = '🎮 游戏中';

            // 观战按钮（游戏进行中且允许观战时显示）
            let spectateBtnHtml = '';
            if (isPlaying && room.allowSpectator) {
                spectateBtnHtml = `<button class="spectate-btn" onclick="event.stopPropagation(); spectateRoom('${room.roomId}')">👁️ 观战</button>`;
            }

            // 观战标识
            let spectatorBadge = '';
            if (room.allowSpectator) {
                spectatorBadge = `<span style="font-size:10px;color:#4dabf7;margin-left:5px;">👁️</span>`;
            }

            card.innerHTML = `
                <div class="table-header">
                    <div class="table-id">${room.roomId}${spectatorBadge}</div>
                    <div class="table-mode-badge ${modeClass}">${modeLabel}</div>
                </div>
                <div class="mini-table-layout">
                    <div class="mini-table-center">🃏</div>
                    ${seatsHtml}
                </div>
                <div class="table-footer ${isFull ? 'full' : ''} ${isPlaying ? 'playing' : ''}">${statusText}</div>
                ${spectateBtnHtml}
            `;

            // 点击整个卡片也可以加入（如果未满且未开始）
            if (!isFull && !isPlaying) {
                card.onclick = () => joinRoomById(room.roomId);
            }

            grid.appendChild(card);
        });
    }

    function joinRoomById(roomId, seatNum = null) {
        playerName = document.getElementById('playerName').value.trim();

        if (!playerName) {
            showNotification('请输入玩家名称');
            return;
        }

        // 保存用户名
        savePlayerName(playerName);

        // 如果还没连接，先连接
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            connect(window.location.host).then(() => {
                send({
                    type: 'joinRoom',
                    roomId: roomId,
                    playerName: playerName,
                    seatNum: seatNum
                });
            }).catch(() => {
                showNotification('连接服务器失败');
            });
        } else {
            send({
                type: 'joinRoom',
                roomId: roomId,
                playerName: playerName,
                seatNum: seatNum
            });
        }
    }

    // 观战者加入
    function spectateRoom(roomId) {
        playerName = document.getElementById('playerName').value.trim();

        if (!playerName) {
            showNotification('请输入玩家名称');
            return;
        }

        // 保存用户名
        savePlayerName(playerName);

        // 如果还没连接，先连接
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            connect(window.location.host).then(() => {
                send({
                    type: 'spectateRoom',
                    roomId: roomId,
                    playerName: playerName
                });
            }).catch(() => {
                showNotification('连接服务器失败');
            });
        } else {
            send({
                type: 'spectateRoom',
                roomId: roomId,
                playerName: playerName
            });
        }
    }

    function handleRoomCreated(data) {
        playerId = data.playerId;
        roomId = data.roomId;
        updatePlayerList(data.players);
        showWaitingRoom();
    }

    function handleRoomJoined(data) {
        playerId = data.playerId;
        roomId = data.roomId;
        updatePlayerList(data.players);
        showWaitingRoom();
    }

    function handleSpectatorJoined(data) {
        playerId = data.spectatorId;
        roomId = data.roomId;
        isSpectator = true;
        gameState = data.gameState;
        myInfo = { id: playerId, name: playerName };

        // 直接进入游戏界面
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('waitingRoom').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        document.getElementById('chatBox').style.display = 'flex';

        // 更新观战者界面
        updateSpectatorUI();
        showNotification('👁️ 你已进入观战模式');
    }

    function showWaitingRoom() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('waitingRoom').style.display = 'flex';
        document.getElementById('displayRoomId').textContent = roomId;
    }

    function updatePlayerList(players) {
        // 清空所有座位
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`waitSeat${i}Name`).textContent = '等待加入...';
            document.getElementById(`waitSeat${i}Status`).textContent = '';
            document.getElementById(`waitSeat${i}Status`).className = 'seat-status';
            document.getElementById(`waitSeat${i}`).classList.remove('is-me');
            document.querySelector(`#waitSeat${i} .seat-avatar`).classList.remove('occupied');
        }

        // 填充玩家到对应座位
        players.forEach(p => {
            const seatNum = p.playerNum;
            const seatEl = document.getElementById(`waitSeat${seatNum}`);
            const avatarEl = seatEl.querySelector('.seat-avatar');

            const displayName = p.name + (p.id === playerId ? ' (你)' : '') + (p.isAI ? ' 🤖' : '');
            document.getElementById(`waitSeat${seatNum}Name`).textContent = displayName;
            document.getElementById(`waitSeat${seatNum}Status`).textContent = p.ready ? '✓ 已准备' : '等待中';
            document.getElementById(`waitSeat${seatNum}Status`).className = `seat-status ${p.ready ? 'ready' : ''}`;

            if (p.id === playerId) {
                seatEl.classList.add('is-me');
            }
            avatarEl.classList.add('occupied');
        });

        // 更新AI按钮状态 - 如果已有4人则隐藏
        const addAIBtn = document.getElementById('addAIBtn');
        if (addAIBtn) {
            addAIBtn.style.display = players.length >= 4 ? 'none' : 'inline-block';
        }
    }

    function handleGameStart(data) {
        gameState = data.gameState;
        myInfo = gameState.myInfo;
        isSpectator = gameState.isSpectator || false;

 document.getElementById('waitingRoom').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        document.getElementById('chatBox').style.display = 'flex';

        updateGameUI();
    }

    function handleGameState(data) {
        gameState = data.gameState;
        // 如果游戏状态中包含 myInfo，更新它
        if (gameState.myInfo) {
            myInfo = gameState.myInfo;
        }
        isSpectator = gameState.isSpectator || isSpectator;
        updateGameUI();
        // 自动出牌
        autoPlayIfEnabled();
    }

    function updateGameUI() {
        if (!gameState || !myInfo) return;

        // 如果是观战者，使用观战者界面
        if (isSpectator) {
            updateSpectatorUI();
            return;
        }

        // 更新双方级牌
        const team1Level = gameState.teamLevels[1];
        const team2Level = gameState.teamLevels[2];

        const level1Text = LEVEL_TO_RANK[team1Level];
        const level2Text = LEVEL_TO_RANK[team2Level];

        document.getElementById('team1Level').textContent = level1Text;
        document.getElementById('team2Level').textContent = level2Text;

        // 逢人配（当前打牌方的级牌对应的红桃)
        const currentLevel = gameState.teamLevels[gameState.currentLevelTeam];
        const currentLevelRank = LEVEL_TO_RANK[currentLevel];
        document.getElementById('trumpCard').textContent = '♥' + currentLevelRank;

        // 我的队伍
        document.getElementById('myTeam').textContent = myInfo.team === 1 ? '红队' : '蓝队';
        document.getElementById('myTeam').style.color = myInfo.team === 1 ? '#ff6b6b' : '#4dabf7';

        // 打牌方
        const currentTeam = gameState.currentLevelTeam;
        document.getElementById('currentLevelTeam').textContent = currentTeam === 1 ? '红队' : '蓝队';
        document.getElementById('currentLevelTeam').style.color = currentTeam === 1 ? '#ff6b6b' : '#4dabf7';

        // 渲染手牌
        renderMyHand();

        // 更新对手信息
        updateOpponents();

        // 更新上一次出的牌
        updateLastPlay();

        // 更新当前玩家指示
        updateTurnIndicator();

        // 更新按钮状态
        updateButtons();
    }

    // 观战者界面更新
    function updateSpectatorUI() {
        if (!gameState) return;

        // 更新顶部信息栏
        const team1Level = gameState.teamLevels[1];
        const team2Level = gameState.teamLevels[2];
        document.getElementById('team1Level').textContent = LEVEL_TO_RANK[team1Level];
        document.getElementById('team2Level').textContent = LEVEL_TO_RANK[team2Level];

        // 逢人配
        const currentLevel = gameState.teamLevels[gameState.currentLevelTeam];
        document.getElementById('trumpCard').textContent = '♥' + LEVEL_TO_RANK[currentLevel];

        // 观战者标识
        document.getElementById('myTeam').textContent = '👁️ 观战者';
        document.getElementById('myTeam').style.color = '#4dabf7';

        // 打牌方
        const currentTeam = gameState.currentLevelTeam;
        document.getElementById('currentLevelTeam').textContent = currentTeam === 1 ? '红队' : '蓝队';
        document.getElementById('currentLevelTeam').style.color = currentTeam === 1 ? '#ff6b6b' : '#4dabf7';

        // 获取玩家列表并按座位排序
        const playerList = [];
        for (let [pid, player] of Object.entries(gameState.playerInfo || {})) {
            playerList.push({ ...player, playerId: pid });
        }
        playerList.sort((a, b) => a.playerNum - b.playerNum);

        // 隐藏操作按钮
        document.getElementById('actionButtons').style.display = 'none';

        // 当前查看的玩家ID
        const viewPlayerId = gameState.viewPlayerId;

        // 渲染玩家选择按钮
        const handContainer = document.getElementById('handContainer');
        handContainer.innerHTML = '';

        // 玩家选择区
        const selectArea = document.createElement('div');
        selectArea.className = 'spectator-player-select';

        playerList.forEach((player, idx) => {
            const btn = document.createElement('button');
            const teamClass = player.team === 1 ? 'team1' : 'team2';
            btn.className = `spectator-player-btn ${teamClass} ${player.playerId === viewPlayerId ? 'active' : ''}`;
            btn.innerHTML = `${player.name} <span style="opacity:0.7">(${gameState.hands[player.playerId]?.count || 0}张)</span>`;
            if (gameState.currentPlayer === idx) {
                btn.innerHTML += ' ▼';
            }
            btn.onclick = () => switchViewPlayer(player.playerId);
            selectArea.appendChild(btn);
        });

        handContainer.appendChild(selectArea);

        // 显示选中玩家的手牌
        const viewedPlayer = playerList.find(p => p.playerId === viewPlayerId);
        if (viewedPlayer) {
            const hand = gameState.hands[viewPlayerId];
            const cards = hand?.cards || [];
            const teamColor = viewedPlayer.team === 1 ? '#ff6b6b' : '#4dabf7';

            // 手牌区域
            const handArea = document.createElement('div');
            handArea.className = 'spectator-hand-area';
            handArea.style.border = `2px solid ${teamColor}`;

            if (cards.length > 0) {
                const label = document.createElement('div');
                label.className = 'spectator-hand-label';
                label.style.color = teamColor;
                label.innerHTML = `<strong>${viewedPlayer.name}</strong> 的手牌 (${cards.length}张)`;
                handArea.appendChild(label);

                const cardsDiv = document.createElement('div');
                cardsDiv.className = 'spectator-cards';
                cards.forEach(card => {
                    cardsDiv.appendChild(createCardElement(card, true));
                });
                handArea.appendChild(cardsDiv);
            } else {
                handArea.innerHTML = `<div style="color:#888;text-align:center;padding:20px;">该玩家手牌为空</div>`;
            }

            handContainer.appendChild(handArea);
        }

        // 显示其他玩家（仅显示牌数和牌背）
        const otherPlayersArea = document.createElement('div');
        otherPlayersArea.style.cssText = 'display:flex;gap:15px;justify-content:center;flex-wrap:wrap;margin-top:10px;';

        playerList.forEach((player, idx) => {
            if (player.playerId === viewPlayerId) return;

            const hand = gameState.hands[player.playerId];
            const count = hand?.count || 0;
            const teamColor = player.team === 1 ? '#ff6b6b' : '#4dabf7';

            const playerBox = document.createElement('div');
            playerBox.className = 'spectator-hand-area';
            playerBox.style.cssText = `flex:1;min-width:120px;max-width:180px;border:2px solid ${teamColor};cursor:pointer;`;
            playerBox.onclick = () => switchViewPlayer(player.playerId);

            const label = document.createElement('div');
            label.className = 'spectator-hand-label';
            label.style.color = teamColor;
            label.innerHTML = `<strong>${player.name}</strong> (${count}张)`;
            if (gameState.currentPlayer === idx) {
                label.innerHTML += ' ▼';
            }
            playerBox.appendChild(label);

            // 显示牌背（单张牌样式）
            const backDiv = document.createElement('div');
            backDiv.className = 'card-back-stack';
            backDiv.style.cssText = 'margin: 5px auto;';

            // 只显示一张牌背
            const back = document.createElement('div');
            back.className = 'card-back';
            back.style.cssText = 'width:35px;height:50px;';
            backDiv.appendChild(back);

            // 添加数量标签
            const badge = document.createElement('span');
            badge.className = 'card-count-badge';
            badge.textContent = count;
            backDiv.appendChild(badge);

            playerBox.appendChild(backDiv);

            otherPlayersArea.appendChild(playerBox);
        });

        handContainer.appendChild(otherPlayersArea);

        // 更新上一次出的牌（中央区域）
        updateLastPlay();
    }

    // 切换查看的玩家
    function switchViewPlayer(playerId) {
        if (!isSpectator) return;
        send({
            type: 'spectatorViewPlayer',
            spectatorId: playerId,
            viewPlayerId: playerId
        });
    }

    function renderMyHand() {
        const hand = document.getElementById('myHand');
        hand.innerHTML = '';

        const cards = gameState.myHand || [];
        cards.forEach((card, index) => {
            const cardEl = createCardElement(card, false);
            cardEl.onclick = () => toggleCardSelection(index, card);
            // 使用索引来判断是否选中
            if (selectedCards.some(sc => sc.suit === card.suit && sc.rank === card.rank)) {
                cardEl.classList.add('selected');
            }
            // 设置 z-index 让后面的牌在上层
            cardEl.style.zIndex = index;
            hand.appendChild(cardEl);
        });
    }

    function createCardElement(card, small = false) {
        const el = document.createElement('div');
        el.className = `card ${small ? 'card-small' : ''}`;

        if (card.isJoker) {
            el.classList.add(card.rank === '大王' ? 'joker-red' : 'joker-black');
        } else if (card.suit === '♥' || card.suit === '♦') {
            el.classList.add('red');
        } else {
            el.classList.add('black');
        }

        if (card.isTrump) {
            el.classList.add('trump');
        }

        // 标准扑克牌布局：左上角数字+花色，中间大花色，右下角数字+花色（倒置）
        const displayRank = card.isJoker ? (card.rank === '大王' ? '大' : '小') : card.rank;
        const displaySuit = card.isJoker ? '王' : card.suit;

        el.innerHTML = `
            <div class="corner-top">
                <span class="rank">${displayRank}</span>
                <span class="suit">${displaySuit}</span>
            </div>
            <div class="center-suit">${displaySuit}</div>
            <div class="corner-bottom">
                <span class="rank">${displayRank}</span>
                <span class="suit">${displaySuit}</span>
            </div>
        `;

        return el;
    }

    function toggleCardSelection(index, card) {
        // 确保 card 对象有 value 属性
        const cardValue = card.value; // 使用 value 属性比较
        const idx = selectedCards.findIndex(sc => sc.suit === card.suit && sc.rank === card.rank && sc.value === cardValue);
        if (idx === -1) {
            selectedCards.push(card);
        } else {
            selectedCards.splice(idx, 1);
        }
        // 渲染完成后更新按钮状态
        updateButtons();    function updateOpponents() {
        // 获取所有玩家信息，按playerNum排序
        const playerList = [];
        for (let [pid, player] of Object.entries(gameState.playerInfo || {})) {
            playerList.push({ ...player, playerId: pid });
        }
        playerList.sort((a, b) => a.playerNum - b.playerNum);

        // 找到自己的位置
        const myPos = myInfo.playerNum - 1; // 0-3

        // 计算相对位置：左家、上家（对家）、右家（逆时针方向）
        // 出牌顺序 1→2→3→4，从1号位看：左=2号, 上=3号, 右=4号
        const positions = ['Left', 'Top', 'Right'];
        const relativeOffsets = [1, 2, 3]; // 左家=逆时针下一个, 上家=对家, 右家=逆时针上一个

        positions.forEach((pos, idx) => {
            const targetPlayerNum = ((myPos + relativeOffsets[idx]) % 4) + 1;
            const targetPlayer = playerList.find(p => p.playerNum === targetPlayerNum);

            if (targetPlayer) {
                const pid = targetPlayer.playerId;
                const count = gameState.hands[pid]?.count || 0;

                // 更新牌数
                document.getElementById(`op${pos}Count`).textContent = count;

                // 更新名字和队伍颜色
                const nameEl = document.getElementById(`op${pos}Name`);
                nameEl.textContent = targetPlayer.name;
                nameEl.className = `opponent-name ${targetPlayer.team === 1 ? 'team1' : 'team2'}`;

                // 显示牌背（叠加样式）
                const cardsContainer = document.getElementById(`op${pos}Cards`);
                cardsContainer.innerHTML = '';

                if (count > 0) {
                    // 创建牌背叠加容器
                    const stackDiv = document.createElement('div');
                    stackDiv.className = 'card-back-stack';

                    // 只显示一张牌背
                    const back = document.createElement('div');
                    back.className = 'card-back';
                    stackDiv.appendChild(back);

                    // 添加数量标签
                    const badge = document.createElement('span');
                    badge.className = 'card-count-badge';
                    badge.textContent = count;
                    stackDiv.appendChild(badge);

                    cardsContainer.appendChild(stackDiv);
                }
            }
        });
    }

    function updateLastPlay() {
        const container = document.getElementById('lastPlayCards');

        if (gameState.lastPlay && gameState.lastPlay.cards) {
            container.innerHTML = '';
            gameState.lastPlay.cards.forEach(card => {
                container.appendChild(createCardElement(card, true));
            });
        } else {
            container.innerHTML = '<span style="color: #888;">等待出牌...</span>';
        }
    }

    function updateTurnIndicator() {
        // 清除所有指示
        ['Left', 'Top', 'Right'].forEach(pos => {
            document.getElementById(`op${pos}Turn`).style.display = 'none';
            document.getElementById(`opponent${pos}`).classList.remove('current-turn');
        });
        document.getElementById('myPlayArea').style.border = '2px dashed #ffd700';
        document.getElementById('myPlayArea').style.boxShadow = 'none';

        // 获取玩家列表（按playerNum排序）
        const playerList = [];
        for (let [pid, player] of Object.entries(gameState.playerInfo || {})) {
            playerList.push({ ...player, playerId: pid });
        }
        playerList.sort((a, b) => a.playerNum - b.playerNum);
        const playerIds = playerList.map(p => p.playerId);

        // 判断是否轮到我
        const currentPlayerIndex = gameState.currentPlayer;
        const currentId = playerIds[currentPlayerIndex];

        if (currentId === playerId) {
            document.getElementById('myPlayArea').style.border = '3px solid #ffd700';
            document.getElementById('myPlayArea').style.boxShadow = '0 0 20px #ffd700';
        } else {
            document.getElementById('myPlayArea').style.boxShadow = 'none';

            // 找到当前玩家的相对位置
            const myPos = myInfo.playerNum - 1;
            const currentPos = playerList.findIndex(p => p.playerId === currentId);

            if (currentPos !== -1) {
                const relativePos = (currentPos - myPos + 4) % 4;
                // 逆时针方向：1=左边, 2=上方(对家), 3=右边
                const posMap = { 1: 'Left', 2: 'Top', 3: 'Right' };
                const targetPos = posMap[relativePos];

                if (targetPos) {
                    document.getElementById(`op${targetPos}Turn`).style.display = 'block';
                    document.getElementById(`opponent${targetPos}`).classList.add('current-turn');
                }
            }
        }
    }

    function updateButtons() {
        // 获取玩家列表（按playerNum排序）
        const playerList = [];
        for (let [pid, player] of Object.entries(gameState.playerInfo || {})) {
            playerList.push({ ...player, playerId: pid });
        }
        playerList.sort((a, b) => a.playerNum - b.playerNum);
        const playerIds = playerList.map(p => p.playerId);

        const currentPlayerIndex = gameState.currentPlayer;
        const currentId = playerIds[currentPlayerIndex];

        const isMyTurn = currentId === playerId;
        const canPlay = isMyTurn && selectedCards.length > 0;
        const canPass = isMyTurn && gameState.lastPlay && gameState.lastPlayer !== playerId;


        console.log('=== updateButtons ===');
        console.log('isMyTurn:', isMyTurn, 'currentId:', currentId);
        console.log('playerId:', playerId);
        console.log('canPlay:', canPlay, 'selectedCards.length:', selectedCards.length);
        console.log('canPass:', canPass);
        console.log('lastPlay:', gameState.lastPlay);
        console.log('lastPlayer:', gameState.lastPlayer);

        document.getElementById('playBtn').disabled = !canPlay;
        document.getElementById('passBtn').disabled = !canPass;
    }

    function handleRoundEnd(data) {
        const modal = document.getElementById('roundEndModal');
        modal.style.display = 'flex';

        const winnerTeam = data.winner === 1 ? '红队' : '蓝队';
        const myTeam = myInfo.team === 1 ? '红队' : '蓝队';
        const won = myTeam === winnerTeam;

        document.getElementById('roundEndTitle').textContent = won ? '🎉 胜利！' : '😢 本局失败';

        const rankList = document.getElementById('rankList');
        rankList.innerHTML = data.ranks
            .sort((a, b) => a.rank - b.rank)
            .map(r => `
                <div class="rank-item">
                    <span class="name">${r.name} (${r.team === 1 ? '红队' : '蓝队'})</span>
                    <span class="rank">第${r.rank}名</span>
                </div>
            `).join('');

        const levelInfo = document.getElementById('levelUpInfo');
        levelInfo.textContent = `${winnerTeam} 升级 ${data.levelUp} 级！ 当前级别: ${LEVEL_TO_RANK[data.teamLevels[data.winner]]}`;
        levelInfo.textContent += ` → ${LEVEL_TO_RANK[data.teamLevels[data.winner]]}`;
    }

    function handleNewRound(data) {
        gameState = data.gameState;
        selectedCards = [];
        document.getElementById('roundEndModal').style.display = 'none';
        updateGameUI();
        showNotification('新一局开始！');
    }

    function handleChat(data) {
        const messages = document.getElementById('chatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message';
        msgDiv.innerHTML = `<span class="sender">${data.playerName}:</span> <span class="text">${data.message}</span>`;
        messages.appendChild(msgDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    // ==================== 游戏操作 ====================
    async function createRoom(mode = 'normal') {
        console.log('createRoom called, mode:', mode);
        playerName = document.getElementById('playerName').value.trim();
        console.log('playerName:', playerName);

        if (!playerName) {
            showNotification('请输入玩家名称');
            return;
        }

        // 获取是否允许观战
        const allowSpectator = document.getElementById('allowSpectator').checked;

        // 保存用户名
        savePlayerName(playerName);

        // 如果还没连接，先连接
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.log('Connecting to:', window.location.host);
            try {
                await connect(window.location.host);
                console.log('Connected!');
            } catch (e) {
                console.error('Connection failed:', e);
                showNotification('连接服务器失败');
                return;
            }
        }

        console.log('Sending createRoom message');
        send({
            type: 'createRoom',
            playerName: playerName,
            mode: mode,
            allowSpectator: allowSpectator
        });
    }

    function toggleReady() {
        isReady = !isReady;
        const btn = document.getElementById('readyBtn');
        btn.textContent = isReady ? '取消准备' : '准备';
        btn.style.background = isReady ? 'linear-gradient(180deg, #ffd700, #ff8c00)' : '';
        btn.style.color = isReady ? '#1a3d2a' : '';

        send({
            type: 'ready',
            playerId: playerId,
            ready: isReady
        });
    }

    function addAIPlayer() {
        send({
            type: 'addAI',
            roomId: roomId
        });
    }

    // AI自动测试 - 添加3个AI并自动准备
    let autoPlayEnabled = false;

    function startAITest() {
        if (!roomId) {
            showNotification('请先创建或加入房间');
            return;
        }

        // 连续添加3个AI玩家
        let aiCount = 0;
        const addAI = () => {
            if (aiCount < 3) {
                send({ type: 'addAI', roomId: roomId });
                aiCount++;
                setTimeout(addAI, 300);
            } else {
                // 3个AI添加完后，自动准备
                setTimeout(() => {
                    if (!isReady) {
                        toggleReady();
                    }
                    // 启用自动出牌
                    autoPlayEnabled = true;
                }, 500);
            }
        };
        addAI();
        showNotification('🤖 AI测试模式启动！自动出牌已开启');
    }

    // 自动出牌 - 出最小的单张
    function autoPlayIfEnabled() {
        if (!autoPlayEnabled || !gameState || !gameState.hands) return;

        const playerIds = Object.keys(gameState.hands);
        const currentPid = playerIds[gameState.currentPlayer];

        // 只有轮到自己时才自动出牌
        if (currentPid !== playerId) return;

        const myHand = gameState.hands[playerId];
        if (!myHand || myHand.length === 0) return;

        // 延迟1秒后自动出牌
        setTimeout(() => {
            // 检查是否需要跟牌还是自由出牌
            if (gameState.lastPlay && gameState.lastPlayer !== playerId) {
                // 需要跟牌 - 尝试出一张比上家大的牌
                const lastValue = gameState.lastPlay.value;
                for (let i = myHand.length - 1; i >= 0; i--) {
                    if (myHand[i].value > lastValue) {
                        send({ type: 'play', playerId: playerId, cards: [myHand[i]] });
                        return;
                    }
                }
                // 没有能压过的牌，不出
                send({ type: 'pass', playerId: playerId });
            } else {
                // 自由出牌 - 出最小的单张
                send({ type: 'play', playerId: playerId, cards: [myHand[myHand.length - 1]] });
            }
        }, 1000);
    }

    function playSelectedCards() {
        if (selectedCards.length === 0) {
            showNotification('请选择要出的牌');
            return;
        }

        send({
            type: 'play',
            playerId: playerId,
            cards: selectedCards
        });

        selectedCards = [];
    }

    function passRound() {
        send({
            type: 'pass',
            playerId: playerId
        });
    }

    function clearSelection() {
        selectedCards = [];
        renderMyHand();
    }

    function startNewRound() {
        send({
            type: 'newRound',
            playerId: playerId
        });
    }

    function sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();

        if (!message) return;

        send({
            type: 'chat',
            playerId: playerId,
            message: message
        });

        input.value = '';
    }

    // ==================== 工具函数 ====================
    function send(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    function showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // 聊天回车发送 & 加载保存的用户名 & 初始化连接
    document.addEventListener('DOMContentLoaded', () => {
        // 加载上次使用的用户名
        const savedName = localStorage.getItem('guandan_player_name');
        if (savedName) {
            document.getElementById('playerName').value = savedName;
        }

        // 页面加载时连接服务器，以便接收房间列表
        connect(window.location.host).catch(e => {
            console.log('初始连接失败，将在创建/加入房间时重试');
        });

        document.getElementById('messageInput').addEventListener('keydown', (e) => {
            if (e.code === 'Enter') {
                sendMessage();
            }
        });
    });

    // 保存用户名到本地存储
    function savePlayerName(name) {
        if (name) {
            localStorage.setItem('guandan_player_name', name);
        }
    }
    