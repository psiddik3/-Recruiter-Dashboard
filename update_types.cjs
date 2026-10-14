const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

content = content.replace(
  'showPhoneOnApplyForm?: boolean;',
  'showPhoneOnApplyForm?: boolean;\n  hiringTarget?: string;'
);

fs.writeFileSync('src/types.ts', content, 'utf8');
