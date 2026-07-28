const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /&& !merged\.some\(\(cj\) => cj\.title\.toLowerCase\(\) === mj\.title\.toLowerCase\(\) && cj\.company\.toLowerCase\(\) === mj\.company\.toLowerCase\(\)\)/g,
  `&& !merged.some((cj) => (cj.title || "").toLowerCase() === (mj.title || "").toLowerCase() && (cj.company || "").toLowerCase() === (mj.company || "").toLowerCase())`
);
fs.writeFileSync('src/App.tsx', code);
