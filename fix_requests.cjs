const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const newCode = code + `
export const saveAccessRequest = async (request) => {
  if (!db) return;
  try {
    const { doc, setDoc } = require('firebase/firestore');
    await setDoc(doc(db, "access_requests", request.id), request);
  } catch (e) {
    console.error("Failed to save access request", e);
  }
};

export const deleteAccessRequest = async (id) => {
  if (!db) return;
  try {
    const { doc, deleteDoc } = require('firebase/firestore');
    await deleteDoc(doc(db, "access_requests", id));
  } catch (e) {}
};
`;

if (!code.includes('saveAccessRequest')) {
  fs.writeFileSync('src/lib/firebase.ts', newCode);
  console.log('Firebase helpers added');
} else {
  console.log('Already added');
}
