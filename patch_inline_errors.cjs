const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add states at the beginning
code = code.replace(
    'const [showRegPassword, setShowRegPassword] = useState(false);',
    'const [showRegPassword, setShowRegPassword] = useState(false);\n  const [loginError, setLoginError] = useState("");\n  const [loginSuccess, setLoginSuccess] = useState("");'
);

const startMarker = `                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();`;
const startReplacement = `                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setLoginError("");
                        setLoginSuccess("");`;
                        
code = code.replace(startMarker, startReplacement);

const oldLoginLogic = `                        try {
                          const { loginWithEmail } = await import("./lib/firebase");
                          const user = await loginWithEmail(targetMail, targetPassword);
                          if (user && user.email) {
                            if (found) {
                              if (found.status === "active") {
                                localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", found.id);
                                setLoggedInRecruiterId(found.id);
                              } else {
                                alert(\`Access Denied: Your recruiter account status is currently "\${found.status}". Please contact the admin.\`);
                              }
                            } else {
                                const isPending = pendingRegistrations.find(r => r.email.trim().toLowerCase() === user.email?.toLowerCase());
                                if (isPending) {
                                  alert("Access Denied: Your account request is still pending approval. Please wait for the administrator to activate your account.");
                                } else {
                                  alert("Your account is registered but you don't have access. Please request access from the admin.");
                                }
                            }
                          }
                        } catch (err: any) {
                          const errorCode = err?.code || "";
                          if (errorCode === "auth/invalid-credential" || errorCode === "auth/wrong-password") {
                             if (found || pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail)) {
                                alert("Incorrect Password. Please try again.");
                             } else {
                                alert("You are not registered. Email not found. Please correct. Please create a new account.");
                             }
                          } else if (errorCode === "auth/user-not-found" || (!found && !pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail))) {
                             alert("You are not registered. Email not found. Please correct. Please create a new account.");
                          } else {
                            // Fallback to local hardcoded check for legacy sandbox users
                            if (found && (found.password === targetPassword || targetPassword === "password123")) {
                              if (found.status === "active") {
                                localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", found.id);
                                setLoggedInRecruiterId(found.id);
                              } else {
                                alert(\`Access Denied: Your recruiter account status is currently "\${found.status}". Please contact the admin.\`);
                              }
                            } else {
                              console.error("Firebase email login failed", err);
                              if (found || pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail)) {
                                alert("Incorrect Password. Please try again.");
                              } else {
                                alert("You are not registered. Email not found. Please correct. Please create a new account.");
                              }
                            }
                          }
                        }`;

const newLoginLogic = `                        try {
                          const { loginWithEmail } = await import("./lib/firebase");
                          const user = await loginWithEmail(targetMail, targetPassword);
                          if (user && user.email) {
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
                                  setLoginError("Your account is registered but you don't have access. Please request access from the admin.");
                                }
                            }
                          }
                        } catch (err: any) {
                          const errorCode = err?.code || "";
                          if (errorCode === "auth/invalid-credential" || errorCode === "auth/wrong-password") {
                             if (found || pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail)) {
                                setLoginError("Incorrect Password. Please try again.");
                             } else {
                                setLoginError("You are not registered. Email not found. Please correct. Please create a new account.");
                             }
                          } else if (errorCode === "auth/user-not-found" || (!found && !pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail))) {
                             setLoginError("You are not registered. Email not found. Please correct. Please create a new account.");
                          } else {
                            // Fallback to local hardcoded check for legacy sandbox users
                            if (found && (found.password === targetPassword || targetPassword === "password123")) {
                              if (found.status === "active") {
                                localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", found.id);
                                setLoggedInRecruiterId(found.id);
                              } else {
                                setLoginError(\`Access Denied: Your recruiter account status is currently "\${found.status}". Please contact the admin.\`);
                              }
                            } else {
                              console.error("Firebase email login failed", err);
                              if (found || pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail)) {
                                setLoginError("Incorrect Password. Please try again.");
                              } else {
                                setLoginError("You are not registered. Email not found. Please correct. Please create a new account.");
                              }
                            }
                          }
                        }`;

code = code.replace(oldLoginLogic, newLoginLogic);

const oldForgotPwd = `<button type="button" onClick={() => {
                            const emailInput = document.querySelector('input[name="loginEmail"]');
                            const email = emailInput ? emailInput.value.trim() : "";
                            if (!email) {
                              alert("Please enter your email address first to reset your password.");
                            } else {
                              import("./lib/firebase").then(({ resetPassword }) => {
                                if (resetPassword) {
                                  resetPassword(email).then(() => alert("Password reset email sent! Please check your inbox.")).catch(e => alert("Error resetting password: " + e.message));
                                } else {
                                  alert("Password reset feature requires Firebase authentication.");
                                }
                              }).catch(() => alert("Please contact the administrator to reset your password."));
                            }
                          }} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Forgot Password?</button>`;

const newForgotPwd = `<button type="button" onClick={() => {
                            const emailInput = document.querySelector('input[name="loginEmail"]');
                            const email = emailInput ? emailInput.value.trim() : "";
                            if (!email) {
                              setLoginError("Please enter your email address first to reset your password.");
                            } else {
                              import("./lib/firebase").then(({ resetPassword }) => {
                                if (resetPassword) {
                                  resetPassword(email).then(() => { setLoginError(""); setLoginSuccess("Password reset email sent! Please check your inbox."); }).catch(e => setLoginError("Error resetting password: " + e.message));
                                } else {
                                  setLoginError("Password reset feature requires Firebase authentication.");
                                }
                              }).catch(() => setLoginError("Please contact the administrator to reset your password."));
                            }
                          }} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Forgot Password?</button>`;

code = code.replace(oldForgotPwd, newForgotPwd);

const formFieldsStart = `                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Corporate Email</label>`;

const formFieldsWithMessages = `                      {loginError && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] px-3 py-2.5 rounded-xl text-center font-medium leading-relaxed">
                          {loginError}
                        </div>
                      )}
                      {loginSuccess && (
                        <div className="bg-green-50 border border-green-100 text-green-600 text-[11px] px-3 py-2.5 rounded-xl text-center font-medium leading-relaxed">
                          {loginSuccess}
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Corporate Email</label>`;

code = code.replace(formFieldsStart, formFieldsWithMessages);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched login errors inline!");
