# 棋牌游戏算法

常用棋牌游戏的算法实现。

## 麻将算法

### 牌型定义
```javascript
const SUITS = ['万', '条', '筒'];
const HONORS = ['东', '南', '西', '北', '中', '发', '白'];

// 牌的编码：1-9万, 11-19条, 21-29筒, 31-37字
function encodeTile(suit, value) {
    const suitOffset = { '万': 0, '条': 10, '筒': 20, '字': 30 };
    return suitOffset[suit] + value;
}
```

### 胡牌判断
```javascript
function canWin(tiles) {
    // 统计每张牌的数量
    const counts = {};
    tiles.forEach(t => counts[t] = (counts[t] || 0) + 1);

    // 尝试找一对将
    for (let tile in counts) {
        if (counts[tile] >= 2) {
            counts[tile] -= 2;
            if (checkMelds(counts)) return true;
            counts[tile] += 2;
        }
    }
    return false;
}

function checkMelds(counts) {
    // 递归检查剩余牌能否组成面子（顺子或刻子）
    const remaining = Object.entries(counts)
        .filter(([_, c]) => c > 0);

    if (remaining.length === 0) return true;

    const [tile, count] = remaining[0];
    tile = parseInt(tile);

    // 尝试刻子
    if (count >= 3) {
        counts[tile] -= 3;
        if (checkMelds(counts)) return true;
        counts[tile] += 3;
    }

    // 尝试顺子（仅数牌）
    if (tile < 30) {
        const suitBase = Math.floor(tile / 10) * 10;
        const value = tile % 10;
        if (value <= 7 && counts[tile + 1] > 0 && counts[tile + 2] > 0) {
            counts[tile]--;
            counts[tile + 1]--;
            counts[tile + 2]--;
            if (checkMelds(counts)) return true;
            counts[tile]++;
            counts[tile + 1]++;
            counts[tile + 2]++;
        }
    }

    return false;
}
```

### 听牌计算
```javascript
function getWaitingTiles(hand) {
    const waiting = [];
    const allTiles = getAllPossibleTiles();

    allTiles.forEach(tile => {
        const testHand = [...hand, tile];
        if (canWin(testHand)) {
            waiting.push(tile);
        }
    });

    return waiting;
}
```

## 扑克算法

### 牌型判断（掼蛋/斗地主）
```javascript
const CARD_VALUES = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
    '小王': 16, '大王': 17
};

function getCardType(cards) {
    const values = cards.map(c => CARD_VALUES[c.value]).sort((a, b) => a - b);
    const counts = getValueCounts(values);

    if (isRocket(values)) return 'rocket';
    if (isBomb(values)) return 'bomb';
    if (isStraight(values)) return 'straight';
    if (isTriple(values, counts)) return 'triple';
    if (isPair(values, counts)) return 'pair';
    if (isSingle(values)) return 'single';

    return 'invalid';
}
```

### 大小比较
```javascript
function compareHands(hand1, hand2) {
    const type1 = getCardType(hand1);
    const type2 = getCardType(hand2);

    // 炸弹和火箭可以压制任何牌型
    if (type1 === 'rocket') return 1;
    if (type2 === 'rocket') return -1;
    if (type1 === 'bomb' && type2 !== 'bomb') return 1;
    if (type2 === 'bomb' && type1 !== 'bomb') return -1;

    // 同类型比较
    if (type1 !== type2) return 0; // 不同类型不能比较

    return getMaxValue(hand1) - getMaxValue(hand2);
}
```

## 通用算法

### 洗牌
```javascript
function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
```

### 发牌
```javascript
function dealCards(deck, playerCount, cardsPerPlayer) {
    const hands = Array.from({ length: playerCount }, () => []);
    for (let i = 0; i < cardsPerPlayer; i++) {
        for (let p = 0; p < playerCount; p++) {
            if (deck.length > 0) {
                hands[p].push(deck.pop());
            }
        }
    }
    return { hands, remaining: deck };
}
```

### 排序
```javascript
function sortHand(hand) {
    return hand.sort((a, b) => {
        const valueDiff = CARD_VALUES[b.value] - CARD_VALUES[a.value];
        if (valueDiff !== 0) return valueDiff;
        return a.suit.localeCompare(b.suit);
    });
}
```
