const fs = require('fs');
let code = fs.readFileSync('src/components/JobsView.tsx', 'utf8');

code = code.replace(
  /\$\{window\.location\.origin\}\/home\?jobId=\$\{jobId\}/g,
  '${window.location.origin}/#${jobId}'
);
code = code.replace(
  /\$\{window\.location\.origin\}\/home\?jobId=\$\{sharingJob\.id\}/g,
  '${window.location.origin}/#${sharingJob.id}'
);

fs.writeFileSync('src/components/JobsView.tsx', code);

let skCode = fs.readFileSync('src/components/ShareKitView.tsx', 'utf8');
skCode = skCode.replace(
  /\$\{window\.location\.origin\}\/home\?jobId=\$\{jobId\}&recruiterId=\$\{recruiter\?\.id \|\| "1"\}/g,
  '${window.location.origin}/#${jobId}'
);
fs.writeFileSync('src/components/ShareKitView.tsx', skCode);
