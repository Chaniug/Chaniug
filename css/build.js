/**
 * CSS 模块合并脚本
 * 将 css/modules/ 下的所有 CSS 文件合并成 css/personal.css
 *
 * 使用方法：
 * - 单次构建: node css/build.js
 * - 监听模式: node css/build.js --watch
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, 'modules');
const OUTPUT_FILE = path.join(__dirname, 'personal.css');

// CSS 文件的合并顺序（重要！）
const CSS_MODULES = [
    'variables.css',
    'reset.css',
    'animations.css',
    'layout.css',
    'navigation.css',
    'hero.css',
    'signature.css',
    'about.css',
    'tech-stack.css',
    'explore.css',
    'modal.css',
    'stats.css',
    'contact.css',
    'responsive.css'
];

function buildCSS() {
    console.log(`\n[${new Date().toLocaleTimeString()}] 开始合并 CSS 模块...`);

    let combinedCSS = '';
    let fileCount = 0;
    let skippedCount = 0;

    CSS_MODULES.forEach(filename => {
        const filePath = path.join(MODULES_DIR, filename);

        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            combinedCSS += `\n/* ============================================ */\n`;
            combinedCSS += `/* ${filename} */\n`;
            combinedCSS += `/* ============================================ */\n\n`;
            combinedCSS += content + '\n';
            fileCount++;
            console.log(`  ✓ ${filename}`);
        } else {
            console.log(`  ⚠ ${filename} (不存在，已跳过)`);
            skippedCount++;
        }
    });

    // 如果所有模块都不存在，保留原始 personal.css
    if (fileCount === 0) {
        console.log('\n⚠️  没有找到任何模块文件，保留原始 personal.css');
        return;
    }

    // 添加文件头注释
    const header = `/**
 * Chaniug Personal Website - Main Stylesheet
 * 由 build.js 自动生成，请勿直接编辑此文件
 * 编辑 css/modules/ 下的模块文件后运行: npm run build:css
 *
 * 生成时间: ${new Date().toISOString()}
 */

`;

    fs.writeFileSync(OUTPUT_FILE, header + combinedCSS, 'utf-8');

    console.log(`\n✅ 合并完成！`);
    console.log(`   输入: ${fileCount} 个模块`);
    if (skippedCount > 0) {
        console.log(`   跳过: ${skippedCount} 个文件`);
    }
    console.log(`   输出: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
    const stats = fs.statSync(OUTPUT_FILE);
    console.log(`   大小: ${(stats.size / 1024).toFixed(2)} KB\n`);
}

// 检查是否监听模式
const isWatchMode = process.argv.includes('--watch');

if (isWatchMode) {
    console.log('🔍 监听模式已启动...');
    console.log(`   监控目录: ${MODULES_DIR}`);
    console.log('   按 Ctrl+C 退出\n');

    // 首次构建
    buildCSS();

    // 监听文件变化
    fs.watch(MODULES_DIR, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.css')) {
            console.log(`\n📝 检测到变化: ${filename}`);
            buildCSS();
        }
    });
} else {
    // 单次构建
    buildCSS();
}
