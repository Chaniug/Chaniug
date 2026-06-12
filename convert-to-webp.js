/**
 * 将轮播图 PNG 转换为 WebP 格式
 * 运行: node convert-to-webp.js
 */

const fs = require('fs');
const path = require('path');

// 检查 sharp 是否可用
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.error('❌ 未找到 sharp 库，正在安装...');
    console.error('请运行: npm install sharp');
    process.exit(1);
}

const images = [
    { input: 'img/slide1.png', output: 'img/slide1.webp' },
    { input: 'img/slide2.png', output: 'img/slide2.webp' },
    { input: 'img/slide3.png', output: 'img/slide3.webp' },
];

async function convertImage(img) {
    const inputPath = path.join(__dirname, img.input);
    const outputPath = path.join(__dirname, img.output);

    if (!fs.existsSync(inputPath)) {
        console.log(`⚠️  文件不存在: ${img.input}`);
        return;
    }

    const stats = fs.statSync(inputPath);
    const originalSize = (stats.size / 1024 / 1024).toFixed(2);

    await sharp(inputPath)
        .webp({ quality: 80, effort: 4 })
        .toFile(outputPath);

    const newStats = fs.statSync(outputPath);
    const newSize = (newStats.size / 1024 / 1024).toFixed(2);
    const savings = ((1 - newStats.size / stats.size) * 100).toFixed(1);

    console.log(`✅ ${img.input} → ${img.output}`);
    console.log(`   原始: ${originalSize} MB → 压缩后: ${newSize} MB (减少 ${savings}%)`);
}

async function main() {
    console.log('🖼️  开始转换轮播图为 WebP 格式...\n');

    for (const img of images) {
        await convertImage(img);
    }

    console.log('\n✨ 转换完成！');
    console.log('💡 提示: 可以运行 "node convert-to-webp.js" 重新生成');
}

main().catch(console.error);
