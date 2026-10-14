const fs = require('fs');
let code = fs.readFileSync('src/components/PublicHomepageView.tsx', 'utf8');

// remove the <a> Apply Now </a> block
code = code.replace(
  /<a\s+href=\{`\/apply\?jobId=\$\{job\.id\}\$\{recruiterId \? `&recruiterId=\$\{recruiterId\}` : ""\}`\}\s+className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2\.5 rounded-xl transition-colors whitespace-nowrap"\s*>\s*Apply Now <ArrowRight className="w-3\.5 h-3\.5" \/>\s*<\/a>/,
  ""
);

fs.writeFileSync('src/components/PublicHomepageView.tsx', code);
