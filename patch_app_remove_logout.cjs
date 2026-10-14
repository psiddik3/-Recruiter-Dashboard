const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/import\('\.\/lib\/firebase'\)\.then\(\(\{ saveAccessRequest, logout \}\) => \{ saveAccessRequest\(newRequest\); logout\(\); \}\);/g, "import('./lib/firebase').then(({ saveAccessRequest }) => { saveAccessRequest(newRequest); });");
fs.writeFileSync('src/App.tsx', code);
console.log('Removed logout from App.tsx');
