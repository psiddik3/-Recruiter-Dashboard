const fs = require('fs');
let content = fs.readFileSync('src/components/JobsView.tsx', 'utf8');

const target = `    if (editingJob) {
      onUpdateJob && onUpdateJob(jobObj);
    } else {
      handleAddJob(jobObj);
    }`;

const replaceWith = `    if (editingJob) {
      const updatedJobs = jobs.map(j => j.id === jobObj.id ? jobObj : j);
      onUpdateJobs(updatedJobs);
    } else {
      handleAddJob(jobObj);
    }`;

content = content.replace(target, replaceWith);

fs.writeFileSync('src/components/JobsView.tsx', content, 'utf8');
