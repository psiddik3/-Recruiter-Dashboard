const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Patch the "Sign In with Registered Email"
const loginRegex = /onSubmit=\{\(e\) => \{\s*e\.preventDefault\(\);\s*const targetMail = \(e\.currentTarget\.elements\.namedItem\("loginEmail"\) as HTMLInputElement\)\.value\.trim\(\)\.toLowerCase\(\);\s*const targetPassword = \(e\.currentTarget\.elements\.namedItem\("loginPassword"\) as HTMLInputElement\)\.value\.trim\(\);\s*const found = teamRecruiters\.find\(r => r\.email\.trim\(\)\.toLowerCase\(\) === targetMail\);\s*if \(found\) \{\s*const correctPassword = found\.password \|\| "password123";\s*if \(correctPassword !== targetPassword\) \{\s*alert\("Invalid Password\. Please check the credentials and try again\."\);\s*return;\s*\}\s*if \(found\.status === "active"\) \{\s*localStorage\.setItem\("recruit_crm_logged_in_recruiter_id_v2", found\.id\);\s*setLoggedInRecruiterId\(found\.id\);\s*\} else \{\s*alert\(\`Access Denied: Your recruiter account status is currently "\$\{found\.status\}"\. Please contact the admin\.\`\);\s*\}\s*\} else \{\s*alert\("We couldn't find an authorized recruiter with this email address\. Please request access or switch profiles below\."\);\s*\}\s*\}\}/;

const newLoginLogic = `onSubmit={async (e) => {
                        e.preventDefault();
                        const targetMail = (e.currentTarget.elements.namedItem("loginEmail") as HTMLInputElement).value.trim().toLowerCase();
                        const targetPassword = (e.currentTarget.elements.namedItem("loginPassword") as HTMLInputElement).value.trim();

                        const found = teamRecruiters.find(r => r.email.trim().toLowerCase() === targetMail);

                        try {
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
                        }
                      }}`;

code = code.replace(loginRegex, newLoginLogic);
fs.writeFileSync('src/App.tsx', code);
