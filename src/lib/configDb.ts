import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const CONFIG_DOC = "global_config";
const CONFIG_COLLECTION = "system_settings";

export const configDb = {
  async load() {
    if (!db) return null;
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  },
  async save(data: any) {
    if (!db) return;
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC);
    await setDoc(docRef, data, { merge: true });
  },
  subscribe(callback: (data: any) => void) {
    if (!db) return () => {};
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    });
  }
};
