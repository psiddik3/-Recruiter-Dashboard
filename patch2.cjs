const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(currentView === "public-home" \|\| urlPath\.startsWith\("\/home"\)\) \{\s*return \(\s*<PublicHomepageView\s*jobs=\{jobs\}\s*teamRecruiters=\{teamRecruiters\}\s*companyName=\{companyName\}\s*companyLogo=\{companyLogo\}\s*\/>\s*\);\s*\}\s*if \(currentView === "candidate-portal" \|\| urlPath\.startsWith\("\/apply"\)\) \{\s*return \(\s*<PublicHomepageView\s*jobs=\{jobs\}\s*teamRecruiters=\{teamRecruiters\}\s*companyName=\{companyName\}\s*companyLogo=\{companyLogo\}\s*\/>\s*\);\s*\}/;

const replacement = `if (currentView === "public-home" || urlPath.startsWith("/home")) {
    return (
      <PublicHomepageView 
        jobs={jobs}
        teamRecruiters={teamRecruiters}
        companyName={companyName}
        companyLogo={companyLogo}
      />
    );
  }

  if (currentView === "candidate-portal" || urlPath.startsWith("/apply")) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
