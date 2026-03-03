const fs = require('fs');
const html = fs.readFileSync('guandan-lan.html', 'utf-8');

// 查找 script 标签的位置
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>');

if (scriptStart === -1 || scriptEnd === -1) {
    console.log('Script tags not found');
    process.exit(1);
}

const scriptContent = html.substring(scriptStart + '<script>'.length, scriptEnd);
fs.writeFileSync('temp_script2.js', scriptContent);

console.log('Script extracted:');
console.log('Start pos:', scriptStart);
console.log('End pos:', scriptEnd);
console.log('Length:', scriptContent.length);
console.log('Lines:', scriptContent.split('\n').length);

// 检查括号
let braces = 0, parens = 0, brackets = 0;
const lines = scriptContent.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 跳过注释行
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;

    for (let j = 0; j < line.length; j++) {
        const c = line[j];
        // 简单跳过字符串内的内容（不完全准确但够用）
        if (c === '{') braces++;
        if (c === '}') braces--;
        if (c === '(') parens++;
        if (c === ')') parens--;
        if (c === '[') brackets++;
        if (c === ']') brackets--;
    }
}
console.log('Final counts - braces:', braces, 'parens:', parens, 'brackets:', brackets);
