const fs = require('fs');
const content = fs.readFileSync('script.js', 'utf-8');

// Find the languages object (first occurrence)
const start = content.indexOf('languages = {');
if (start === -1) {
    console.error('languages object not found');
    process.exit(1);
}
let braceCount = 0;
let i = start + 'languages = {'.length - 1; // position of '{'
for (; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
            break;
        }
    }
}
const objStr = content.substring(start + 'languages = '.length, i + 1);
// Evaluate the object
const languages = eval('(' + objStr + ')');
console.log(JSON.stringify(languages, null, 2));