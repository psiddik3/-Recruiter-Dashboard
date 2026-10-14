const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// remove ALL duplicates
code = code.replace(/  const \[loginError, setLoginError\] = useState\(\"\"\);\n/g, '');
code = code.replace(/  const \[loginSuccess, setLoginSuccess\] = useState\(\"\"\);\n/g, '');

// now insert them back once below showRegPassword
code = code.replace(
    'const [showRegPassword, setShowRegPassword] = useState(false);',
    'const [showRegPassword, setShowRegPassword] = useState(false);\n  const [loginError, setLoginError] = useState("");\n  const [loginSuccess, setLoginSuccess] = useState("");'
);

fs.writeFileSync('src/App.tsx', code);
