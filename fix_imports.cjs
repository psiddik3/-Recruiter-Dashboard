const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /import \{\s*[^}]*\}\s*from "lucide-react";/g;
const match = code.match(regex);
if (match) {
    let imports = match[0];
    const newIcons = ['PartyPopper', 'ArrowRight', 'UserPlus', 'Grid', 'PieChart'];
    for (const icon of newIcons) {
        if (!imports.includes(icon)) {
            imports = imports.replace('} from "lucide-react";', `, ${icon}} from "lucide-react";`);
        }
    }
    code = code.replace(match[0], imports);
}

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed imports");
