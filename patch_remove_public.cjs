const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `      } else if (hash && hash.startsWith("#") && hash.length > 1) {
        setCurrentView("public-home");
      } else if (path.startsWith("/home")) { 
        setCurrentView("public-home"); `,
  `      } else if (path.startsWith("/home")) { 
        setCurrentView("dashboard"); `
);

code = code.replace(
  `    // Parse current view from path instantly
    if (path.startsWith("/home")) { setCurrentView("public-home"); } else if (path.startsWith("/apply")) {`,
  `    // Parse current view from path instantly
    if (path.startsWith("/home")) { setCurrentView("dashboard"); } else if (path.startsWith("/apply")) {`
);

code = code.replace(
  `  if (currentView === "public-home" || urlPath.startsWith("/home")) {
    return (
      <>
        <PublicHomepageView 
          jobs={jobs}
          teamRecruiters={teamRecruiters}
          companyName={companyName}
          companyLogo={companyLogo}
        />
        {sandboxControls}
      </>
    );
  }`,
  ``
);

fs.writeFileSync('src/App.tsx', code);
