import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZt0dJQCu0tW9OR9kyyliRPbP47R_z2kw",
  authDomain: "jobs-1015c.firebaseapp.com",
  projectId: "jobs-1015c"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const JOBS_COLLECTION = "founder_job_portal_jobs_v1";

async function fixLinks() {
  const colRef = collection(db, JOBS_COLLECTION);
  const snap = await getDocs(colRef);
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.applyLink) {
      console.log(`Fixing doc ${d.id}...`);
      await updateDoc(doc(db, JOBS_COLLECTION, d.id), {
        applyLink: `mailto:${data.email || 'hr@company.com'}?subject=Application for ${encodeURIComponent(data.title || 'Job Opening')}`
      });
    }
  }
  console.log("Done!");
}

fixLinks().catch(console.error);
