const fs = require('fs');
const code = fs.readFileSync('temp_script.js', 'utf-8');
const lines = code.split('\n');
let parens = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const before = parens;
    for (const c of line) {
        if (c === '(') parens++;
        if (c === ')') parens--;
    }
    if (parens !== before) {
        console.log('Line', i + 1, ': parens', before, '->', parens, ':', line.substring(0, 70));
    }
}
