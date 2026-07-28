const fs = require('fs');
let code = fs.readFileSync('src/components/CandidateApplyView.tsx', 'utf8');

code = code.replace(
  `{jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title} — {j.location} ({j.dept})</option>
                  ))}`,
  `{jobs.filter(j => {
                    const isExp = j.expiresAt ? new Date() > new Date(j.expiresAt) : false;
                    return j.status !== "closed" && !isExp;
                  }).map(j => (
                    <option key={j.id} value={j.id}>{j.title} — {j.location} ({j.dept})</option>
                  ))}`
);

fs.writeFileSync('src/components/CandidateApplyView.tsx', code);
console.log("Updated dropdown");
