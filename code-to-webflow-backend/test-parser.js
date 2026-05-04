const fs = require('fs');
const { parseHtml } = require('./dist/parser/htmlParser.js');
const css = fs.readFileSync('../Vibecoding sites/Grande Experience/index.css', 'utf8');
const html = `<style>${css}</style><body></body>`;
const result = parseHtml(html);
const navHeight = result.collections.flatMap(c => c.variables).find(v => v.name === 'nav-height');
console.log(JSON.stringify(navHeight, null, 2));
