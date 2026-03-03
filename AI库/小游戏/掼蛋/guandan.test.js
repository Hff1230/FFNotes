/**
 * 掼蛋游戏自动化测试模块
 * 测试框架: Jest
 * 运行: npm test
 */

// ==================== 常量定义 ====================
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
    '小王': 15, '大王': 16
};

// ==================== 辅助函数 ====================
function createCard(suit, rank) {
    return {
        suit,
        rank,
        value: RANK_VALUES[rank],
        isJoker: rank === '大王' || rank === '小王',
        isTrump: suit === '♥' && rank === '3' // 假设当前打3
    };
}

function createCards(...cards) {
    return cards.map(([suit, rank]) => createCard(suit, rank));
}

// ==================== 核心逻辑（从服务器提取用于测试）====================

/**
 * 验证出牌牌型
 */
function validatePlay(cards) {
    if (!cards || cards.length === 0) return { valid: false, type: null };
    const sorted = [...cards].sort((a, b) => a.value - b.value);

    // 单张
    if (cards.length === 1) return { valid: true, type: 'single', value: cards[0].value };

    // 对子
    if (cards.length === 2 && cards[0].value === cards[1].value) {
        return { valid: true, type: 'pair', value: cards[0].value };
    }

    // 王炸（四张王）
    if (cards.length === 4) {
        const bigJokers = cards.filter(c => c.rank === '大王').length;
        const smallJokers = cards.filter(c => c.rank === '小王').length;
        if (bigJokers === 2 && smallJokers === 2) {
            return { valid: true, type: 'rocket', value: 100 };
        }
    }

    // 三张
    if (cards.length === 3 && cards[0].value === cards[1].value && cards[1].value === cards[2].value) {
        return { valid: true, type: 'triple', value: cards[0].value };
    }

    // 三带二
    if (cards.length === 5) {
        const counts = {};
        cards.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
        const vals = Object.values(counts);
        if (vals.includes(3) && vals.includes(2)) {
            const tripleValue = Object.keys(counts).find(k => counts[k] === 3);
            return { valid: true, type: 'tripleWithPair', value: parseInt(tripleValue) };
        }
    }

    // 炸弹（4张或更多相同）
    if (cards.length >= 4 && cards.every(c => c.value === cards[0].value)) {
        return { valid: true, type: 'bomb', value: cards[0].value, length: cards.length };
    }

    // 顺子（5张或更多连续单牌）
    if (cards.length >= 5) {
        const values = sorted.map(c => c.value);
        if (values.every(v => v <= 14)) { // 不能包含王
            let isSequence = true;
            for (let i = 1; i < values.length; i++) {
                if (values[i] - values[i - 1] !== 1) {
                    isSequence = false;
                    break;
                }
            }
            if (isSequence) {
                return { valid: true, type: 'straight', value: values[values.length - 1], length: cards.length };
            }
        }
    }

    // 连对（3对或更多连续对子）
    if (cards.length >= 6 && cards.length % 2 === 0) {
        const pairValues = [];
        const sortedByValue = [...cards].sort((a, b) => a.value - b.value);
        let valid = true;
        for (let i = 0; i < sortedByValue.length; i += 2) {
            if (sortedByValue[i].value !== sortedByValue[i + 1].value) {
                valid = false;
                break;
            }
            pairValues.push(sortedByValue[i].value);
        }
        if (valid && pairValues.length >= 3) {
            pairValues.sort((a, b) => a - b);
            let isSequence = true;
            for (let i = 1; i < pairValues.length; i++) {
                if (pairValues[i] - pairValues[i - 1] !== 1) {
                    isSequence = false;
                    break;
                }
            }
            if (isSequence) {
                return { valid: true, type: 'pairStraight', value: pairValues[pairValues.length - 1], length: pairValues.length };
            }
        }
    }

    return { valid: false, type: null };
}

/**
 * 比较出牌大小
 */
function comparePlay(newPlay, lastPlay) {
    if (!lastPlay) return true;
    if (newPlay.type === 'rocket') return true;
    if (lastPlay.type === 'rocket') return false;
    if (newPlay.type === 'bomb' && lastPlay.type !== 'bomb') return true;
    if (lastPlay.type === 'bomb' && newPlay.type !== 'bomb') return false;
    if (newPlay.type === lastPlay.type) {
        if (newPlay.type === 'bomb') {
            if (newPlay.length > lastPlay.length) return true;
            if (newPlay.length < lastPlay.length) return false;
        }
        return newPlay.value > lastPlay.value;
    }
    return false;
}

/**
 * 创建牌组
 */
function createDeck() {
    const deck = [];
    for (let i = 0; i < 2; i++) {
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                deck.push(createCard(suit, rank));
            }
        }
    }
    for (let i = 0; i < 2; i++) {
        deck.push(createCard('🃏', '小王'));
        deck.push(createCard('🃏', '大王'));
    }
    return deck;
}

/**
 * 洗牌
 */
function shuffle(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * 计算升级数
 */
function calculateLevelUp(team1Ranks, team2Ranks) {
    // team1Ranks 和 team2Ranks 是每个队伍玩家的排名数组

    // 双下：搭档获得前两名
    if ((team1Ranks.includes(1) && team1Ranks.includes(2)) ||
        (team2Ranks.includes(1) && team2Ranks.includes(2))) {
        return 3;
    }

    // 单下：搭档获得第一和第三
    if ((team1Ranks.includes(1) && team1Ranks.includes(3)) ||
        (team2Ranks.includes(1) && team2Ranks.includes(3))) {
        return 2;
    }

    // 其他情况升1级
    return 1;
}

// ==================== 测试用例 ====================

describe('🃏 掼蛋游戏逻辑测试', () => {

    // ========== 牌型验证测试 ==========
    describe('牌型验证 (validatePlay)', () => {

        test('✅ 单张 - 有效', () => {
            const cards = createCards(['♠', 'A']);
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('single');
            expect(result.value).toBe(14);
        });

        test('✅ 对子 - 有效', () => {
            const cards = createCards(['♠', 'K'], ['♥', 'K']);
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('pair');
            expect(result.value).toBe(13);
        });

        test('❌ 对子 - 无效（不同点数）', () => {
            const cards = createCards(['♠', 'K'], ['♥', 'Q']);
            const result = validatePlay(cards);
            expect(result.valid).toBe(false);
        });

        test('✅ 三张 - 有效', () => {
            const cards = createCards(['♠', '10'], ['♥', '10'], ['♦', '10']);
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('triple');
            expect(result.value).toBe(10);
        });

        test('✅ 三带二 - 有效', () => {
            const cards = createCards(
                ['♠', '9'], ['♥', '9'], ['♦', '9'],  // 三张9
                ['♠', '5'], ['♥', '5']               // 一对5
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('tripleWithPair');
            expect(result.value).toBe(9);
        });

        test('✅ 炸弹（4张）- 有效', () => {
            const cards = createCards(
                ['♠', '7'], ['♥', '7'], ['♦', '7'], ['♣', '7']
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('bomb');
            expect(result.value).toBe(7);
            expect(result.length).toBe(4);
        });

        test('✅ 炸弹（6张）- 有效', () => {
            const cards = createCards(
                ['♠', 'A'], ['♥', 'A'], ['♦', 'A'], ['♣', 'A'],
                ['♠', 'A'], ['♥', 'A']  // 两副牌
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('bomb');
            expect(result.length).toBe(6);
        });

        test('✅ 王炸 - 有效（最大牌型）', () => {
            const cards = [
                createCard('🃏', '大王'), createCard('🃏', '大王'),
                createCard('🃏', '小王'), createCard('🃏', '小王')
            ];
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('rocket');
            expect(result.value).toBe(100);
        });

        test('✅ 顺子（5张）- 有效', () => {
            const cards = createCards(
                ['♠', '3'], ['♠', '4'], ['♠', '5'], ['♠', '6'], ['♠', '7']
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('straight');
            expect(result.value).toBe(7);
            expect(result.length).toBe(5);
        });

        test('✅ 顺子（10张）- 有效', () => {
            const cards = createCards(
                ['♠', '3'], ['♠', '4'], ['♠', '5'], ['♠', '6'], ['♠', '7'],
                ['♠', '8'], ['♠', '9'], ['♠', '10'], ['♠', 'J'], ['♠', 'Q']
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('straight');
            expect(result.length).toBe(10);
        });

        test('❌ 顺子 - 无效（不连续）', () => {
            const cards = createCards(
                ['♠', '3'], ['♠', '4'], ['♠', '6'], ['♠', '7'], ['♠', '8']
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(false);
        });

        test('❌ 顺子 - 无效（包含王）', () => {
            const cards = [
                ...createCards(['♠', 'J'], ['♠', 'Q'], ['♠', 'K'], ['♠', 'A']),
                createCard('🃏', '小王')
            ];
            const result = validatePlay(cards);
            expect(result.valid).toBe(false);
        });

        test('✅ 连对（3对）- 有效', () => {
            const cards = createCards(
                ['♠', '5'], ['♥', '5'],
                ['♠', '6'], ['♥', '6'],
                ['♠', '7'], ['♥', '7']
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('pairStraight');
            expect(result.value).toBe(7);
            expect(result.length).toBe(3);
        });

        test('✅ 连对（4对）- 有效', () => {
            const cards = createCards(
                ['♠', '8'], ['♥', '8'],
                ['♠', '9'], ['♥', '9'],
                ['♠', '10'], ['♥', '10'],
                ['♠', 'J'], ['♥', 'J']
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('pairStraight');
            expect(result.length).toBe(4);
        });

        test('❌ 连对 - 无效（不连续）', () => {
            const cards = createCards(
                ['♠', '5'], ['♥', '5'],
                ['♠', '7'], ['♥', '7'],  // 跳过了6
                ['♠', '8'], ['♥', '8']
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(false);
        });

        test('❌ 空数组 - 无效', () => {
            const result = validatePlay([]);
            expect(result.valid).toBe(false);
        });

        test('❌ null - 无效', () => {
            const result = validatePlay(null);
            expect(result.valid).toBe(false);
        });
    });

    // ========== 出牌比较测试 ==========
    describe('出牌比较 (comparePlay)', () => {

        test('✅ 首次出牌 - 始终有效', () => {
            const play = { type: 'single', value: 3 };
            expect(comparePlay(play, null)).toBe(true);
        });

        test('✅ 王炸 - 大于一切', () => {
            const rocket = { type: 'rocket', value: 100 };
            const bomb = { type: 'bomb', value: 14, length: 4 };
            expect(comparePlay(rocket, bomb)).toBe(true);
        });

        test('✅ 王炸 vs 王炸 - 不可能（只有一副王炸）', () => {
            // 理论上不应该出现这种情况
            const rocket1 = { type: 'rocket', value: 100 };
            const rocket2 = { type: 'rocket', value: 100 };
            expect(comparePlay(rocket1, rocket2)).toBe(true);
        });

        test('✅ 炸弹 - 大于普通牌型', () => {
            const bomb = { type: 'bomb', value: 5, length: 4 };
            const straight = { type: 'straight', value: 14, length: 5 };
            expect(comparePlay(bomb, straight)).toBe(true);
        });

        test('❌ 普通牌型 - 不能压炸弹', () => {
            const straight = { type: 'straight', value: 14, length: 5 };
            const bomb = { type: 'bomb', value: 5, length: 4 };
            expect(comparePlay(straight, bomb)).toBe(false);
        });

        test('✅ 炸弹 vs 炸弹 - 张数相同比点数', () => {
            const bomb1 = { type: 'bomb', value: 10, length: 4 };
            const bomb2 = { type: 'bomb', value: 8, length: 4 };
            expect(comparePlay(bomb1, bomb2)).toBe(true);
            expect(comparePlay(bomb2, bomb1)).toBe(false);
        });

        test('✅ 炸弹 vs 炸弹 - 张数多的大', () => {
            const bomb6 = { type: 'bomb', value: 5, length: 6 };
            const bomb4 = { type: 'bomb', value: 14, length: 4 };
            expect(comparePlay(bomb6, bomb4)).toBe(true);
        });

        test('✅ 单张比较', () => {
            const ace = { type: 'single', value: 14 };
            const king = { type: 'single', value: 13 };
            expect(comparePlay(ace, king)).toBe(true);
            expect(comparePlay(king, ace)).toBe(false);
        });

        test('✅ 对子比较', () => {
            const pairK = { type: 'pair', value: 13 };
            const pairQ = { type: 'pair', value: 12 };
            expect(comparePlay(pairK, pairQ)).toBe(true);
        });

        test('❌ 不同牌型不能比较', () => {
            const pair = { type: 'pair', value: 14 };
            const single = { type: 'single', value: 14 };
            expect(comparePlay(pair, single)).toBe(false);
            expect(comparePlay(single, pair)).toBe(false);
        });

        test('✅ 顺子比较 - 相同长度', () => {
            const straight1 = { type: 'straight', value: 10, length: 5 };
            const straight2 = { type: 'straight', value: 8, length: 5 };
            expect(comparePlay(straight1, straight2)).toBe(true);
        });

        test('✅ 连对比较', () => {
            const ps1 = { type: 'pairStraight', value: 10, length: 3 };
            const ps2 = { type: 'pairStraight', value: 8, length: 3 };
            expect(comparePlay(ps1, ps2)).toBe(true);
        });
    });

    // ========== 牌组测试 ==========
    describe('牌组管理 (createDeck)', () => {

        test('✅ 牌组总数正确（108张）', () => {
            const deck = createDeck();
            expect(deck.length).toBe(108);
        });

        test('✅ 包含4张大/小王', () => {
            const deck = createDeck();
            const bigJokers = deck.filter(c => c.rank === '大王').length;
            const smallJokers = deck.filter(c => c.rank === '小王').length;
            expect(bigJokers).toBe(2);
            expect(smallJokers).toBe(2);
        });

        test('✅ 每种花色每种点数各2张（不含王）', () => {
            const deck = createDeck();
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    const count = deck.filter(c => c.suit === suit && c.rank === rank).length;
                    expect(count).toBe(2);
                }
            }
        });
    });

    // ========== 洗牌测试 ==========
    describe('洗牌功能 (shuffle)', () => {

        test('✅ 洗牌后牌数不变', () => {
            const deck = createDeck();
            const shuffled = shuffle(deck);
            expect(shuffled.length).toBe(108);
        });

        test('✅ 洗牌后包含所有原牌', () => {
            const deck = createDeck();
            const shuffled = shuffle(deck);
            const originalIds = deck.map(c => `${c.suit}${c.rank}`).sort();
            const shuffledIds = shuffled.map(c => `${c.suit}${c.rank}`).sort();
            expect(originalIds).toEqual(shuffledIds);
        });

        test('✅ 多次洗牌结果不同（概率测试）', () => {
            const deck = createDeck();
            const shuffled1 = shuffle(deck);
            const shuffled2 = shuffle(deck);
            // 两次洗牌几乎不可能完全相同
            const same = shuffled1.every((c, i) =>
                c.suit === shuffled2[i].suit && c.rank === shuffled2[i].rank
            );
            expect(same).toBe(false);
        });
    });

    // ========== 升级规则测试 ==========
    describe('升级规则 (calculateLevelUp)', () => {

        test('✅ 双下 - 升3级', () => {
            // 红队获得第1和第2名
            const result = calculateLevelUp([1, 2], [3, 4]);
            expect(result).toBe(3);
        });

        test('✅ 单下 - 升2级', () => {
            // 红队获得第1和第3名
            const result = calculateLevelUp([1, 3], [2, 4]);
            expect(result).toBe(2);
        });

        test('✅ 平局 - 升1级', () => {
            // 红队获得第1和第4名
            const result = calculateLevelUp([1, 4], [2, 3]);
            expect(result).toBe(1);
        });

        test('✅ 红队第2、3名 - 升1级', () => {
            const result = calculateLevelUp([2, 3], [1, 4]);
            expect(result).toBe(1);
        });

        test('✅ 蓝队双下 - 升3级', () => {
            const result = calculateLevelUp([3, 4], [1, 2]);
            expect(result).toBe(3);
        });

        test('✅ 蓝队单下 - 升2级', () => {
            const result = calculateLevelUp([2, 4], [1, 3]);
            expect(result).toBe(2);
        });
    });

    // ========== 边界条件测试 ==========
    describe('边界条件测试', () => {

        test('✅ 单张2（最小单张）', () => {
            const cards = createCards(['♠', '2']);
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(2);
        });

        test('✅ 单张A（最大单张，不含王）', () => {
            const cards = createCards(['♠', 'A']);
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(14);
        });

        test('✅ 顺子包含2（最小顺子）', () => {
            const cards = createCards(
                ['♠', '2'], ['♠', '3'], ['♠', '4'], ['♠', '5'], ['♠', '6']
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.type).toBe('straight');
        });

        test('✅ 顺子到A（最大顺子）', () => {
            const cards = createCards(
                ['♠', '10'], ['♠', 'J'], ['♠', 'Q'], ['♠', 'K'], ['♠', 'A']
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(14);
        });

        test('❌ 顺子不能包含2和A同时存在（跨越问题）', () => {
            // 2-A 不是一个有效的顺子（2是最小的）
            const cards = createCards(
                ['♠', '2'], ['♠', 'K'], ['♠', 'A'], ['♠', 'Q'], ['♠', 'J']
            );
            const result = validatePlay(cards);
            expect(result.valid).toBe(false);
        });
    });

    // ========== 性能测试 ==========
    describe('性能测试', () => {

        test('⏱️ 1000次牌型验证', () => {
            const cards = createCards(
                ['♠', '3'], ['♠', '4'], ['♠', '5'], ['♠', '6'], ['♠', '7']
            );
            const start = Date.now();
            for (let i = 0; i < 1000; i++) {
                validatePlay(cards);
            }
            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(100); // 应该在100ms内完成
            console.log(`   1000次验证耗时: ${elapsed}ms`);
        });

        test('⏱️ 1000次洗牌', () => {
            const deck = createDeck();
            const start = Date.now();
            for (let i = 0; i < 1000; i++) {
                shuffle(deck);
            }
            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(500); // 应该在500ms内完成
            console.log(`   1000次洗牌耗时: ${elapsed}ms`);
        });
    });
});

// ==================== WebSocket 连接测试（可选）====================
describe('🔌 服务器连接测试（需要服务器运行）', () => {
    let WebSocket;

    beforeAll(() => {
        try {
            WebSocket = require('ws');
        } catch (e) {
            console.log('   WebSocket 模块不可用，跳过连接测试');
        }
    });

    test('🔗 服务器响应测试', async () => {
        if (!WebSocket) {
            console.log('   跳过：WebSocket 模块未安装');
            return;
        }

        return new Promise((resolve, reject) => {
            const ws = new WebSocket('ws://localhost:8081');
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('连接超时'));
            }, 5000);

            ws.on('open', () => {
                console.log('   ✅ WebSocket 连接成功');
            });

            ws.on('message', (data) => {
                clearTimeout(timeout);
                const msg = JSON.parse(data.toString());
                expect(msg.type).toBe('roomList');
                console.log('   ✅ 收到房间列表');
                ws.close();
                resolve();
            });

            ws.on('error', (err) => {
                clearTimeout(timeout);
                console.log('   ⚠️  服务器未运行，跳过连接测试');
                resolve(); // 不视为失败
            });
        });
    }, 10000);
});
