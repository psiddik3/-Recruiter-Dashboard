const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const startIdx = code.indexOf('const handleRestoreDefaultData = () => {');
const endIdx = code.indexOf('const handleExportBackupData = () => {');

if (startIdx !== -1 && endIdx !== -1) {
  const newFn = `const handleRestoreDefaultData = () => {
    setConfirmDialog({
      message: "Are you sure you want to restore default sample data? This will reset job openings, candidates, and templates to initial default state.",
      onConfirm: () => {
        localStorage.removeItem("recruit_crm_jobs_v2");
        localStorage.removeItem("recruit_crm_candidates_v2");
        localStorage.removeItem("recruit_crm_templates");

        const defaultJobs = [
          {
            id: 101,
            title: "Senior Full Stack Engineer",
            company: recruiter.company || "Acme Corp",
            dept: "Engineering",
            employment: "Full-time",
            location: "Remote",
            salary: "$130,000 - $160,000",
            experience: "3-5 yrs",
            skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
            description: "Looking for an experienced full stack engineer to build robust multi-tenant web applications.",
            benefits: "Health insurance, 401(k), Unlimited PTO",
            deadline: "2026-09-30",
            status: "active",
            postedBy: recruiter.name,
            recruiterId: recruiter.id,
            createdAt: new Date().toISOString(),
            views: 142,
            applications: 5,
            conversion: "3.5%"
          },
          {
            id: 102,
            title: "Product Marketing Manager",
            company: recruiter.company || "Acme Corp",
            dept: "Marketing",
            employment: "Full-time",
            location: "Hybrid (New York)",
            salary: "$110,000 - $135,000",
            experience: "2-4 yrs",
            skills: ["GTM Strategy", "Content Marketing", "Analytics"],
            description: "Lead product marketing campaigns and go-to-market launches across channels.",
            benefits: "Stock options, Flexible hours",
            deadline: "2026-10-15",
            status: "active",
            postedBy: recruiter.name,
            recruiterId: recruiter.id,
            createdAt: new Date().toISOString(),
            views: 89,
            applications: 3,
            conversion: "3.3%"
          }
        ];

        const defaultCandidates = [
          {
            id: 201,
            jobId: 101,
            name: "Rahul Sharma",
            email: "rahul.sharma@example.com",
            phone: "+91 98765 11223",
            role: "Senior Full Stack Engineer",
            applied: "2026-07-28",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
            resumeText: "Senior Full Stack Developer with experience in React, TypeScript, and Node.js.",
            experience: "4 yrs",
            education: "B.Tech Computer Science",
            expectedSalary: "$140,000",
            noticePeriod: "15 days",
            location: "Remote",
            source: "Direct Application",
            favourite: false,
            timeline: [],
            rating: 4.5,
            skills: ["React", "TypeScript", "Node.js"],
            stage: "shortlist",
            sourcedBy: recruiter.name,
            recruiterId: recruiter.id,
            notes: [{ text: "Strong React background. Scheduled screening call.", author: recruiter.name, date: "2026-07-29" }]
          }
        ];

        syncJobs(defaultJobs);
        syncCandidates(defaultCandidates);
        syncTemplates(INITIAL_TEMPLATES);
        setGlobalMessage("System data restored to default sample state successfully!");
      }
    });
  };

  `;

  code = code.substring(0, startIdx) + newFn + code.substring(endIdx);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Replaced successfully");
} else {
  console.log("Indices not found");
}

