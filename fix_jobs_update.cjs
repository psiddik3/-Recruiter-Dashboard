const fs = require('fs');
let content = fs.readFileSync('src/components/JobsView.tsx', 'utf8');

const target = `      if (editingJob.firebaseId) {
        portalDb.updateJob(editingJob.firebaseId, jobObj).catch(err => console.warn("Failed updating portal job:", err));
      }`;

const replaceWith = `      if (editingJob.firebaseId) {
        portalDb.updateJob(editingJob.firebaseId, {
          title: jobObj.title,
          company: jobObj.company,
          industry: jobObj.dept,
          jobType: jobObj.employment,
          location: jobObj.location,
          salary: jobObj.salary,
          experience: jobObj.experience,
          skills: Array.isArray(jobObj.skills) ? jobObj.skills.join(", ") : (jobObj.skills || ""),
          description: jobObj.description,
          durationDays: jobObj.durationDays,
          expiresAt: jobObj.expiresAt
        }).catch(err => console.warn("Failed updating portal job:", err));
      }`;

if (content.includes(target)) {
    content = content.replace(target, replaceWith);
    fs.writeFileSync('src/components/JobsView.tsx', content, 'utf8');
    console.log("JobsView patched");
} else {
    console.log("Target not found");
}
