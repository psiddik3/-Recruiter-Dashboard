const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `          if (hash && hash.startsWith("#")) {
            // Respect public hash routing instead of redirecting to CRM dashboard
            if (hash === "#jobs") {
              setCurrentView("candidate-portal");
            } else {
              setCurrentView("public-home");
            }
            return;
          }`,
  ``
);

fs.writeFileSync('src/App.tsx', code);
