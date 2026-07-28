const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/alert\("Failed to login with Google"\);/g, 'alert("Failed to login with Google: " + (e instanceof Error ? e.message : String(e)));');

fs.writeFileSync('src/App.tsx', code);
