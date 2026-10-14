const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `          const savedRecruiterId = localStorage.getItem("recruit_crm_logged_in_recruiter_id_v2");
          if (savedRecruiterId || urlRecruiterId) {
            window.history.replaceState({}, "", "/recruiter/dashboard");
            setUrlPath("/recruiter/dashboard");
            setCurrentView("dashboard");
          } else {
            window.history.replaceState({}, "", "/home");
            setUrlPath("/home");
            setCurrentView("public-home");
          }`,
  `          const savedRecruiterId = localStorage.getItem("recruit_crm_logged_in_recruiter_id_v2");
          if (path === "/" || path === "") {
            window.history.replaceState({}, "", "/home");
            setUrlPath("/home");
            setCurrentView("public-home");
          } else {
            window.history.replaceState({}, "", "/recruiter/dashboard");
            setUrlPath("/recruiter/dashboard");
            setCurrentView("dashboard");
          }`
);

fs.writeFileSync('src/App.tsx', code);
