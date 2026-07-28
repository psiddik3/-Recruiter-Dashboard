const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
`  async postDirect(data: Omit<FirebaseJob, "id" | "status" | "createdAt" | "approvedAt">): Promise<void> {
    if (!db) return;
    const colRef = collection(db, JOBS_COLLECTION);
    await addDoc(colRef, {
      ...data,
      status: "approved",
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      postedByFounder: true
    });
  },`,
`  async postDirect(data: Omit<FirebaseJob, "id" | "status" | "createdAt" | "approvedAt">): Promise<void> {
    if (!db) return;
    const colRef = collection(db, JOBS_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...data,
      status: "approved",
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      postedByFounder: true
    });
    try {
      const { setDoc } = require("firebase/firestore");
      await setDoc(doc(db, "home_posts", docRef.id), {
        jobId: docRef.id,
        title: data.title || "",
        experience: data.experience || "",
        salary: data.salary || "",
        location: data.location || "",
        createdAt: new Date().toISOString()
      });
    } catch (e) { console.error("Failed to auto-create home_post", e); }
  },`);

code = code.replace(
`    await addDoc(colRef, {
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
      applyLink: typeof window !== "undefined" ? \`\${window.location.origin}/apply?jobId=\${data.id}\` : \`https://company.com/apply/\${data.id}\`,
      durationDays: data.durationDays || 15,
      expiresAt: data.expiresAt || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: "approved", // Automatically active jobs in CRM are approved in portal
      createdAt: new Date().toISOString(),
      postedByFounder: data.postedBy === "Rahul Sharma"
    });`,
`    await addDoc(colRef, {
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
      applyLink: typeof window !== "undefined" ? \`\${window.location.origin}/apply?jobId=\${data.id}\` : \`https://company.com/apply/\${data.id}\`,
      durationDays: data.durationDays || 15,
      expiresAt: data.expiresAt || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: "approved",
      createdAt: new Date().toISOString(),
      postedByFounder: data.postedBy === "Rahul Sharma"
    });

    try {
      const { setDoc } = require("firebase/firestore");
      await setDoc(doc(db, "home_posts", String(data.id)), {
        jobId: data.id,
        title: data.title || "",
        experience: data.experience || "",
        salary: data.salary || "",
        location: data.location || "",
        createdAt: new Date().toISOString()
      });
    } catch (e) { console.error("Failed to auto-create home_post", e); }`);

fs.writeFileSync('src/lib/firebase.ts', code);
