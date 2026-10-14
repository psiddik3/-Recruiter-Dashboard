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
  where,
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

export function cleanFirestoreData<T = any>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)).filter(item => item !== undefined) as any;
  }
  if (typeof obj === "object") {
    if (typeof File !== "undefined" && obj instanceof File) return null as any;
    if (typeof Blob !== "undefined" && obj instanceof Blob) return null as any;
    
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as any;
  }
  return obj;
}

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
  externalApplyUrl?: string;
  lastDate?: string;
  durationDays?: number;
  expiresAt?: string;
  status: "pending" | "approved" | "rejected" | "closed";
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
        let cleanApplyLink = data.applyLink;
        if (cleanApplyLink && typeof cleanApplyLink === "string") {
          // Sanitize any legacy developer links (aisdev, *.run.app)
          if (cleanApplyLink.includes("aisdev") || cleanApplyLink.includes("ais-dev-") || cleanApplyLink.includes(".run.app") || cleanApplyLink.startsWith("/apply") || cleanApplyLink.startsWith("apply")) {
            const queryPart = cleanApplyLink.includes("?") ? cleanApplyLink.split("?")[1] : `jobId=${d.id}`;
            cleanApplyLink = `https://recruiter.spredone.in/apply?${queryPart}`;
          }
        }
        return { 
          id: d.id, 
          ...data,
          applyLink: cleanApplyLink,
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
        // If the job already has an ID in applyLink, use that to align with CRM
        if (data.applyLink && data.applyLink.includes("jobId=")) {
          const match = data.applyLink.match(/jobId=([^&]+)/);
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

  async updateJob(id: string, data: Partial<FirebaseJob> & { createdAt?: string; expiresAt?: string }): Promise<string | undefined> {
    if (!db) return undefined;
    try {
      let targetDocId = id;
      let docRef = doc(db, JOBS_COLLECTION, String(id));
      let docSnap = await getDoc(docRef);

      // If document does not exist by direct ID, search collection by crmJobId or id
      if (!docSnap.exists()) {
        const colRef = collection(db, JOBS_COLLECTION);
        const snap = await getDocs(colRef);
        const matchedDoc = snap.docs.find(d => {
          const dData = d.data();
          if (dData.crmJobId && String(dData.crmJobId) === String(id)) return true;
          if (dData.id && String(dData.id) === String(id)) return true;
          if (dData.applyLink && dData.applyLink.includes(`jobId=${id}`)) return true;
          if (data.title && data.company && dData.title?.toLowerCase() === data.title.toLowerCase() && dData.company?.toLowerCase() === data.company.toLowerCase()) return true;
          return false;
        });
        if (matchedDoc) {
          targetDocId = matchedDoc.id;
          docRef = doc(db, JOBS_COLLECTION, targetDocId);
          docSnap = matchedDoc;
        } else {
          // Create document if not found
          const col = collection(db, JOBS_COLLECTION);
          const newDocRef = await addDoc(col, cleanFirestoreData({
            ...data,
            crmJobId: id,
            status: data.status || "approved",
            createdAt: data.createdAt || new Date().toISOString()
          }));
          targetDocId = newDocRef.id;
          docRef = doc(db, JOBS_COLLECTION, targetDocId);
        }
      }

      const updatePayload: any = cleanFirestoreData({ ...data });
      if (updatePayload.status === "approved" && !updatePayload.expiresAt) {
        updatePayload.expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
      }
      await updateDoc(docRef, updatePayload);
      
      // Also sync to home_posts
      try {
        const homePostDoc = doc(db, "home_posts", targetDocId);
        const existingJobData = docSnap && docSnap.exists() ? docSnap.data() : {};
        const homePostData: any = cleanFirestoreData({
          jobId: targetDocId,
          crmJobId: id,
          title: data.title || existingJobData.title || "",
          experience: data.experience || existingJobData.experience || "",
          salary: data.salary || existingJobData.salary || "",
          location: data.location || existingJobData.location || "",
          postedBy: data.postedBy || existingJobData.postedBy || "Rahul Sharma",
          createdAt: data.createdAt || existingJobData.createdAt || new Date().toISOString()
        });
        await setDoc(homePostDoc, homePostData, { merge: true });
      } catch (homeErr) {
        console.warn("home_posts sync warning:", homeErr);
      }

      return targetDocId;
    } catch (e) {
      console.error("Failed to update portal job:", e);
      return undefined;
    }
  },

  async postDirect(data: Omit<FirebaseJob, "id" | "status" | "createdAt" | "approvedAt">): Promise<void> {
    if (!db) return;
    const colRef = collection(db, JOBS_COLLECTION);
    const docRef = await addDoc(colRef, cleanFirestoreData({
      ...data,
      postedBy: data.postedBy || "Rahul Sharma",
      status: "approved",
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      postedByFounder: true
    }));
    try {
      await setDoc(doc(db, "home_posts", docRef.id), cleanFirestoreData({
        jobId: docRef.id,
        title: data.title || "",
        experience: data.experience || "",
        salary: data.salary || "",
        location: data.location || "",
        postedBy: data.postedBy || "Rahul Sharma",
        createdAt: new Date().toISOString()
      }));
    } catch (e) { console.error("Failed to auto-create home_post", e); }
  },

  async postFromCRM(data: any): Promise<string | undefined> {
    if (!db) return undefined;
    const colRef = collection(db, JOBS_COLLECTION);
    const recName = data.postedBy || "Rahul Sharma";
    const applyPath = data.externalApplyUrl?.trim() || `https://recruiter.spredone.in/apply?jobId=${data.id}${data.recruiterId ? `&recruiterId=${data.recruiterId}` : ""}`;

    const docRef = await addDoc(colRef, cleanFirestoreData({
      company: data.company || "Your Company",
      industry: data.dept || "IT / Software",
      email: data.postedBy === "Sarah Jenkins" ? "sarah.j@company.com" : (data.postedBy === "David Miller" ? "david.m@company.com" : "hr@company.com"),
      website: "https://company.com",
      title: data.title,
      jobType: data.employment || "Full Time",
      location: data.location || "Remote",
      experience: data.experience || "Fresher",
      salary: data.salary || "Not disclosed",
      openings: 1,
      skills: Array.isArray(data.skills) ? data.skills.join(", ") : (data.skills || ""),
      description: data.description || "",
      applyLink: applyPath,
      externalApplyUrl: data.externalApplyUrl || null,
      crmJobId: data.id,
      durationDays: data.durationDays || 15,
      expiresAt: data.expiresAt || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: "approved", // Automatically active jobs in CRM are approved in portal
      createdAt: new Date().toISOString(),
      postedByFounder: data.postedBy === "Rahul Sharma",
      postedBy: recName,
      recruiterId: data.recruiterId || null
    }));

    try {
      await setDoc(doc(db, "home_posts", docRef.id), cleanFirestoreData({
        jobId: docRef.id,
        crmJobId: data.id,
        title: data.title || "",
        experience: data.experience || "",
        salary: data.salary || "",
        location: data.location || "",
        postedBy: recName,
        recruiterId: data.recruiterId || null,
        createdAt: new Date().toISOString()
      }));
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
      await addDoc(colRef, cleanFirestoreData({
        ...data,
        appliedAt: new Date().toISOString()
      }));
      console.log("Applicant successfully submitted to Firebase.");
    } catch (error) {
      console.error("Failed to submit applicant to Firebase:", error);
      throw error;
    }
  },

  async updateStage(candIdOrDbId: string | number, newStage: string): Promise<void> {
    if (!db) return;
    try {
      const colRef = collection(db, APPLICANTS_COLLECTION);
      let docRef: any = null;
      if (typeof candIdOrDbId === "string" && candIdOrDbId.length > 10 && !/^\d+$/.test(candIdOrDbId)) {
        docRef = doc(db, APPLICANTS_COLLECTION, candIdOrDbId);
      } else {
        const snap = await getDocs(colRef);
        const matched = snap.docs.find(d => String(d.data().id) === String(candIdOrDbId));
        if (matched) {
          docRef = doc(db, APPLICANTS_COLLECTION, matched.id);
        }
      }
      if (docRef) {
        await updateDoc(docRef, cleanFirestoreData({
          stage: newStage,
          updatedAt: new Date().toISOString()
        }));
        console.log("Updated applicant stage in Firebase:", candIdOrDbId, newStage);
      }
    } catch (error) {
      console.error("Failed to update applicant stage in Firebase:", error);
    }
  },

  async update(candidate: any): Promise<string | undefined> {
    if (!db) return undefined;
    try {
      const { dbId, ...payload } = candidate;
      const cleaned = cleanFirestoreData({
        ...payload,
        updatedAt: new Date().toISOString()
      });

      if (candidate.dbId) {
        const docRef = doc(db, APPLICANTS_COLLECTION, candidate.dbId);
        await updateDoc(docRef, cleaned);
        console.log("Updated candidate in Firebase with dbId:", candidate.dbId);
        return candidate.dbId;
      } else {
        const colRef = collection(db, APPLICANTS_COLLECTION);
        const snap = await getDocs(colRef);
        const docToUpdate = snap.docs.find(d => String(d.data().id) === String(candidate.id) || (candidate.email && d.data().email?.toLowerCase() === candidate.email.toLowerCase()));
        if (docToUpdate) {
          const docRef = doc(db, APPLICANTS_COLLECTION, docToUpdate.id);
          await updateDoc(docRef, cleaned);
          console.log("Updated candidate in Firebase with ID via lookup:", candidate.id);
          return docToUpdate.id;
        } else {
          const newDoc = await addDoc(colRef, cleanFirestoreData({
            ...cleaned,
            appliedAt: new Date().toISOString()
          }));
          console.log("Added new candidate to Firebase during sync:", candidate.id);
          return newDoc.id;
        }
      }
    } catch (error) {
      console.error("Failed to update candidate in Firebase:", error);
      return undefined;
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

export interface CommentItem {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface HomePost {
  id: string;
  title: string;
  content?: string;
  snippet?: string;
  postedBy?: string;
  authorRole?: string;
  category?: string;
  status: "published" | "draft";
  viewsCount?: number;
  likesCount?: number;
  comments?: CommentItem[];
  createdAt?: string;
  jobId?: string;
  experience?: string;
  salary?: string;
  location?: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  category: string;
  postedBy: string;
  authorRole?: string;
  status: "published" | "draft";
  upvotesCount?: number;
  commentsCount?: number;
  answers?: CommentItem[];
  createdAt?: string;
}

const HOME_POSTS_COLLECTION = "home_posts";
const COMMUNITY_POSTS_COLLECTION = "community_posts";

const INITIAL_HOME_POSTS: Omit<HomePost, "id">[] = [
  {
    title: "How to Prepare for Senior Full Stack Developer Interviews in 2026",
    content: "With microservices, distributed systems, and modern AI SDK integration becoming standard requirements, senior software engineers must demonstrate system design mastery and clean code architecture.\n\nKey Focus Areas:\n1. System Scalability & Micro-frontends\n2. Real-time Firebase & Cloud Database Architecture\n3. Algorithmic Problem Solving with Clean Design Patterns",
    snippet: "Essential guide covering architectural patterns, state management, and API design for modern engineering roles.",
    postedBy: "Alex Chen",
    authorRole: "Tech Lead & Recruiter",
    category: "Career & Tech",
    status: "published",
    viewsCount: 142,
    likesCount: 29,
    comments: [
      { id: "c1", author: "David Miller", text: "Great architectural breakdown! System design is crucial for senior roles.", createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: "c2", author: "Anita Roy", text: "Saved this for my upcoming technical interview round.", createdAt: new Date(Date.now() - 1800000).toISOString() }
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Top 10 High-Growth AI & Tech Startups Actively Hiring Remote Talent",
    content: "Looking for your next engineering role? Check out these 10 fast-moving startups with open positions in React, TypeScript, Cloud Infrastructure, and AI Engineering.\n\nFeatured roles include Senior Frontend Developer, Lead AI Engineer, and Cloud Architect with competitive base + equity packages.",
    snippet: "Curated list of venture-backed startups with flexible hybrid and remote work options.",
    postedBy: "Sarah Jenkins",
    authorRole: "Senior Talent Partner",
    category: "Market Insights",
    status: "published",
    viewsCount: 230,
    likesCount: 54,
    comments: [
      { id: "c3", author: "Kenji Sato", text: "Are these startups offering full remote flexibility for international applicants?", createdAt: new Date(Date.now() - 7200000).toISOString() }
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Navigating Competitive Salary Negotiations for Engineering Roles",
    content: "Understanding equity packages, base salary benchmarks, and performance bonuses when evaluating multiple job offers.\n\nWhen evaluating compensation packages, ensure you compare cost of living metrics and vesting schedules.",
    snippet: "Practical framework for candidate compensation negotiations.",
    postedBy: "Marcus Vance",
    authorRole: "Head of People",
    category: "Salary & Hiring",
    status: "published",
    viewsCount: 98,
    likesCount: 18,
    comments: [],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_COMMUNITY_POSTS: Omit<CommunityPost, "id">[] = [
  {
    title: "What are the essential skills required for a Lead AI Engineer role today?",
    content: "Interested to hear from hiring managers and tech leads: what specific skillsets do you prioritize most between LLM orchestration, model evaluation, and backend scaling?\n\nWe are currently revising our technical interview rubric and would appreciate community feedback on practical coding tests.",
    category: "Career Guidance",
    postedBy: "Priya Sharma",
    authorRole: "Software Engineer",
    status: "published",
    upvotesCount: 34,
    commentsCount: 2,
    answers: [
      { id: "a1", author: "Michael Chang", text: "We prioritize clean API wrapping, fallback handling, and latency optimization over raw prompt engineering.", createdAt: new Date(Date.now() - 5000000).toISOString() },
      { id: "a2", author: "Jessica Lee", text: "Backend scaling and evaluation harnesses are essential. Anyone can write a prompt, but production stability is key.", createdAt: new Date(Date.now() - 2000000).toISOString() }
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "How is your company handling hybrid vs fully remote work policies in 2026?",
    content: "Are recruiters seeing higher candidate response rates for 100% remote roles compared to 3-day office hybrid models?\n\nWe've noticed a 40% increase in inbound applications when offering remote options.",
    category: "Work Culture",
    postedBy: "Daniel Kim",
    authorRole: "Engineering Manager",
    status: "published",
    upvotesCount: 45,
    commentsCount: 1,
    answers: [
      { id: "a3", author: "Robert Smith", text: "100% remote positions consistently yield 3x more senior applicants in our pipeline.", createdAt: new Date(Date.now() - 8000000).toISOString() }
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Best resources for mastering Drizzle ORM and Cloud SQL integration?",
    content: "Looking for recommended guides or patterns for building fast PostgreSQL database migrations in React + Vite full-stack setups.\n\nSpecifically interested in schema synchronization techniques.",
    category: "Tech Stack",
    postedBy: "Elena Rostova",
    authorRole: "Full Stack Developer",
    status: "published",
    upvotesCount: 21,
    commentsCount: 0,
    answers: [],
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  }
];

let localHomePosts: HomePost[] = INITIAL_HOME_POSTS.map((p, idx) => ({ id: `mock-home-${idx}`, ...p }));
let homeSubscribers: Array<(posts: HomePost[]) => void> = [];

const notifyHomeSubscribers = () => {
  homeSubscribers.forEach(cb => cb([...localHomePosts]));
};

export const homeFeedDb = {
  async loadAll(): Promise<HomePost[]> {
    if (!db) return [...localHomePosts];
    try {
      const colRef = collection(db, HOME_POSTS_COLLECTION);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        const hasSeeded = localStorage.getItem("firestore_home_seeded_v1");
        if (!hasSeeded) {
          localStorage.setItem("firestore_home_seeded_v1", "true");
          console.log("[FIRESTORE_SEED] First-time seeding INITIAL_HOME_POSTS to Firestore collection:", HOME_POSTS_COLLECTION);
          for (const p of INITIAL_HOME_POSTS) {
            await addDoc(colRef, p);
          }
          const snap2 = await getDocs(colRef);
          const posts = snap2.docs.map(d => ({ id: d.id, status: "published", ...d.data() } as HomePost));
          localHomePosts = posts;
          return posts;
        } else {
          localHomePosts = [];
          return [];
        }
      }
      localStorage.setItem("firestore_home_seeded_v1", "true");
      const posts: HomePost[] = snap.docs.map(d => {
        const data = d.data();
        const rawComments = Array.isArray(data.comments) ? data.comments : [];
        const normalizedComments = rawComments.map((c: any, idx: number) => ({
          ...c,
          id: c.id || `comment-${idx}-${c.createdAt || c.text?.slice(0, 8) || Math.random().toString(36).substring(2, 6)}`
        }));
        return {
          id: d.id,
          status: "published",
          ...data,
          comments: normalizedComments
        } as HomePost;
      });
      posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      localHomePosts = posts;
      return posts;
    } catch (e) {
      console.error("Failed loading home posts:", e);
      return [...localHomePosts];
    }
  },

  subscribeAll(callback: (posts: HomePost[]) => void): () => void {
    if (!db) {
      homeSubscribers.push(callback);
      callback([...localHomePosts]);
      return () => {
        homeSubscribers = homeSubscribers.filter(cb => cb !== callback);
      };
    }
    try {
      const colRef = collection(db, HOME_POSTS_COLLECTION);
      return onSnapshot(colRef, async (snap) => {
        if (snap.empty) {
          const hasSeeded = localStorage.getItem("firestore_home_seeded_v1");
          if (!hasSeeded) {
            localStorage.setItem("firestore_home_seeded_v1", "true");
            console.log("[FIRESTORE_SEED] First-time seeding INITIAL_HOME_POSTS into Firestore collection:", HOME_POSTS_COLLECTION);
            for (const p of INITIAL_HOME_POSTS) {
              await addDoc(colRef, p);
            }
            return;
          } else {
            console.log(`[FIRESTORE_SNAPSHOT] Home posts collection "${HOME_POSTS_COLLECTION}" is empty.`);
            localHomePosts = [];
            callback([]);
            return;
          }
        }
        localStorage.setItem("firestore_home_seeded_v1", "true");
        const posts: HomePost[] = snap.docs.map(d => {
          const data = d.data();
          const rawComments = Array.isArray(data.comments) ? data.comments : [];
          const normalizedComments = rawComments.map((c: any, idx: number) => ({
            ...c,
            id: c.id || `comment-${idx}-${c.createdAt || c.text?.slice(0, 8) || Math.random().toString(36).substring(2, 6)}`
          }));
          return {
            id: d.id,
            title: data.title || "Untitled",
            content: data.content || "",
            snippet: data.snippet || "",
            postedBy: data.postedBy || "Author",
            authorRole: data.authorRole || "Contributor",
            category: data.category || "General",
            status: data.status || "published",
            viewsCount: data.viewsCount || 0,
            likesCount: data.likesCount || 0,
            comments: normalizedComments,
            createdAt: data.createdAt || new Date().toISOString()
          } as HomePost;
        });
        posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        localHomePosts = posts;
        callback(posts);
      }, (err) => {
        console.error("Firestore home_posts subscription error:", err);
      });
    } catch (e) {
      console.error("Failed home_posts subscription:", e);
      return () => {};
    }
  },

  async createPost(data: Omit<HomePost, "id" | "createdAt">): Promise<string | undefined> {
    const newId = `post-${Date.now()}`;
    const newPostItem: HomePost = {
      ...data,
      id: newId,
      status: data.status || "published",
      viewsCount: data.viewsCount || 1,
      likesCount: data.likesCount || 0,
      createdAt: new Date().toISOString()
    };
    localHomePosts = [newPostItem, ...localHomePosts];
    notifyHomeSubscribers();

    if (!db) return newId;
    try {
      const colRef = collection(db, HOME_POSTS_COLLECTION);
      const docRef = await addDoc(colRef, {
        ...data,
        status: data.status || "published",
        viewsCount: data.viewsCount || 1,
        likesCount: data.likesCount || 0,
        createdAt: new Date().toISOString()
      });
      console.log(`[FIRESTORE_CREATE_SUCCESS] Created new home post doc ID "${docRef.id}" in collection "${HOME_POSTS_COLLECTION}"`);
      return docRef.id;
    } catch (e) {
      console.error("Failed creating home post:", e);
      return newId;
    }
  },

  async updatePost(id: string, data: Partial<HomePost>): Promise<void> {
    localHomePosts = localHomePosts.map(p => p.id === id ? { ...p, ...data } : p);
    notifyHomeSubscribers();

    if (!db) return;
    try {
      const docRef = doc(db, HOME_POSTS_COLLECTION, id);
      await updateDoc(docRef, data);
      console.log(`[FIRESTORE_UPDATE_SUCCESS] Updated doc ID "${id}" in collection "${HOME_POSTS_COLLECTION}"`);
    } catch (e) {
      console.error("Failed updating home post:", e);
    }
  },

  async deletePost(id: string): Promise<void> {
    console.log(`[DELETE_CLICKED] homeFeedDb.deletePost execution triggered for doc ID: "${id}"`);
    console.log(`[FIRESTORE_DELETE_REQUEST] Target Collection: "${HOME_POSTS_COLLECTION}", Document ID: "${id}"`);

    localHomePosts = localHomePosts.filter(p => p.id !== id);
    notifyHomeSubscribers();

    if (!db) {
      console.warn(`[FIRESTORE_DELETE_FAIL] Firestore 'db' instance is null. Cannot perform delete on collection "${HOME_POSTS_COLLECTION}".`);
      alert(`Firestore DB Error: Database connection is not available.`);
      return;
    }
    try {
      const docRef = doc(db, HOME_POSTS_COLLECTION, id);
      console.log(`[FIRESTORE_DELETE_EXECUTING] Awaiting deleteDoc on collection "${HOME_POSTS_COLLECTION}", doc ID "${id}"...`);
      await deleteDoc(docRef);
      console.log("Delete completed");

      // Verify immediately with getDoc
      const verifySnap = await getDoc(docRef);
      const existsAfterDelete = verifySnap.exists();
      console.log("Exists after delete:", existsAfterDelete);

      if (existsAfterDelete) {
        console.error(`[FIRESTORE_DELETE_FAILED] Document "${id}" STILL EXISTS in collection "${HOME_POSTS_COLLECTION}" after deleteDoc() execution!`);
        alert(`Firestore Delete Verification Failed: Document ${id} still exists in collection ${HOME_POSTS_COLLECTION}.`);
      } else {
        console.log(`[FIRESTORE_DELETE_SUCCESS] Confirmed: Document ID "${id}" was PERMANENTLY deleted from Firestore collection "${HOME_POSTS_COLLECTION}".`);
      }
    } catch (e: any) {
      console.error(`[FIRESTORE_DELETE_ERROR] Exact Firestore error deleting doc ID "${id}" from collection "${HOME_POSTS_COLLECTION}":`, e);
      alert(`Firestore Delete Error (${HOME_POSTS_COLLECTION}/${id}): ${e?.message || e}`);
    }
  },

  async addComment(postId: string, comment: { author: string; text: string; id?: string }): Promise<void> {
    const newCommentItem: CommentItem = {
      id: comment.id || `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: comment.author,
      text: comment.text,
      createdAt: new Date().toISOString()
    };
    localHomePosts = localHomePosts.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: [...(p.comments || []), newCommentItem]
      };
    });
    notifyHomeSubscribers();

    if (!db) return;
    try {
      const docRef = doc(db, HOME_POSTS_COLLECTION, postId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentData = snap.data() as HomePost;
        const currentComments = Array.isArray(currentData.comments) ? currentData.comments : [];
        const updatedComments = [...currentComments, newCommentItem];
        await updateDoc(docRef, { comments: updatedComments });
        console.log(`[FIRESTORE_ADD_COMMENT_SUCCESS] Added comment "${newCommentItem.id}" to doc "${postId}" in collection "${HOME_POSTS_COLLECTION}"`);
      }
    } catch (e) {
      console.error("Failed adding comment to home post:", e);
    }
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    console.log(`[DELETE_CLICKED] homeFeedDb.deleteComment execution triggered for commentId: "${commentId}" on postId: "${postId}"`);
    if (!commentId) return;

    localHomePosts = localHomePosts.map(p => {
      if (p.id !== postId) return p;
      const currentComments = p.comments || [];
      const targetIdx = currentComments.findIndex((c, idx) => {
        if (c.id === commentId) return true;
        const fallbackId = `comment-${idx}-${c.createdAt || c.text?.slice(0, 8) || ''}`;
        return fallbackId === commentId;
      });

      if (targetIdx !== -1) {
        return {
          ...p,
          comments: currentComments.filter((_, i) => i !== targetIdx)
        };
      }
      return {
        ...p,
        comments: currentComments.filter(c => c.id && c.id !== commentId)
      };
    });
    notifyHomeSubscribers();

    if (!db) {
      console.warn(`[FIRESTORE_DELETE_FAIL] Firestore 'db' instance is null. Cannot remove comment "${commentId}".`);
      return;
    }
    try {
      const docRef = doc(db, HOME_POSTS_COLLECTION, postId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentData = snap.data() as HomePost;
        const currentComments = Array.isArray(currentData.comments) ? currentData.comments : [];
        let targetIdx = currentComments.findIndex((c: any, idx: number) => {
          if (c.id === commentId) return true;
          const fallbackId = `comment-${idx}-${c.createdAt || c.text?.slice(0, 8) || ''}`;
          return fallbackId === commentId;
        });

        let updatedComments: any[] = [];
        if (targetIdx !== -1) {
          updatedComments = currentComments.filter((_, i) => i !== targetIdx);
        } else {
          updatedComments = currentComments.filter((c: any) => c.id && c.id !== commentId);
        }

        await updateDoc(docRef, { comments: updatedComments });
        console.log(`[FIRESTORE_DELETE_SUCCESS] Single comment "${commentId}" successfully removed from doc "${postId}".`);
      }
    } catch (e: any) {
      console.error(`[FIRESTORE_DELETE_ERROR] Failed deleting comment "${commentId}" from doc "${postId}":`, e);
    }
  }
};

let localCommunityPosts: CommunityPost[] = INITIAL_COMMUNITY_POSTS.map((p, idx) => ({ id: `mock-comm-${idx}`, ...p }));
let communitySubscribers: Array<(posts: CommunityPost[]) => void> = [];

const notifyCommunitySubscribers = () => {
  communitySubscribers.forEach(cb => cb([...localCommunityPosts]));
};

export const communityFeedDb = {
  async loadAll(): Promise<CommunityPost[]> {
    if (!db) return [...localCommunityPosts];
    try {
      const colRef = collection(db, COMMUNITY_POSTS_COLLECTION);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        const hasSeeded = localStorage.getItem("firestore_community_seeded_v1");
        if (!hasSeeded) {
          localStorage.setItem("firestore_community_seeded_v1", "true");
          console.log("[FIRESTORE_SEED] First-time seeding INITIAL_COMMUNITY_POSTS to Firestore collection:", COMMUNITY_POSTS_COLLECTION);
          for (const p of INITIAL_COMMUNITY_POSTS) {
            await addDoc(colRef, p);
          }
          const snap2 = await getDocs(colRef);
          const posts = snap2.docs.map(d => ({ id: d.id, status: "published", ...d.data() } as CommunityPost));
          localCommunityPosts = posts;
          return posts;
        } else {
          localCommunityPosts = [];
          return [];
        }
      }
      localStorage.setItem("firestore_community_seeded_v1", "true");
      const posts: CommunityPost[] = snap.docs.map(d => {
        const data = d.data();
        const rawAnswers = Array.isArray(data.answers) && data.answers.length > 0 ? data.answers
                         : Array.isArray(data.comments) && data.comments.length > 0 ? data.comments
                         : Array.isArray(data.responses) && data.responses.length > 0 ? data.responses
                         : Array.isArray(data.replies) ? data.replies
                         : (Array.isArray(data.answers) ? data.answers : []);

        const normalizedAnswers = rawAnswers.map((a: any, idx: number) => ({
          ...a,
          id: a.id || `answer-${idx}-${a.createdAt || (a.text || a.comment || a.content || '').slice(0, 8) || Math.random().toString(36).substring(2, 6)}`,
          author: a.author || a.userName || a.user || a.postedBy || "Community Member",
          text: a.text || a.comment || a.content || a.message || "",
          createdAt: a.createdAt || new Date().toISOString()
        }));

        const title = data.title || data.question || data.questionTitle || data.text || data.heading || "Untitled Question";
        const content = data.content || data.details || data.description || data.body || (data.text !== title ? data.text : "") || "";

        return {
          id: d.id,
          status: data.status || "published",
          category: data.category || "General",
          postedBy: data.postedBy || data.author || "Member",
          authorRole: data.authorRole || "Contributor",
          upvotesCount: data.upvotesCount || 0,
          ...data,
          title,
          content,
          answers: normalizedAnswers,
          commentsCount: normalizedAnswers.length,
          createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : (data.createdAt || new Date().toISOString())
        } as CommunityPost;
      });
      posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      localCommunityPosts = posts;
      return posts;
    } catch (e) {
      console.error("Failed loading community posts:", e);
      return [...localCommunityPosts];
    }
  },

  subscribeAll(callback: (posts: CommunityPost[]) => void): () => void {
    if (!db) {
      communitySubscribers.push(callback);
      callback([...localCommunityPosts]);
      return () => {
        communitySubscribers = communitySubscribers.filter(cb => cb !== callback);
      };
    }
    try {
      const colRef = collection(db, COMMUNITY_POSTS_COLLECTION);
      return onSnapshot(colRef, async (snap) => {
        if (snap.empty) {
          const hasSeeded = localStorage.getItem("firestore_community_seeded_v1");
          if (!hasSeeded) {
            localStorage.setItem("firestore_community_seeded_v1", "true");
            console.log("[FIRESTORE_SEED] First-time seeding INITIAL_COMMUNITY_POSTS into Firestore collection:", COMMUNITY_POSTS_COLLECTION);
            for (const p of INITIAL_COMMUNITY_POSTS) {
              await addDoc(colRef, p);
            }
            return;
          } else {
            console.log(`[FIRESTORE_SNAPSHOT] Community posts collection "${COMMUNITY_POSTS_COLLECTION}" is empty.`);
            localCommunityPosts = [];
            callback([]);
            return;
          }
        }
        localStorage.setItem("firestore_community_seeded_v1", "true");
        const posts: CommunityPost[] = snap.docs.map(d => {
          const data = d.data();
          const rawAnswers = Array.isArray(data.answers) && data.answers.length > 0 ? data.answers
                           : Array.isArray(data.comments) && data.comments.length > 0 ? data.comments
                           : Array.isArray(data.responses) && data.responses.length > 0 ? data.responses
                           : Array.isArray(data.replies) ? data.replies
                           : (Array.isArray(data.answers) ? data.answers : []);

          const normalizedAnswers = rawAnswers.map((a: any, idx: number) => ({
            ...a,
            id: a.id || `answer-${idx}-${a.createdAt || (a.text || a.comment || a.content || '').slice(0, 8) || Math.random().toString(36).substring(2, 6)}`,
            author: a.author || a.userName || a.user || a.postedBy || "Community Member",
            text: a.text || a.comment || a.content || a.message || "",
            createdAt: a.createdAt || new Date().toISOString()
          }));

          const title = data.title || data.question || data.questionTitle || data.text || data.heading || "Untitled Question";
          const content = data.content || data.details || data.description || data.body || (data.text !== title ? data.text : "") || "";

          return {
            id: d.id,
            status: data.status || "published",
            category: data.category || "General",
            postedBy: data.postedBy || data.author || "Member",
            authorRole: data.authorRole || "Contributor",
            upvotesCount: data.upvotesCount || 0,
            ...data,
            title,
            content,
            answers: normalizedAnswers,
            commentsCount: normalizedAnswers.length,
            createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : (data.createdAt || new Date().toISOString())
          } as CommunityPost;
        });
        posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        localCommunityPosts = posts;
        callback(posts);
      }, (err) => {
        console.error("Firestore community_posts subscription error:", err);
      });
    } catch (e) {
      console.error("Failed community_posts subscription:", e);
      return () => {};
    }
  },

  async createPost(data: Omit<CommunityPost, "id" | "createdAt">): Promise<string | undefined> {
    const newId = `comm-${Date.now()}`;
    const newPostItem: CommunityPost = {
      ...data,
      id: newId,
      status: data.status || "published",
      upvotesCount: data.upvotesCount || 0,
      commentsCount: data.commentsCount || 0,
      createdAt: new Date().toISOString()
    };
    localCommunityPosts = [newPostItem, ...localCommunityPosts];
    notifyCommunitySubscribers();

    if (!db) return newId;
    try {
      const colRef = collection(db, COMMUNITY_POSTS_COLLECTION);
      const docRef = await addDoc(colRef, {
        ...data,
        status: data.status || "published",
        upvotesCount: data.upvotesCount || 0,
        commentsCount: data.commentsCount || 0,
        createdAt: new Date().toISOString()
      });
      console.log(`[FIRESTORE_CREATE_SUCCESS] Created new community question doc ID "${docRef.id}" in collection "${COMMUNITY_POSTS_COLLECTION}"`);
      return docRef.id;
    } catch (e) {
      console.error("Failed creating community post:", e);
      return newId;
    }
  },

  async updatePost(id: string, data: Partial<CommunityPost>): Promise<void> {
    localCommunityPosts = localCommunityPosts.map(p => p.id === id ? { ...p, ...data } : p);
    notifyCommunitySubscribers();

    if (!db) return;
    try {
      const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, id);
      await updateDoc(docRef, data);
      console.log(`[FIRESTORE_UPDATE_SUCCESS] Updated doc ID "${id}" in collection "${COMMUNITY_POSTS_COLLECTION}"`);
    } catch (e) {
      console.error("Failed updating community post:", e);
    }
  },

  async deletePost(id: string): Promise<void> {
    console.log(`[DELETE_CLICKED] communityFeedDb.deletePost execution triggered for doc ID: "${id}"`);
    console.log(`[FIRESTORE_DELETE_REQUEST] Target Collection: "${COMMUNITY_POSTS_COLLECTION}", Document ID: "${id}"`);

    localCommunityPosts = localCommunityPosts.filter(p => p.id !== id);
    notifyCommunitySubscribers();

    if (!db) {
      console.warn(`[FIRESTORE_DELETE_FAIL] Firestore 'db' instance is null. Cannot perform delete on collection "${COMMUNITY_POSTS_COLLECTION}".`);
      alert(`Firestore DB Error: Database connection is not available.`);
      return;
    }
    try {
      const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, id);
      console.log(`[FIRESTORE_DELETE_EXECUTING] Awaiting deleteDoc on collection "${COMMUNITY_POSTS_COLLECTION}", doc ID "${id}"...`);
      await deleteDoc(docRef);
      console.log("Delete completed");

      // Verify immediately with getDoc
      const verifySnap = await getDoc(docRef);
      const existsAfterDelete = verifySnap.exists();
      console.log("Exists after delete:", existsAfterDelete);

      if (existsAfterDelete) {
        console.error(`[FIRESTORE_DELETE_FAILED] Document "${id}" STILL EXISTS in collection "${COMMUNITY_POSTS_COLLECTION}" after deleteDoc() execution!`);
        alert(`Firestore Delete Verification Failed: Document ${id} still exists in collection ${COMMUNITY_POSTS_COLLECTION}.`);
      } else {
        console.log(`[FIRESTORE_DELETE_SUCCESS] Confirmed: Document ID "${id}" was PERMANENTLY deleted from Firestore collection "${COMMUNITY_POSTS_COLLECTION}".`);
      }
    } catch (e: any) {
      console.error(`[FIRESTORE_DELETE_ERROR] Exact Firestore error deleting doc ID "${id}" from collection "${COMMUNITY_POSTS_COLLECTION}":`, e);
      alert(`Firestore Delete Error (${COMMUNITY_POSTS_COLLECTION}/${id}): ${e?.message || e}`);
    }
  },

  async addAnswer(postId: string, answer: { author: string; text: string; id?: string }): Promise<void> {
    const newAnswerItem: CommentItem = {
      id: answer.id || `answer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: answer.author,
      text: answer.text,
      createdAt: new Date().toISOString()
    };
    localCommunityPosts = localCommunityPosts.map(p => {
      if (p.id !== postId) return p;
      const updatedAnswers = [...(p.answers || []), newAnswerItem];
      return {
        ...p,
        answers: updatedAnswers,
        commentsCount: updatedAnswers.length
      };
    });
    notifyCommunitySubscribers();

    if (!db) return;
    try {
      const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, postId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentData = snap.data() as CommunityPost;
        const currentAnswers = Array.isArray(currentData.answers) ? currentData.answers : [];
        const updatedAnswers = [...currentAnswers, newAnswerItem];
        await updateDoc(docRef, { 
          answers: updatedAnswers,
          commentsCount: updatedAnswers.length
        });
        console.log(`[FIRESTORE_ADD_ANSWER_SUCCESS] Added answer "${newAnswerItem.id}" to doc "${postId}" in collection "${COMMUNITY_POSTS_COLLECTION}"`);
      }
    } catch (e) {
      console.error("Failed adding answer to community post:", e);
    }
  },

  async deleteAnswer(postId: string, answerId: string): Promise<void> {
    console.log(`[DELETE_CLICKED] communityFeedDb.deleteAnswer execution triggered for answerId: "${answerId}" on postId: "${postId}"`);
    if (!answerId) return;

    localCommunityPosts = localCommunityPosts.map(p => {
      if (p.id !== postId) return p;
      const currentAnswers = p.answers || [];
      const targetIdx = currentAnswers.findIndex((a, idx) => {
        if (a.id === answerId) return true;
        const fallbackId = `answer-${idx}-${a.createdAt || a.text?.slice(0, 8) || ''}`;
        return fallbackId === answerId;
      });

      if (targetIdx !== -1) {
        const remaining = currentAnswers.filter((_, i) => i !== targetIdx);
        return { ...p, answers: remaining, commentsCount: remaining.length };
      }

      const remaining = currentAnswers.filter(a => a.id && a.id !== answerId);
      return { ...p, answers: remaining, commentsCount: remaining.length };
    });
    notifyCommunitySubscribers();

    if (!db) {
      console.warn(`[FIRESTORE_DELETE_FAIL] Firestore 'db' instance is null. Cannot remove answer "${answerId}".`);
      return;
    }
    try {
      const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, postId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentData = snap.data() as CommunityPost;
        const currentAnswers = Array.isArray(currentData.answers) ? currentData.answers : [];
        let targetIdx = currentAnswers.findIndex((a: any, idx: number) => {
          if (a.id === answerId) return true;
          const fallbackId = `answer-${idx}-${a.createdAt || a.text?.slice(0, 8) || ''}`;
          return fallbackId === answerId;
        });

        let updatedAnswers: any[] = [];
        if (targetIdx !== -1) {
          updatedAnswers = currentAnswers.filter((_, i) => i !== targetIdx);
        } else {
          updatedAnswers = currentAnswers.filter((a: any) => a.id && a.id !== answerId);
        }

        await updateDoc(docRef, { 
          answers: updatedAnswers,
          commentsCount: updatedAnswers.length
        });
        console.log(`[FIRESTORE_DELETE_SUCCESS] Single answer "${answerId}" successfully removed from doc "${postId}".`);
      }
    } catch (e: any) {
      console.error(`[FIRESTORE_DELETE_ERROR] Failed deleting answer "${answerId}" from doc "${postId}":`, e);
    }
  },

  async deleteAllAnswers(postId: string): Promise<void> {
    console.log(`[DELETE_ALL_ANSWERS] Clearing all answers for postId: "${postId}"`);
    localCommunityPosts = localCommunityPosts.map(p => {
      if (p.id !== postId) return p;
      return { ...p, answers: [], commentsCount: 0 };
    });
    notifyCommunitySubscribers();

    if (!db) return;
    try {
      const docRef = doc(db, COMMUNITY_POSTS_COLLECTION, postId);
      await updateDoc(docRef, { answers: [], commentsCount: 0, comments: [], responses: [], replies: [] });
      console.log(`[FIRESTORE_DELETE_ALL_SUCCESS] Cleared all answers for doc "${postId}".`);
    } catch (e: any) {
      console.error(`[FIRESTORE_DELETE_ALL_ERROR] Failed clearing all answers for doc "${postId}":`, e);
    }
  }
};

export interface StartupPost {
  id: string;
  category: string;
  sourceName: string;
  title: string;
  article: string;
  sourceUrl: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

const STARTUP_POSTS_COLLECTION = "startup_posts";
const STARTUP_COMMENTS_COLLECTION = "startup_comments";

let localStartupPosts: StartupPost[] = [];
let startupSubscribers: Array<(posts: StartupPost[]) => void> = [];

const notifyStartupSubscribers = () => {
  startupSubscribers.forEach(cb => cb([...localStartupPosts]));
};

const DEFAULT_STARTUP_POSTS: StartupPost[] = [
  {
    id: "spread-1700000000001",
    category: "funding",
    sourceName: "TechCrunch",
    title: "AI Recruitment Platform Raises $12M Series A to Automate Sourcing Workflow",
    article: "San Francisco-based HR tech startup has announced a $12M Series A round led by Founders Fund. The platform combines real-time resume analysis with automated candidate outreach, helping talent acquisition teams reduce time-to-hire by 45%.\n\nAccording to CEO Sarah Jenkins, the funding will be used to expand the engineering team and deepen integrations with enterprise ATS systems.",
    sourceUrl: "https://techcrunch.com",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    id: "spread-1700000000002",
    category: "accelerators",
    sourceName: "Y Combinator",
    title: "Y Combinator Announces W26 Cohort Focus Areas with Heavy Emphasis on Autonomous Agents",
    article: "Y Combinator has unveiled its focus sectors for the upcoming Winter cohort. B2B SaaS, developer tooling, and autonomous workflow automation lead the applications.\n\nFounders accepted into the batch will receive $500,000 in standard investment along with access to YC's global founder alumni network.",
    sourceUrl: "https://ycombinator.com",
    imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 36).toISOString()
  },
  {
    id: "spread-1700000000003",
    category: "stories",
    sourceName: "VentureBeat",
    title: "From Bootstrapped Working Prototype to 100k ARR in 6 Months: A Founder Story",
    article: "Building a lean B2B marketplace requires ruthless prioritization. In this deep dive, founder Alex Rivera shares lessons on early user acquisition, cold email teardowns, and maintaining 80%+ net retention without external venture backing.",
    sourceUrl: "https://venturebeat.com",
    imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

export const startupFeedDb = {
  async loadAll(): Promise<StartupPost[]> {
    if (!db) {
      if (localStartupPosts.length === 0) localStartupPosts = DEFAULT_STARTUP_POSTS;
      return localStartupPosts;
    }
    try {
      const q = query(collection(db, STARTUP_POSTS_COLLECTION), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (snap.empty && !localStorage.getItem("firestore_startup_seeded_v1")) {
        // Seed initial items to firestore
        for (const item of DEFAULT_STARTUP_POSTS) {
          await setDoc(doc(db, STARTUP_POSTS_COLLECTION, item.id), item);
        }
        localStorage.setItem("firestore_startup_seeded_v1", "true");
        localStartupPosts = DEFAULT_STARTUP_POSTS;
        return localStartupPosts;
      }
      const posts: StartupPost[] = snap.docs.map(d => {
        const data = d.data();
        let createdAt = data.createdAt;
        if (createdAt && typeof createdAt === "object" && createdAt.toDate) {
          createdAt = createdAt.toDate().toISOString();
        } else if (!createdAt) {
          createdAt = new Date().toISOString();
        }
        return {
          id: d.id,
          category: data.category || "general",
          sourceName: data.sourceName || "Startup News",
          title: data.title || "Untitled Post",
          article: data.article || "",
          sourceUrl: data.sourceUrl || "#",
          imageUrl: data.imageUrl || data.image || data.coverImage || data.featuredImage || data.picture || data.photoUrl || "",
          createdAt: String(createdAt),
          updatedAt: data.updatedAt ? String(data.updatedAt) : String(createdAt)
        };
      });
      posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      localStartupPosts = posts;
      return posts;
    } catch (e) {
      console.error("[STARTUP_POSTS_LOAD_ERROR]", e);
      if (localStartupPosts.length === 0) localStartupPosts = DEFAULT_STARTUP_POSTS;
      return localStartupPosts;
    }
  },

  subscribeAll(callback: (posts: StartupPost[]) => void): () => void {
    startupSubscribers.push(callback);
    if (localStartupPosts.length > 0) callback([...localStartupPosts]);

    if (!db) return () => {};

    try {
      const q = query(collection(db, STARTUP_POSTS_COLLECTION), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snap) => {
        const posts: StartupPost[] = snap.docs.map(d => {
          const data = d.data();
          let createdAt = data.createdAt;
          if (createdAt && typeof createdAt === "object" && createdAt.toDate) {
            createdAt = createdAt.toDate().toISOString();
          } else if (!createdAt) {
            createdAt = new Date().toISOString();
          }
          return {
            id: d.id,
            category: data.category || "general",
            sourceName: data.sourceName || "Startup News",
            title: data.title || "Untitled Post",
            article: data.article || "",
            sourceUrl: data.sourceUrl || "#",
            imageUrl: data.imageUrl || data.image || data.coverImage || data.featuredImage || data.picture || data.photoUrl || "",
            createdAt: String(createdAt),
            updatedAt: data.updatedAt ? String(data.updatedAt) : String(createdAt)
          };
        });
        posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        localStartupPosts = posts;
        notifyStartupSubscribers();
      }, (err) => {
        console.warn("[STARTUP_POSTS_SNAPSHOT_WARN]", err);
      });

      return () => {
        startupSubscribers = startupSubscribers.filter(cb => cb !== callback);
        unsubscribe();
      };
    } catch (e) {
      console.error("[STARTUP_POSTS_SUB_ERROR]", e);
      return () => {
        startupSubscribers = startupSubscribers.filter(cb => cb !== callback);
      };
    }
  },

  async createPost(postData: Omit<StartupPost, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<string> {
    const newId = postData.id || `spread-${Date.now()}`;
    const nowIso = new Date().toISOString();
    let sourceUrl = postData.sourceUrl ? postData.sourceUrl.trim() : "";
    if (sourceUrl && !sourceUrl.startsWith("http")) sourceUrl = "https://" + sourceUrl;

    const newPost: StartupPost = {
      id: newId,
      category: postData.category || "general",
      sourceName: postData.sourceName || "Source",
      title: postData.title,
      article: postData.article,
      sourceUrl: sourceUrl || "#",
      imageUrl: postData.imageUrl || "",
      createdAt: postData.createdAt || nowIso,
      updatedAt: nowIso
    };

    localStartupPosts = [newPost, ...localStartupPosts.filter(p => p.id !== newId)];
    notifyStartupSubscribers();

    if (db) {
      try {
        await setDoc(doc(db, STARTUP_POSTS_COLLECTION, newId), newPost);
        console.log(`[STARTUP_POST_CREATE_SUCCESS] Created doc "${newId}" in collection "${STARTUP_POSTS_COLLECTION}".`);
      } catch (e) {
        console.error(`[STARTUP_POST_CREATE_ERROR]`, e);
      }
    }
    return newId;
  },

  async updatePost(postId: string, postData: Partial<StartupPost>): Promise<void> {
    const nowIso = new Date().toISOString();
    let sourceUrl = postData.sourceUrl ? postData.sourceUrl.trim() : undefined;
    if (sourceUrl && !sourceUrl.startsWith("http")) sourceUrl = "https://" + sourceUrl;

    localStartupPosts = localStartupPosts.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        ...postData,
        sourceUrl: sourceUrl !== undefined ? sourceUrl : p.sourceUrl,
        updatedAt: nowIso
      };
    });
    notifyStartupSubscribers();

    if (db) {
      try {
        const updatePayload: any = { ...postData, updatedAt: nowIso };
        if (sourceUrl !== undefined) updatePayload.sourceUrl = sourceUrl;
        await updateDoc(doc(db, STARTUP_POSTS_COLLECTION, postId), updatePayload);
        console.log(`[STARTUP_POST_UPDATE_SUCCESS] Updated doc "${postId}".`);
      } catch (e) {
        console.error(`[STARTUP_POST_UPDATE_ERROR]`, e);
      }
    }
  },

  async deletePost(postId: string): Promise<void> {
    localStartupPosts = localStartupPosts.filter(p => p.id !== postId);
    notifyStartupSubscribers();

    if (db) {
      try {
        await deleteDoc(doc(db, STARTUP_POSTS_COLLECTION, postId));
        console.log(`[STARTUP_POST_DELETE_SUCCESS] Deleted doc "${postId}".`);
        // Also delete comments document if present
        try {
          await deleteDoc(doc(db, STARTUP_COMMENTS_COLLECTION, postId));
        } catch (e) {}
      } catch (e) {
        console.error(`[STARTUP_POST_DELETE_ERROR]`, e);
      }
    }
  }
};

export const resetPassword = async (email: string) => {
  if (!auth) throw new Error("Firebase auth not initialized");
  await sendPasswordResetEmail(auth, email);
};

export const saveAccessRequest = async (request) => {
  if (!db) return;
  try {
    
    await setDoc(doc(db, "access_requests", request.id), request);
  } catch (e) {
    console.error("Failed to save access request", e);
  }
};

export const deleteAccessRequest = async (id) => {
  if (!db) return;
  try {
    
    await deleteDoc(doc(db, "access_requests", id));
  } catch (e) {}
};

export interface StartupCommunityComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface StartupCommunityPostItem {
  id: string;
  communityId: string;
  communityName: string;
  authorName: string;
  authorRole?: string;
  postType: "text" | "image" | "event";
  title: string;
  content: string;
  imageUrl?: string;
  eventDate?: string;
  eventLocation?: string;
  likesCount: number;
  commentsCount: number;
  status: "pending" | "published" | "flagged";
  createdAt: string;
  comments?: StartupCommunityComment[];
}

export interface StartupCommunity {
  id: string;
  name: string;
  description: string;
  category: string;
  founderName: string;
  founderEmail: string;
  status: "pending" | "approved" | "revoked";
  createdAt: string;
  membersCount: number;
  postsCount: number;
  logoUrl?: string;
  coverImageUrl?: string;
  posts?: StartupCommunityPostItem[];
}

const STARTUP_COMMUNITIES_COLLECTION = "startup_communities";
const STARTUP_COMMUNITY_POSTS_COLLECTION = "startup_community_posts";

let localCommunities: StartupCommunity[] = [
  {
    id: "comm-1",
    name: "AI Founders Guild",
    description: "Exclusive community for generative AI and LLM startup founders sharing growth insights and agentic architectures.",
    category: "AI & Tech",
    founderName: "Alex Mercer",
    founderEmail: "alex@aifounders.io",
    status: "approved",
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    membersCount: 340,
    postsCount: 0,
    logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
    posts: []
  },
  {
    id: "comm-2",
    name: "SaaS Scaleup Network",
    description: "B2B SaaS founders scaling from $100k to $10M ARR. Tactical advice on enterprise sales and product-led growth.",
    category: "SaaS & Growth",
    founderName: "Priya Nair",
    founderEmail: "priya@saasgrowth.co",
    status: "approved",
    createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    membersCount: 512,
    postsCount: 0,
    logoUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80",
    posts: []
  },
  {
    id: "comm-3",
    name: "Fintech Innovators Hub",
    description: "Next-gen banking, embedded finance, and regulatory compliance community for neo-bank founders.",
    category: "Fintech",
    founderName: "Rohan Kulkarni",
    founderEmail: "rohan@fintechhub.in",
    status: "approved",
    createdAt: new Date(Date.now() - 3600000 * 95).toISOString(),
    membersCount: 280,
    postsCount: 0,
    logoUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1556742049-0a67d553c234?w=800&auto=format&fit=crop&q=80",
    posts: []
  },
  {
    id: "comm-4",
    name: "DeepTech & Robotics Lab",
    description: "Founders building hardware, autonomous drones, edge compute units, and industrial robotics.",
    category: "Hardware",
    founderName: "Marcus Vance",
    founderEmail: "marcus@deeptechlabs.io",
    status: "approved",
    createdAt: new Date(Date.now() - 3600000 * 150).toISOString(),
    membersCount: 195,
    postsCount: 0,
    logoUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80",
    posts: []
  },
  {
    id: "comm-5",
    name: "ClimateTech Pioneers",
    description: "Startups accelerating carbon removal, renewable grid distribution, and clean energy storage.",
    category: "Sustainability",
    founderName: "Sophia Lindqvist",
    founderEmail: "sophia@climatetech.org",
    status: "approved",
    createdAt: new Date(Date.now() - 3600000 * 180).toISOString(),
    membersCount: 230,
    postsCount: 0,
    logoUrl: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80",
    posts: []
  },
  {
    id: "comm-6",
    name: "Web3 & Infra Builders",
    description: "Decentralized protocols, zero-knowledge proofs, and secure cross-chain liquidity networks.",
    category: "Web3 & Infra",
    founderName: "Kenji Sato",
    founderEmail: "kenji@zkbuilders.xyz",
    status: "approved",
    createdAt: new Date(Date.now() - 3600000 * 200).toISOString(),
    membersCount: 410,
    postsCount: 0,
    logoUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=80",
    posts: []
  },
  {
    id: "comm-7",
    name: "Consumer Apps & Social Club",
    description: "Viral consumer mobile apps, creator economy tools, and community-driven marketplaces.",
    category: "Consumer & B2C",
    founderName: "Chloe Dupont",
    founderEmail: "chloe@socialclub.app",
    status: "approved",
    createdAt: new Date(Date.now() - 3600000 * 90).toISOString(),
    membersCount: 630,
    postsCount: 0,
    logoUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80",
    posts: []
  },
  {
    id: "comm-8",
    name: "Indie Hackers & Bootstrappers",
    description: "Solo founders and small profitable team builders sharing revenue milestones and indie growth hacks.",
    category: "Indie & Bootstrapped",
    founderName: "Daniel Kim",
    founderEmail: "daniel@indie-hacker.net",
    status: "approved",
    createdAt: new Date(Date.now() - 3600000 * 250).toISOString(),
    membersCount: 890,
    postsCount: 0,
    logoUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80",
    posts: []
  }
];

let storedCommunities: StartupCommunity[] = [];
try {
  const raw = localStorage.getItem("recruit_crm_startup_communities_v3");
  if (raw) {
    storedCommunities = JSON.parse(raw);
  }
} catch (e) {}

const mapComms = new Map<string, StartupCommunity>();
[...storedCommunities, ...localCommunities].forEach(c => {
  if (!mapComms.has(c.id)) mapComms.set(c.id, c);
});
localCommunities = Array.from(mapComms.values());

const saveLocalCommunities = () => {
  try {
    localStorage.setItem("recruit_crm_startup_communities_v3", JSON.stringify(localCommunities));
  } catch (e) {}
};
saveLocalCommunities();

let startupCommunitySubscribers: Array<(comms: StartupCommunity[]) => void> = [];

const notifyStartupCommunitySubscribers = () => {
  saveLocalCommunities();
  startupCommunitySubscribers.forEach(cb => cb([...localCommunities]));
};

export const startupCommunitiesDb = {
  async loadAll(): Promise<StartupCommunity[]> {
    if (!db) return localCommunities;
    try {
      const q = query(collection(db, STARTUP_COMMUNITIES_COLLECTION), orderBy("createdAt", "desc"));
      const snap = await getDocs(q).catch(() => getDocs(collection(db, STARTUP_COMMUNITIES_COLLECTION)));
      if (snap.empty) {
        for (const comm of localCommunities) {
          await setDoc(doc(db, STARTUP_COMMUNITIES_COLLECTION, comm.id), comm);
        }
        return localCommunities;
      }
      const firestoreList: StartupCommunity[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as StartupCommunity[];

      // Merge firestoreList with localCommunities
      const mergedMap = new Map<string, StartupCommunity>();
      [...localCommunities, ...firestoreList].forEach(c => {
        if (!mergedMap.has(c.id)) {
          mergedMap.set(c.id, c);
        } else {
          const existing = mergedMap.get(c.id)!;
          if ((c.posts?.length || 0) >= (existing.posts?.length || 0)) {
            mergedMap.set(c.id, c);
          }
        }
      });
      localCommunities = Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      saveLocalCommunities();

      for (const comm of localCommunities) {
        const found = firestoreList.find(f => f.id === comm.id);
        if (!found) {
          try {
            await setDoc(doc(db, STARTUP_COMMUNITIES_COLLECTION, comm.id), comm);
          } catch (err) {}
        }
      }

      return localCommunities;
    } catch (e) {
      console.warn("Failed loading startup communities from Firestore, using local fallback", e);
      return localCommunities;
    }
  },

  subscribeAll(callback: (comms: StartupCommunity[]) => void): () => void {
    startupCommunitySubscribers.push(callback);
    callback([...localCommunities]);
    if (!db) return () => {};
    try {
      const q = query(collection(db, STARTUP_COMMUNITIES_COLLECTION), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const firestoreList: StartupCommunity[] = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          })) as StartupCommunity[];

          const mergedMap = new Map<string, StartupCommunity>();
          [...localCommunities, ...firestoreList].forEach(c => {
            if (!mergedMap.has(c.id)) {
              mergedMap.set(c.id, c);
            }
          });
          localCommunities = Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          saveLocalCommunities();
          notifyStartupCommunitySubscribers();
        }
      });
      return () => {
        startupCommunitySubscribers = startupCommunitySubscribers.filter(cb => cb !== callback);
        unsubscribe();
      };
    } catch (e) {
      return () => {
        startupCommunitySubscribers = startupCommunitySubscribers.filter(cb => cb !== callback);
      };
    }
  },

  async loadCommunityPosts(communityId: string): Promise<StartupCommunityPostItem[]> {
    if (!db) {
      const comm = localCommunities.find(c => c.id === communityId);
      return comm?.posts || [];
    }
    try {
      const q = query(
        collection(db, STARTUP_COMMUNITY_POSTS_COLLECTION),
        where("communityId", "==", communityId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q).catch(() => getDocs(collection(db, STARTUP_COMMUNITY_POSTS_COLLECTION)));
      if (snap.empty) {
        const comm = localCommunities.find(c => c.id === communityId);
        return comm?.posts || [];
      }
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as StartupCommunityPostItem[];
    } catch (e) {
      const comm = localCommunities.find(c => c.id === communityId);
      return comm?.posts || [];
    }
  },

  async updateStatus(communityId: string, status: "pending" | "approved" | "revoked"): Promise<void> {
    localCommunities = localCommunities.map(c => c.id === communityId ? { ...c, status } : c);
    notifyStartupCommunitySubscribers();
    if (db) {
      try {
        await updateDoc(doc(db, STARTUP_COMMUNITIES_COLLECTION, communityId), { status });
      } catch (e) {
        console.error("Failed updating community status in Firestore", e);
      }
    }
  },

  async deleteCommunity(communityId: string): Promise<void> {
    localCommunities = localCommunities.filter(c => c.id !== communityId);
    notifyStartupCommunitySubscribers();
    if (db) {
      try {
        await deleteDoc(doc(db, STARTUP_COMMUNITIES_COLLECTION, communityId));
      } catch (e) {}
    }
  },

  async createCommunity(newComm: Omit<StartupCommunity, "id" | "createdAt" | "membersCount" | "postsCount" | "status"> & { status?: "pending" | "approved" | "revoked" }): Promise<string> {
    const id = `comm-${Date.now()}`;
    const item: StartupCommunity = {
      ...newComm,
      id,
      status: "approved", // Newly created communities are approved by default so they appear instantly on Spread One startup communities
      createdAt: new Date().toISOString(),
      membersCount: 1,
      postsCount: 0,
      posts: []
    };
    localCommunities = [item, ...localCommunities];
    notifyStartupCommunitySubscribers();
    if (db) {
      try {
        await setDoc(doc(db, STARTUP_COMMUNITIES_COLLECTION, id), item);
      } catch (e) {}
    }
    return id;
  },

  async deletePost(communityId: string, postId: string): Promise<void> {
    localCommunities = localCommunities.map(c => {
      if (c.id !== communityId) return c;
      const updatedPosts = (c.posts || []).filter(p => p.id !== postId);
      return {
        ...c,
        posts: updatedPosts,
        postsCount: updatedPosts.length
      };
    });
    saveLocalCommunities();
    notifyStartupCommunitySubscribers();
    if (db) {
      try {
        const comm = localCommunities.find(c => c.id === communityId);
        if (comm) {
          await updateDoc(doc(db, STARTUP_COMMUNITIES_COLLECTION, communityId), { posts: comm.posts, postsCount: comm.postsCount });
        }
        await deleteDoc(doc(db, STARTUP_COMMUNITY_POSTS_COLLECTION, postId));
      } catch (e) {}
    }
  },

  async deleteComment(communityId: string, postId: string, commentId: string): Promise<void> {
    localCommunities = localCommunities.map(c => {
      if (c.id !== communityId) return c;
      const updatedPosts = (c.posts || []).map(p => {
        if (p.id !== postId) return p;
        const updatedComments = (p.comments || []).filter(cm => cm.id !== commentId);
        return {
          ...p,
          comments: updatedComments,
          commentsCount: updatedComments.length
        };
      });
      return {
        ...c,
        posts: updatedPosts
      };
    });
    notifyStartupCommunitySubscribers();
    if (db) {
      try {
        const comm = localCommunities.find(c => c.id === communityId);
        if (comm) {
          await updateDoc(doc(db, STARTUP_COMMUNITIES_COLLECTION, communityId), { posts: comm.posts });
        }
      } catch (e) {}
    }
  }
};

