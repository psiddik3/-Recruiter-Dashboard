const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regexGoogleLogin = /<button\s*type="button"\s*onClick=\{async \(\) => \{\s*try \{\s*const \{ loginWithGoogle \} = await import\("\.\/lib\/firebase"\);\s*const user = await loginWithGoogle\(\);\s*if \(user && user\.email\) \{\s*const found = teamRecruiters\.find\(r => r\.email\.trim\(\)\.toLowerCase\(\) === user\.email\?\.toLowerCase\(\)\);\s*if \(found\) \{\s*if \(found\.status === "active"\) \{\s*localStorage\.setItem\("recruit_crm_logged_in_recruiter_id_v2", found\.id\);\s*setLoggedInRecruiterId\(found\.id\);\s*\} else \{\s*alert\(`Access Denied: Your recruiter account status is currently "\$\{found\.status\}". Please contact the admin.`\);\s*\}\s*\} else \{\s*const isPending = pendingRegistrations\.find\(r => r\.email\.trim\(\)\.toLowerCase\(\) === user\.email\?\.toLowerCase\(\)\);\s*if \(isPending\) \{\s*alert\("Access Denied: Your account request is still pending approval\. Please wait for the administrator to activate your account\."\);\s*\} else \{\s*setGoogleRegistrationPendingUser\(\{\s*name: user\.displayName \|\| user\.email\.split\("@"\)\[0\],\s*email: user\.email\s*\}\);\s*\}\s*\}\s*\}\s*\} catch \(e\) \{\s*console\.error\(e\);\s*alert\("Failed to login with Google: " \+ \(e instanceof Error \? e\.message : String\(e\)\)\);\s*\}\s*\}\}\s*className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl py-2\.5 transition-colors focus:outline-none cursor-pointer flex items-center justify-center gap-2 shadow-sm"\s*>/;

const newGoogleLogin = `<button
                      type="button"
                      onClick={async () => {
                        try {
                          setLoginError("");
                          setLoginSuccess("");
                          const { loginWithGoogle } = await import("./lib/firebase");
                          const user = await loginWithGoogle();
                          if (user && user.email) {
                            const found = teamRecruiters.find(r => r.email.trim().toLowerCase() === user.email?.toLowerCase());
                            if (found) {
                                if (found.status === "active") {
                                  localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", found.id);
                                  setLoggedInRecruiterId(found.id);
                                } else {
                                  setLoginError(\`Access Denied: Your recruiter account status is currently "\${found.status}". Please contact the admin.\`);
                                }
                            } else {
                                const isPending = pendingRegistrations.find(r => r.email.trim().toLowerCase() === user.email?.toLowerCase());
                                if (isPending) {
                                  setLoginError("Access Denied: Your account request is still pending approval. Please wait for the administrator to activate your account.");
                                } else {
                                  setGoogleRegistrationPendingUser({
                                    name: user.displayName || user.email.split("@")[0],
                                    email: user.email
                                  });
                                }
                            }
                          }
                        } catch (e) {
                          console.error(e);
                          setLoginError("Failed to login with Google: " + (e instanceof Error ? e.message : String(e)));
                        }
                      }}
                      className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >`;

code = code.replace(regexGoogleLogin, newGoogleLogin);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched Google login errors inline!");
