const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{\/\* FLOATING SANDBOX WORKSPACE ROUTER SWITCHER \(FOR PREVIEW NAVIGATION\) \*\/\}[\s\S]+?(?=    <\/>\n  \);\n\}\n\nexport default App;)/;

code = code.replace(regex, "{sandboxControls}\n");

fs.writeFileSync('src/App.tsx', code);
