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

async function cleanDeveloperLinks() {
  console.log("=== Starting Firestore applyLink Sanitization ===");
  const colRef = collection(db, JOBS_COLLECTION);
  const snap = await getDocs(colRef);
  let updatedCount = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const currentApplyLink = data.applyLink;

    if (currentApplyLink && typeof currentApplyLink === "string") {
      let shouldUpdate = false;
      let newApplyLink = currentApplyLink;

      // Normalize all applyLinks to /apply?jobId=...
      if (
        currentApplyLink.includes("apply") ||
        currentApplyLink.includes("jobId=") ||
        currentApplyLink.includes("aisdev") ||
        currentApplyLink.includes("ais-dev-") ||
        currentApplyLink.includes(".run.app") ||
        currentApplyLink.includes("localhost") ||
        currentApplyLink.includes("spredone.in")
      ) {
        if (currentApplyLink.includes("jobId=")) {
          const match = currentApplyLink.match(/jobId=([^&]+)/);
          const recMatch = currentApplyLink.match(/recruiterId=([^&]+)/);
          const jobId = match ? match[1] : d.id;
          const recPart = recMatch ? `&recruiterId=${recMatch[1]}` : (data.recruiterId ? `&recruiterId=${data.recruiterId}` : "");
          newApplyLink = `https://recruiter.spredone.in/apply?jobId=${jobId}${recPart}`;
          shouldUpdate = true;
        } else if (currentApplyLink.includes("/apply/")) {
          const id = currentApplyLink.split("/apply/")[1]?.split("?")[0] || d.id;
          newApplyLink = `https://recruiter.spredone.in/apply?jobId=${id}`;
          shouldUpdate = true;
        } else if (currentApplyLink.startsWith("/apply") || currentApplyLink.startsWith("apply")) {
          const query = currentApplyLink.includes("?") ? currentApplyLink.split("?")[1] : `jobId=${d.id}`;
          newApplyLink = `https://recruiter.spredone.in/apply?${query}`;
          shouldUpdate = true;
        }
      }

      if (shouldUpdate && newApplyLink !== currentApplyLink) {
        console.log(`Updating Doc ID [${d.id}]:`);
        console.log(`  OLD: ${currentApplyLink}`);
        console.log(`  NEW: ${newApplyLink}`);
        await updateDoc(doc(db, JOBS_COLLECTION, d.id), {
          applyLink: newApplyLink
        });
        updatedCount++;
      }
    }
  }

  console.log(`=== Finished: ${updatedCount} document(s) updated successfully! ===`);
  process.exit(0);
}

cleanDeveloperLinks().catch((err) => {
  console.error(err);
  process.exit(1);
});
