const fs = require('fs');
let content = fs.readFileSync('src/components/JobsView.tsx', 'utf8');

const target = `    if (editingJob) {
      const updatedJobs = jobs.map(j => j.id === jobObj.id ? jobObj : j);
      onUpdateJobs(updatedJobs);
    } else {`;

const replaceWith = `    if (editingJob) {
      const updatedJobs = jobs.map(j => j.id === jobObj.id ? jobObj : j);
      onUpdateJobs(updatedJobs);
      if (editingJob.firebaseId) {
        portalDb.updateJob(editingJob.firebaseId, jobObj).catch(err => console.warn("Failed updating portal job:", err));
      }
    } else {`;

if (!content.includes(target)) {
  console.log("Target not found!");
} else {
  content = content.replace(target, replaceWith);
  fs.writeFileSync('src/components/JobsView.tsx', content, 'utf8');
  console.log("Patched successfully");
}
