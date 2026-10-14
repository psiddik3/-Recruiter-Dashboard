const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add state
const stateDeclaration = 'const [approvalRequest, setApprovalRequest] = useState<any>(null);';
const newStateDeclaration = stateDeclaration + '\n  const [googleRegistrationPendingUser, setGoogleRegistrationPendingUser] = useState<{name: string, email: string} | null>(null);';
code = code.replace(stateDeclaration, newStateDeclaration);

// Update Google Login onClick
const googleLoginLogicRegex = /const isPending = pendingRegistrations\.find\(r => r\.email\.trim\(\)\.toLowerCase\(\) === user\.email\?\.toLowerCase\(\)\);\s*if \(isPending\) \{\s*alert\("Access Denied: Your account request is still pending approval\. Please wait for the administrator to activate your account\."\);\s*\} else \{\s*const newRequest = \{\s*id: \`req-\$\{Date\.now\(\)\}\`,\s*name: user\.displayName \|\| user\.email\.split\("@"\)\[0\],\s*email: user\.email,\s*designation: "Talent Acquisition \(Google Auth\)",\s*message: "Signed up via Google Authentication\.",\s*date: new Date\(\)\.toISOString\(\)\.split\("T"\)\[0\]\s*\};\s*syncPendingRegistrations\(\[\.\.\.pendingRegistrations, newRequest\]\);\s*alert\("Access request submitted successfully!\\n\\nYour profile has been queued for review\. Please wait for the administrator to approve your account\."\);\s*\}/;

const newGoogleLoginLogic = `const isPending = pendingRegistrations.find(r => r.email.trim().toLowerCase() === user.email?.toLowerCase());
                                if (isPending) {
                                  alert("Access Denied: Your account request is still pending approval. Please wait for the administrator to activate your account.");
                                } else {
                                  setGoogleRegistrationPendingUser({
                                    name: user.displayName || user.email.split("@")[0],
                                    email: user.email
                                  });
                                }`;

code = code.replace(googleLoginLogicRegex, newGoogleLoginLogic);
fs.writeFileSync('src/App.tsx', code);
