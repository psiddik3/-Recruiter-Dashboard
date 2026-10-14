const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

if (!code.includes('signInWithEmailAndPassword')) {
  code = code.replace(
    'signInWithPopup, GoogleAuthProvider, signOut',
    'signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword'
  );
  
  const addAuthMethods = `
export const loginWithEmail = async (email, password) => {
  if (!auth) throw new Error("Firebase Auth not initialized");
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const registerWithEmail = async (email, password) => {
  if (!auth) throw new Error("Firebase Auth not initialized");
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Registration failed:", error);
    throw error;
  }
};
`;
  
  code = code.replace('export const logout = async () => {', addAuthMethods + '\nexport const logout = async () => {');
  fs.writeFileSync('src/lib/firebase.ts', code);
}
