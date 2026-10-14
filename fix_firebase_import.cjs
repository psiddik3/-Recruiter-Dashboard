const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(/const \{ doc, setDoc \} = require\('firebase\/firestore'\);/g, '');
code = code.replace(/const \{ doc, deleteDoc \} = require\('firebase\/firestore'\);/g, '');

// Ensure doc, setDoc, deleteDoc are imported at the top
if (!code.includes('deleteDoc')) {
    code = code.replace(/import \{ doc, getDoc, setDoc, onSnapshot/g, 'import { doc, getDoc, setDoc, deleteDoc, onSnapshot');
}

fs.writeFileSync('src/lib/firebase.ts', code);
console.log('Patched firebase.ts imports');
