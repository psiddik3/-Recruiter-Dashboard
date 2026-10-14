const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `          const savedRecruiterId = localStorage.getItem("recruit_crm_logged_in_recruiter_id_v2");
          if (path === "/" || path === "") {
            window.history.replaceState({}, "", "/home");
            setUrlPath("/home");
            setCurrentView("public-home");
          } else {
            window.history.replaceState({}, "", "/recruiter/dashboard");
            setUrlPath("/recruiter/dashboard");
            setCurrentView("dashboard");
          }`,
  `          const savedRecruiterId = localStorage.getItem("recruit_crm_logged_in_recruiter_id_v2");
          const savedAdmin = localStorage.getItem("recruit_crm_admin_logged_in_v2");
          if (savedAdmin === "true") {
            window.history.replaceState({}, "", "/admin/dashboard");
            setUrlPath("/admin/dashboard");
            setCurrentView("dashboard");
          } else if (savedRecruiterId || urlRecruiterId) {
            window.history.replaceState({}, "", "/recruiter/dashboard");
            setUrlPath("/recruiter/dashboard");
            setCurrentView("dashboard");
          } else {
            window.history.replaceState({}, "", "/recruiter");
            setUrlPath("/recruiter");
            setCurrentView("dashboard");
          }`
);

fs.writeFileSync('src/App.tsx', code);
