const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const badChunk = `      localStorage.removeItem("recruit_crm_jobs_v2");
      localStorage.removeItem("recruit_crm_candidates_v2");
      localStorage.removeItem("recruit_crm_templates");

      const defaultJobs: Job[] = [
        {
          id: 101,
          title: "Senior Full Stack Engineer",
          company: recruiter.company || "Acme Corp",
          dept: "Engineering",
          employment: "Full-time",
          location: "Remote",
          salary: "      localStorage.removeItem("recruit_crm_jobs_v2");
      localStorage.removeItem("recruit_crm_candidates_v2");
      localStorage.removeItem("recruit_crm_templates");`;

const goodChunk = `      localStorage.removeItem("recruit_crm_jobs_v2");
      localStorage.removeItem("recruit_crm_candidates_v2");
      localStorage.removeItem("recruit_crm_templates");

      const defaultJobs: Job[] = [
        {
          id: 101,
          title: "Senior Full Stack Engineer",
          company: recruiter.company || "Acme Corp",
          dept: "Engineering",
          employment: "Full-time",
          location: "Remote",
          salary: "$`;

code = code.replace(badChunk, goodChunk);
fs.writeFileSync('src/App.tsx', code);
console.log("Fixed syntax");
