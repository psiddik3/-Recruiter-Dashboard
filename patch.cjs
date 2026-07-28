const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /if \(currentView === "candidate-portal" \|\| urlPath\.startsWith\("\/apply"\)\) \{\n  if \(currentView === "public-home" \|\| urlPath\.startsWith\("\/home"\)\) \{/g,
  `if (currentView === "public-home" || urlPath.startsWith("/home")) {
    return (
      <PublicHomepageView 
        jobs={jobs}
        teamRecruiters={teamRecruiters}
        companyName={companyName}
        companyLogo={companyLogo}
      />
    );
  }

  if (currentView === "candidate-portal" || urlPath.startsWith("/apply")) {`
);
fs.writeFileSync('src/App.tsx', code);
