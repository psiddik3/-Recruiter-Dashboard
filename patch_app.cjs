const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replace1 = `                            syncPendingRegistrations([...pendingRegistrations, newRequest]);
                            setGoogleRegistrationPendingUser(null);
                            setLoginSuccess("Access request submitted successfully! We will contact you shortly to complete the onboarding process.");`;
const with1 = `                            syncPendingRegistrations([...pendingRegistrations, newRequest]);
                            import('./lib/firebase').then(({ saveAccessRequest }) => saveAccessRequest(newRequest));
                            setGoogleRegistrationPendingUser(null);
                            setLoginSuccess("Access request submitted successfully! We will contact you shortly to complete the onboarding process.");`;

const replace2 = `                        syncPendingRegistrations([...pendingRegistrations, newRequest]);
                        form.reset();
                        setRegSuccess(\`Access request submitted successfully! Your profile has been queued for review.\`);`;
const with2 = `                        syncPendingRegistrations([...pendingRegistrations, newRequest]);
                        import('./lib/firebase').then(({ saveAccessRequest, logout }) => { saveAccessRequest(newRequest); logout(); });
                        form.reset();
                        setRegSuccess(\`Access request submitted successfully! Your profile has been queued for review.\`);`;

const replace3 = `                          syncPendingRegistrations([...pendingRegistrations, newRequest]);
                          form.reset();
                          setRegSuccess(\`Account exists! Your access request has been submitted. Once approved, you can log in with your existing password.\`);`;
const with3 = `                          syncPendingRegistrations([...pendingRegistrations, newRequest]);
                          import('./lib/firebase').then(({ saveAccessRequest }) => saveAccessRequest(newRequest));
                          form.reset();
                          setRegSuccess(\`Account exists! Your access request has been submitted. Once approved, you can log in with your existing password.\`);`;

if (code.includes(replace1)) code = code.replace(replace1, with1);
if (code.includes(replace2)) code = code.replace(replace2, with2);
if (code.includes(replace3)) code = code.replace(replace3, with3);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx patched for access requests');
