const fs = require('fs');
const html = fs.readFileSync('guandan-lan.html', 'utf-8');
const s = html.indexOf('<script>');
const e = html.indexOf('</script>');
const js = html.substring(s + 8, e);
const lines = js.split('\n');

let b = 0;
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const before = b;
    for (const c of l) {
        if (c === '{') b++;
        if (c === '}') b--;
    }
    if (b !== before) {
        console.log('Line', i + 1, ':', b, ':', l.substring(0, 60));
    }
}
console.log('\nFinal:', b);
