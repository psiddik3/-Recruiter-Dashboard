import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZt0dJQCu0tW9OR9kyyliRPbP47R_z2kw",
  authDomain: "jobs-1015c.firebaseapp.com",
  projectId: "jobs-1015c"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function dump() {
  const colRef = collection(db, "founder_job_portal_jobs_v1");
  const snap = await getDocs(colRef);
  snap.docs.forEach(d => {
    console.log("ID:", d.id, "=>", d.data());
  });
}
dump().catch(console.error);
