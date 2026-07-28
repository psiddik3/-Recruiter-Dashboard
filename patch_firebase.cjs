const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

// Add import
code = code.replace(/createUserWithEmailAndPassword/g, 'createUserWithEmailAndPassword, sendPasswordResetEmail');

// Add export function
const exportResetFunc = `
export const resetPassword = async (email: string) => {
  if (!auth) throw new Error("Firebase auth not initialized");
  await sendPasswordResetEmail(auth, email);
};
`;

code += exportResetFunc;

fs.writeFileSync('src/lib/firebase.ts', code);
console.log('Firebase patched with resetPassword');
