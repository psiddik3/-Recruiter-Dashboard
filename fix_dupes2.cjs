const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/  const \[loginError, setLoginError\] = useState\(\"\"\);\n  const \[loginSuccess, setLoginSuccess\] = useState\(\"\"\);\n/g, '');
code = code.replace('  const [adminError, setAdminError] = useState("");', '  const [loginError, setLoginError] = useState("");\n  const [loginSuccess, setLoginSuccess] = useState("");\n  const [adminError, setAdminError] = useState("");');
fs.writeFileSync('src/App.tsx', code);
