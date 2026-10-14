const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldBlock = `                      try {
                        const { registerWithEmail } = await import("./lib/firebase");
                        await registerWithEmail(email, password);
                        
                        const newRequest = {
                          id: \`req-\${Date.now()}\`,
                          name,
                          email,
                          phone,
                          company,
                          designation,
                          message,
                          date: new Date().toISOString().split("T")[0]
                        };

                        syncPendingRegistrations([...pendingRegistrations, newRequest]);
                        form.reset();
                        setRegSuccess(\`Access request submitted successfully! Your profile has been queued for review.\`);
                      } catch (err: any) {
                        console.error("Firebase registration failed", err);
                        setRegError("Failed to register account with Firebase: " + err.message);
                      }`;

const newBlock = `                      try {
                        const { registerWithEmail } = await import("./lib/firebase");
                        await registerWithEmail(email, password);
                        
                        const newRequest = {
                          id: \`req-\${Date.now()}\`,
                          name,
                          email,
                          phone,
                          company,
                          designation,
                          message,
                          date: new Date().toISOString().split("T")[0]
                        };

                        syncPendingRegistrations([...pendingRegistrations, newRequest]);
                        form.reset();
                        setRegSuccess(\`Access request submitted successfully! Your profile has been queued for review.\`);
                      } catch (err: any) {
                        console.error("Firebase registration failed", err);
                        
                        if (err.code === 'auth/email-already-in-use' || err.message.includes('email-already-in-use')) {
                          // Submit access request anyway if the email is already in the system
                          const newRequest = {
                            id: \`req-\${Date.now()}\`,
                            name,
                            email,
                            phone,
                            company,
                            designation,
                            message,
                            date: new Date().toISOString().split("T")[0]
                          };
                          syncPendingRegistrations([...pendingRegistrations, newRequest]);
                          form.reset();
                          setRegSuccess(\`Account exists! Your access request has been submitted. Once approved, you can log in with your existing password.\`);
                        } else {
                          setRegError("Failed to register account with Firebase: " + err.message);
                        }
                      }`;

if (code.includes(oldBlock)) {
    code = code.replace(oldBlock, newBlock);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patched successfully");
} else {
    console.log("Could not find the block to replace.");
}
