const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldAdminGoogleLogin = `                        const user = await loginWithGoogle();
                        if (user && user.email) {
                          localStorage.setItem("recruit_crm_admin_logged_in_v2", "true");
                          setAdminLoggedIn(true);
                        }`;

const newAdminGoogleLogin = `                        const user = await loginWithGoogle();
                        if (user && user.email) {
                          if (user.email.toLowerCase() === "admin@spredone.in" || user.email.toLowerCase() === "psiddik3@gmail.com") {
                            localStorage.setItem("recruit_crm_admin_logged_in_v2", "true");
                            setAdminLoggedIn(true);
                          } else {
                            setAdminError("Access Denied. Your Google account is not an authorized Founder/Admin.");
                            // Sign out the unauthorized user
                            const { logout } = await import("./lib/firebase");
                            await logout();
                          }
                        }`;

if (code.includes(oldAdminGoogleLogin)) {
    code = code.replace(oldAdminGoogleLogin, newAdminGoogleLogin);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Admin Google Login Patched");
} else {
    console.log("Could not find the admin google login block");
}
