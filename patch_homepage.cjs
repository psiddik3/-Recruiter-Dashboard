const fs = require('fs');
let code = fs.readFileSync('src/components/PublicHomepageView.tsx', 'utf8');

code = code.replace(
  /className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-500"/g,
  `className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-500 cursor-pointer hover:shadow-md hover:border-indigo-200"
                 onClick={() => {
                   window.location.hash = 'jobs';
                   window.location.href = \`/apply?jobId=\${job.id}\${recruiterId ? \`&recruiterId=\${recruiterId}\` : ""}\`;
                 }}`
);

fs.writeFileSync('src/components/PublicHomepageView.tsx', code);
