/**
 * 简易 CSS 压缩脚本
 * - 去除注释
 * - 去除多余空白
 * - 保留所有语法字符 { } : ; ,
 * - 不做任何字符级删除，仅压缩空白和注释
 */
const fs = require('fs');
const path = require('path');

const input = path.join(__dirname, 'personal.css');
const output = path.join(__dirname, 'personal.min.css');

let css = fs.readFileSync(input, 'utf-8');

// 1. 去除块注释 /* ... */
css = css.replace(/\/\*[\s\S]*?\*\//g, '');

// 2. 去除行尾空白
css = css.replace(/[ \t]+\n/g, '\n');

// 3. 合并多个空白行为单个
css = css.replace(/\n\s*\n+/g, '\n');

// 4. 压缩选择器和声明之间的空白（不删除任何语法字符）
//    选择器与 { 之间：去掉空白
css = css.replace(/\s*\{\s*/g, '{');
//    属性名与值之间：": " → ":"
css = css.replace(/\s*:\s*/g, ':');
//    声明结尾："; " → ";"
css = css.replace(/\s*;\s*/g, ';');
//    规则结束："}" 前的 ; 可省略，但保留更安全
css = css.replace(/;\s*\}/g, '}');
//    规则之间："} " → "}"
css = css.replace(/\}\s*/g, '}');
//    逗号两侧空白
css = css.replace(/\s*,\s*/g, ',');

// 5. 最终去除首尾空白
css = css.trim();

fs.writeFileSync(output, css, 'utf-8');

const stats = fs.statSync(output);
console.log('✅ 压缩完成');
console.log('   输入: personal.css (' + (fs.statSync(input).size / 1024).toFixed(2) + ' KB)');
console.log('   输出: personal.min.css (' + (stats.size / 1024).toFixed(2) + ' KB)');

// 验证大括号配对
const open = (css.match(/{/g) || []).length;
const close = (css.match(/}/g) || []).length;
console.log('   大括号: { = ' + open + '  } = ' + close + (open === close ? '  配对正常' : '  ⚠️ 不配对!'));
