import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, setDoc, 
  orderBy, 
  query,
  limit,
  onSnapshot
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZt0dJQCu0tW9OR9kyyliRPbP47R_z2kw",
  authDomain: "jobs-1015c.firebaseapp.com",
  projectId: "jobs-1015c"
};

// Initialize Firebase lazily & handle missing credentials gracefully
export let db: any = null;
export let auth: any = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth not initialized");
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};


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

export const logout = async () => {
  if (!auth) return;
  await signOut(auth);
};

const JOBS_COLLECTION = "founder_job_portal_jobs_v1";

export interface FirebaseJob {
  id?: string;
  company: string;
  industry: string;
  email: string;
  website?: string;
  title: string;
  jobType: string;
  location: string;
  experience: string;
  salary: string;
  openings: number | string;
  skills: string;
  description: string;
  applyLink?: string;
  lastDate?: string;
  durationDays?: number;
  expiresAt?: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  postedByFounder?: boolean;
  postedBy?: string;
}

export const portalDb = {
  async loadAll(): Promise<FirebaseJob[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, JOBS_COLLECTION);
      const q = query(colRef, orderBy("createdAt", "desc"), limit(250));
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          // Convert timestamp fields safely to string if needed
          createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : data.createdAt || new Date().toISOString()
        } as FirebaseJob;
      });
    } catch (e) {
      console.warn("Firestore fallback trigger - loading mock/empty portal list", e);
      return [];
    }
  },

  async approve(id: string): Promise<void> {
    if (!db) return;
    const docRef = doc(db, JOBS_COLLECTION, id);
    await updateDoc(docRef, {
      status: "approved",
      approvedAt: new Date().toISOString()
    });

    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        let jobId = id;
        // If the job already has a numeric ID in applyLink, use that to align with CRM
        if (data.applyLink && data.applyLink.includes("jobId=")) {
          const match = data.applyLink.match(/jobId=(\d+)/);
          if (match && match[1]) {
            jobId = match[1];
          }
        }
        await setDoc(doc(db, "home_posts", jobId), {
          jobId: jobId,
          title: data.title || "",
          experience: data.experience || "",
          salary: data.salary || "",
          location: data.location || "",
          postedBy: data.postedBy || "Rahul Sharma",
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Failed to auto-create home_post on approval", e);
    }
  },

  async reject(id: string): Promise<void> {
    if (!db) return;
    const docRef = doc(db, JOBS_COLLECTION, id);
    await updateDoc(docRef, {
      status: "rejected",
      rejectedAt: new Date().toISOString()
    });
  },

  async remove(id: string): Promise<void> {
    if (!db) return;
    const docRef = doc(db, JOBS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  async postDirect(data: Omit<FirebaseJob, "id" | "status" | "createdAt" | "approvedAt">): Promise<void> {
    if (!db) return;
    const colRef = collection(db, JOBS_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...data,
      postedBy: data.postedBy || "Rahul Sharma",
      status: "approved",
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      postedByFounder: true
    });
    try {
      await setDoc(doc(db, "home_posts", docRef.id), {
        jobId: docRef.id,
        title: data.title || "",
        experience: data.experience || "",
        salary: data.salary || "",
        location: data.location || "",
        postedBy: data.postedBy || "Rahul Sharma",
        createdAt: new Date().toISOString()
      });
    } catch (e) { console.error("Failed to auto-create home_post", e); }
  },

  async postFromCRM(data: any): Promise<string | undefined> {
    if (!db) return undefined;
    const colRef = collection(db, JOBS_COLLECTION);
    const recName = data.postedBy || "Rahul Sharma";
    const docRef = await addDoc(colRef, {
      company: data.company || "Spread One",
      industry: data.dept || "IT / Software",
      email: data.postedBy === "Sarah Jenkins" ? "sarah.j@company.com" : (data.postedBy === "David Miller" ? "david.m@company.com" : "hr@company.com"),
      website: "https://company.com",
      title: data.title,
      jobType: data.employment || "Full Time",
      location: data.location || "Remote",
      experience: data.experience || "1-3 years",
      salary: data.salary || "Not disclosed",
      openings: 1,
      skills: Array.isArray(data.skills) ? data.skills.join(", ") : (data.skills || ""),
      description: data.description || "",
      applyLink: typeof window !== "undefined" ? `${window.location.origin}/apply?jobId=${data.id}` : `https://company.com/apply/${data.id}`,
      durationDays: data.durationDays || 15,
      expiresAt: data.expiresAt || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: "approved", // Automatically active jobs in CRM are approved in portal
      createdAt: new Date().toISOString(),
      postedByFounder: data.postedBy === "Rahul Sharma",
      postedBy: recName,
      recruiterId: data.recruiterId || null
    });

    try {
      await setDoc(doc(db, "home_posts", docRef.id), {
        jobId: docRef.id,
        crmJobId: data.id,
        title: data.title || "",
        experience: data.experience || "",
        salary: data.salary || "",
        location: data.location || "",
        postedBy: recName,
        recruiterId: data.recruiterId || null,
        createdAt: new Date().toISOString()
      });
    } catch (e) { console.error("Failed to auto-create home_post", e); }
    
    return docRef.id;
  }
};

const APPLICANTS_COLLECTION = "applicants";

export const applicantsDb = {
  async loadAll(): Promise<any[]> {
    if (!db) return [];
    try {
      const colRef = collection(db, APPLICANTS_COLLECTION);
      const snap = await getDocs(colRef);
      const results = snap.docs.map(d => ({
        dbId: d.id, // Keep the firebase string ID separately
        ...d.data()
      }));
      
      // Sort in-memory to prevent Firestore from silently filtering out candidates lacking the 'appliedAt' field
      results.sort((a: any, b: any) => {
        const timeA = a.appliedAt ? new Date(a.appliedAt).getTime() : (a.applied ? new Date(a.applied).getTime() : 0);
        const timeB = b.appliedAt ? new Date(b.appliedAt).getTime() : (b.applied ? new Date(b.applied).getTime() : 0);
        return timeB - timeA;
      });
      return results;
    } catch (e) {
      console.error("Failed to load applicants from Firebase:", e);
      return [];
    }
  },

  subscribeAll(callback: (candidates: any[]) => void): () => void {
    if (!db) return () => {};
    try {
      const colRef = collection(db, APPLICANTS_COLLECTION);
      return onSnapshot(colRef, (snap) => {
        const candidates = snap.docs.map(d => ({
          dbId: d.id,
          ...d.data()
        }));
        
        // Sort in-memory to prevent Firestore from silently filtering out candidates lacking the 'appliedAt' field
        candidates.sort((a: any, b: any) => {
          const timeA = a.appliedAt ? new Date(a.appliedAt).getTime() : (a.applied ? new Date(a.applied).getTime() : 0);
          const timeB = b.appliedAt ? new Date(b.appliedAt).getTime() : (b.applied ? new Date(b.applied).getTime() : 0);
          return timeB - timeA;
        });
        callback(candidates);
      }, (err) => {
        console.error("Firestore real-time subscription error:", err);
      });
    } catch (e) {
      console.error("Failed to subscribe to applicants in Firebase:", e);
      return () => {};
    }
  },

  async apply(data: any): Promise<void> {
    if (!db) {
      console.error("Firebase DB is not initialized.");
      throw new Error("Firebase DB is not initialized.");
    }
    try {
      const colRef = collection(db, APPLICANTS_COLLECTION);
      await addDoc(colRef, {
        ...data,
        appliedAt: new Date().toISOString()
      });
      console.log("Applicant successfully submitted to Firebase.");
    } catch (error) {
      console.error("Failed to submit applicant to Firebase:", error);
      throw error;
    }
  },

  async updateStage(dbId: string, newStage: string): Promise<void> {
    if (!db) return;
    try {
      const docRef = doc(db, APPLICANTS_COLLECTION, dbId);
      await updateDoc(docRef, {
        stage: newStage,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to update applicant stage in Firebase:", error);
    }
  },

  async update(candidate: any): Promise<void> {
    if (!db) return;
    try {
      if (candidate.dbId) {
        const docRef = doc(db, APPLICANTS_COLLECTION, candidate.dbId);
        const { dbId, ...payload } = candidate;
        await updateDoc(docRef, {
          ...payload,
          updatedAt: new Date().toISOString()
        });
        console.log("Updated candidate in Firebase with dbId:", candidate.dbId);
      } else {
        const colRef = collection(db, APPLICANTS_COLLECTION);
        const snap = await getDocs(colRef);
        const docToUpdate = snap.docs.find(d => d.data().id === candidate.id);
        if (docToUpdate) {
          const docRef = doc(db, APPLICANTS_COLLECTION, docToUpdate.id);
          const { dbId, ...payload } = candidate;
          await updateDoc(docRef, {
            ...payload,
            updatedAt: new Date().toISOString()
          });
          console.log("Updated candidate in Firebase with ID via lookup:", candidate.id);
        } else {
          const { dbId, ...payload } = candidate;
          await addDoc(colRef, {
            ...payload,
            appliedAt: new Date().toISOString()
          });
          console.log("Added new candidate to Firebase during sync:", candidate.id);
        }
      }
    } catch (error) {
      console.error("Failed to update candidate in Firebase:", error);
    }
  },

  async remove(candidate: any): Promise<void> {
    if (!db) return;
    try {
      if (candidate.dbId) {
        const docRef = doc(db, APPLICANTS_COLLECTION, candidate.dbId);
        await deleteDoc(docRef);
        console.log("Deleted candidate from Firebase with dbId:", candidate.dbId);
      } else {
        const colRef = collection(db, APPLICANTS_COLLECTION);
        const snap = await getDocs(colRef);
        const docToDelete = snap.docs.find(d => d.data().id === candidate.id);
        if (docToDelete) {
          const docRef = doc(db, APPLICANTS_COLLECTION, docToDelete.id);
          await deleteDoc(docRef);
          console.log("Deleted candidate from Firebase with ID lookup:", candidate.id);
        }
      }
    } catch (error) {
      console.error("Failed to delete candidate from Firebase:", error);
    }
  }
};

export const resetPassword = async (email: string) => {
  if (!auth) throw new Error("Firebase auth not initialized");
  await sendPasswordResetEmail(auth, email);
};
