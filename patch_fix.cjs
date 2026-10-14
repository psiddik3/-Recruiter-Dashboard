const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<\/div>\s*<\/>\s*\)\}\s*\{\/\* Simulated Recruiters testing help \*\/\}/, '</>\n                  )}\n                  </div>\n                  {/* Simulated Recruiters testing help */}');
fs.writeFileSync('src/App.tsx', code);
