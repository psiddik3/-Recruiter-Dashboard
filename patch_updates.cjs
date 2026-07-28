const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add Icons
code = code.replace(/import \{/, 'import { Eye, EyeOff,');

// 2. Add State for Passwords
const stateReplacement = `const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showRecruiterPassword, setShowRecruiterPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [approvalRequest, setApprovalRequest] = useState<`;
code = code.replace('const [approvalRequest, setApprovalRequest] = useState<', stateReplacement);

// 3. Update Admin Password Input
const adminPasswordRegex = /<input\s*name="adminPassword"\s*type="password"\s*placeholder="••••••••"\s*required\s*className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"\s*\/>/;
const adminPasswordReplacement = `<div className="relative">
                        <input
                          name="adminPassword"
                          type={showAdminPassword ? "text" : "password"}
                          placeholder={showAdminPassword ? "Enter password" : "••••••••"}
                          required
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 pr-10 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                        <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-300">
                          {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>`;
code = code.replace(adminPasswordRegex, adminPasswordReplacement);

// 4. Update Recruiter Login Password Input
const loginPasswordRegex = /<input\s*name="loginPassword"\s*type="password"\s*placeholder="••••••••"\s*required\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"\s*\/>/;
const loginPasswordReplacement = `<div className="relative">
                        <input
                          name="loginPassword"
                          type={showRecruiterPassword ? "text" : "password"}
                          placeholder={showRecruiterPassword ? "Enter password" : "••••••••"}
                          required
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 pr-10 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                        <button type="button" onClick={() => setShowRecruiterPassword(!showRecruiterPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                          {showRecruiterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>`;
code = code.replace(loginPasswordRegex, loginPasswordReplacement);

// 5. Update Registration Password Input
const regPasswordRegex = /<input\s*name="regPassword"\s*type="password"\s*placeholder="••••••••"\s*required\s*className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1\.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"\s*\/>/;
const regPasswordReplacement = `<div className="relative">
                        <input
                          name="regPassword"
                          type={showRegPassword ? "text" : "password"}
                          placeholder={showRegPassword ? "Enter password" : "••••••••"}
                          required
                          className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 pr-10 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                        <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-2 top-2 text-indigo-900/40 hover:text-indigo-900/60">
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>`;
code = code.replace(regPasswordRegex, regPasswordReplacement);

// 6. Fix the "message to administrator" block
// We need to completely remove the Message textarea from the manual registration form
const manualMessageBlock = /<div>\s*<label className="block text-\[10px\] font-black text-indigo-900\/50 uppercase tracking-wider mb-0\.5">Message to Administrator<\/label>\s*<textarea\s*name="regMsg"\s*rows=\{2\}\s*placeholder="Please approve my workspace account to join the cloud engineer hiring search\."\s*className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1\.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 leading-normal capitalize"\s*><\/textarea>\s*<\/div>/;
// Wait, I did not apply capitalization yet, so it won't have 'capitalize'
const manualMessageBlock2 = /<div>\s*<label className="block text-\[10px\] font-black text-indigo-900\/50 uppercase tracking-wider mb-0\.5">Message to Administrator<\/label>\s*<textarea\s*name="regMsg"\s*rows=\{2\}\s*placeholder="Please approve my workspace account to join the cloud engineer hiring search\."\s*className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1\.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 leading-normal"\s*><\/textarea>\s*<\/div>/;
code = code.replace(manualMessageBlock2, '');

// And remove it from the form submission logic for manual reg
const manualFormMsgRegex = /const message = \(form\.elements\.namedItem\("regMsg"\) as HTMLTextAreaElement\)\.value\.trim\(\);\s*/;
code = code.replace(manualFormMsgRegex, 'const message = "Requested via manual registration form";\n                      ');

// 7. Update Login Error Handling
const oldLoginErrorLogic = `} catch (err: any) {
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
                            alert("Invalid Credentials or Account Not Found. Please check your email and password.");
                          }
                        }`;

const newLoginErrorLogic = `} catch (err: any) {
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
code = code.replace(oldLoginErrorLogic, newLoginErrorLogic);

// 8. Capitalize text inputs globally 
// We will replace type="text" with type="text" autoCapitalize="words" className="..." (adding capitalize class)
code = code.replace(/<input([^>]*?)type="text"([^>]*?)className="([^"]*?)"/g, '<input$1type="text"$2autoCapitalize="words" className="$3 capitalize"');
code = code.replace(/<textarea([^>]*?)className="([^"]*?)"/g, '<textarea$1autoCapitalize="sentences" className="$2 capitalize"');

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx patched');
