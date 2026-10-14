const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update the error messages
const oldLoginErrorLogic = `} catch (err: any) {
                          const errorCode = err?.code || "";
                          if (errorCode === "auth/invalid-credential" || errorCode === "auth/wrong-password") {
                             if (found) {
                                alert("Incorrect password. Please try again.");
                             } else {
                                alert("You are not registered. Email ID not found. Please create a new account.");
                             }
                          } else if (errorCode === "auth/user-not-found" || !found) {
                             alert("You are not registered. Email ID not found. Please create a new account.");
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
                              if (found) {
                                alert("Incorrect password. Please try again.");
                              } else {
                                alert("You are not registered. Email ID not found. Please create a new account.");
                              }
                            }
                          }
                        }`;

const newLoginErrorLogic = `} catch (err: any) {
                          const errorCode = err?.code || "";
                          if (errorCode === "auth/invalid-credential" || errorCode === "auth/wrong-password") {
                             if (found || pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail)) {
                                alert("Incorrect password. Please try again.");
                             } else {
                                alert("You are not registered. Email not found. Please create a new account.");
                             }
                          } else if (errorCode === "auth/user-not-found" || (!found && !pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail))) {
                             alert("You are not registered. Email not found. Please create a new account.");
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
                                alert("Incorrect password. Please try again.");
                              } else {
                                alert("You are not registered. Email not found. Please create a new account.");
                              }
                            }
                          }
                        }`;

code = code.replace(oldLoginErrorLogic, newLoginErrorLogic);

// 2. Add "Forgot Password" UI
const oldPasswordLabel = `<label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Portal Password</label>`;
const newPasswordLabel = `<div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Portal Password</label>
                          <button type="button" onClick={() => {
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
                          }} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Forgot Password?</button>
                        </div>`;
code = code.replace(oldPasswordLabel, newPasswordLabel);

fs.writeFileSync('src/App.tsx', code);
console.log('Done replacing App.tsx logic');
