const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
  'await createUserWithEmailAndPassword, sendPasswordResetEmail(auth, email, password);',
  'await createUserWithEmailAndPassword(auth, email, password);'
);

fs.writeFileSync('src/lib/firebase.ts', code);
console.log('Fixed');
