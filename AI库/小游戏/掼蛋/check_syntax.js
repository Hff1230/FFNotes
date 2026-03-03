const fs = require('fs');
const html = fs.readFileSync('guandan-lan.html', 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
    fs.writeFileSync('temp_script.js', scriptMatch[1]);
    console.log('Script extracted, running syntax check...');
}
