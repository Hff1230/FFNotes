/**
 * 麻将大图分割脚本
 * 将麻将大图分割成单独的牌图片
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// 麻将大图配置
const CONFIG = {
    // 原图尺寸: 617x373
    imageWidth: 617,
    imageHeight: 373,

    // 每张牌的尺寸
    tileWidth: 61.7,
    tileHeight: 93.25,

    // 行列数
    cols: 10,  // 10列
    rows: 4,   // 4 行

    // 输出目录
    outputDir: './tiles',

    // 麻将牌命名映射
    tileNames: [
        // 第0行: 筒1-9 (从第1列开始，第0列是空的或者背面)
        ['back', 'tong1', 'tong2', 'tong3', 'tong4', 'tong5', 'tong6', 'tong7', 'tong8', 'tong9'],
        // 第1行: 条1-9 (从第1列开始)
        ['back', 'tiao1', 'tiao2', 'tiao3', 'tiao4', 'tiao5', 'tiao6', 'tiao7', 'tiao8', 'tiao9'],
        // 第2行: 万1-9 (从第0列开始)
        ['wan1', 'wan2', 'wan3', 'wan4', 'wan5', 'wan6', 'wan7', 'wan8', 'wan9', 'back'],
        // 第3行: 风牌和箭牌
        ['feng_dong', 'feng_nan', 'feng_xi', 'feng_bei', 'jian_zhong', 'jian_fa', 'jian_bai', 'back', 'back', 'back']
    ]
};

async function splitTiles() {
    console.log('开始分割麻将大图...');

    // 创建输出目录
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
        console.log(`创建输出目录: ${CONFIG.outputDir}`);
    }

    // 加载大图
    const imagePath = path.join(__dirname, '麻将大图.jpg');
    console.log(`加载图片: ${imagePath}`);

    try {
        const image = await loadImage(imagePath);
        console.log(`图片加载成功，尺寸: ${image.width} x ${image.height}`);

        // 遍历每行每列
        for (let row = 0; row < CONFIG.rows; row++) {
            for (let col = 0; col < CONFIG.cols; col++) {
                const tileName = CONFIG.tileNames[row][col];

                // 跳过背面和空位
                if (tileName === 'back' || tileName === 'empty') {
                    continue;
                }

                // 计算裁剪位置
                const x = col * CONFIG.tileWidth;
                const y = row * CONFIG.tileHeight;

                // 创建 canvas
                const canvas = createCanvas(
                    Math.round(CONFIG.tileWidth),
                    Math.round(CONFIG.tileHeight)
                );
                const ctx = canvas.getContext('2d');

                // 绘制裁剪的图片
                ctx.drawImage(
                    image,
                    x, y, CONFIG.tileWidth, CONFIG.tileHeight,  // 源位置
                    0, 0, CONFIG.tileWidth, CONFIG.tileHeight   // 目标位置
                );

                // 保存图片
                const outputPath = path.join(CONFIG.outputDir, `${tileName}.png`);
                const buffer = canvas.toBuffer('image/png');
                fs.writeFileSync(outputPath, buffer);

                console.log(`已保存: ${outputPath}`);
            }
        }

        console.log('\n分割完成！');
        console.log(`共分割出 ${countTiles()} 张麻将牌图片`);

    } catch (error) {
        console.error('分割失败:', error.message);
        console.log('\n请确保已安装 canvas 库:');
        console.log('npm install canvas');
    }
}

function countTiles() {
    let count = 0;
    for (const row of CONFIG.tileNames) {
        for (const name of row) {
            if (name !== 'back' && name !== 'empty') {
                count++;
            }
        }
    }
    return count;
}

// 运行分割
splitTiles();
