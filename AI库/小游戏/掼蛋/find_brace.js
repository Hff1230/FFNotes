const fs = require('fs');
const html = fs.readFileSync('guandan-lan.html', 'utf-8');
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>');
const scriptContent = html.substring(scriptStart + '<script>'.length, scriptEnd);

const lines = scriptContent.split('\n');
let braces = 0;
let lastOpenBraceLine = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;

    for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '{') {
            braces++;
            lastOpenBraceLine = i + 1;
            if (braces > 5) {
                console.log('Deep nesting at line', i + 1, ': braces=', braces);
                console.log('  Content:', line.substring(0, 60));
            }
        }
        if (c === '}') {
            braces--;
            if (braces < 0) {
                console.log('Negative braces at line', i + 1);
            }
        }
    }

    // 显示最后20行的括号状态
    if (i >= lines.length - 25) {
        console.log('Line', i + 1, ': braces=', braces, ':', line.substring(0, 50));
    }
}

console.log('\nLast open brace at line:', lastOpenBraceLine);
