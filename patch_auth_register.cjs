const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regFormLogicRegex = /onSubmit=\{\(e\) => \{\s*e\.preventDefault\(\);\s*const form = e\.currentTarget;\s*const name = \(form\.elements\.namedItem\("regName"\) as HTMLInputElement\)\.value\.trim\(\);\s*const email = \(form\.elements\.namedItem\("regEmail"\) as HTMLInputElement\)\.value\.trim\(\);\s*const designation = \(form\.elements\.namedItem\("regRole"\) as HTMLInputElement\)\.value\.trim\(\);\s*const message = \(form\.elements\.namedItem\("regMsg"\) as HTMLTextAreaElement\)\.value\.trim\(\);\s*\/\/\s*Duplicate check\s*if \(teamRecruiters\.some\(tr => tr\.email\.toLowerCase\(\) === email\.toLowerCase\(\)\) \|\| pendingRegistrations\.some\(pr => pr\.email\.toLowerCase\(\) === email\.toLowerCase\(\)\)\) \{\s*alert\("This email is already registered or has a pending request\."\);\s*return;\s*\}\s*const newRequest = \{\s*id: \`req-\$\{Date\.now\(\)\}\`,\s*name,\s*email,\s*designation,\s*message,\s*date: new Date\(\)\.toISOString\(\)\.split\("T"\)\[0\]\s*\};\s*syncPendingRegistrations\(\[\.\.\.pendingRegistrations, newRequest\]\);\s*form\.reset\(\);\s*alert\(\`Access request submitted successfully!\\n\\nYour profile has been queued for review\. Please contact the administrator to activate your account\.\`\);\s*\}\}/;

const newRegFormLogic = `onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const name = (form.elements.namedItem("regName") as HTMLInputElement).value.trim();
                      const email = (form.elements.namedItem("regEmail") as HTMLInputElement).value.trim();
                      const designation = (form.elements.namedItem("regRole") as HTMLInputElement).value.trim();
                      const message = (form.elements.namedItem("regMsg") as HTMLTextAreaElement).value.trim();
                      const password = (form.elements.namedItem("regPassword") as HTMLInputElement)?.value.trim();

                      // Duplicate check
                      if (teamRecruiters.some(tr => tr.email.toLowerCase() === email.toLowerCase()) || pendingRegistrations.some(pr => pr.email.toLowerCase() === email.toLowerCase())) {
                        alert("This email is already registered or has a pending request.");
                        return;
                      }

                      if (!password) {
                        alert("Please enter a password.");
                        return;
                      }

                      try {
                        const { registerWithEmail } = await import("./lib/firebase");
                        await registerWithEmail(email, password);
                        
                        const newRequest = {
                          id: \`req-\${Date.now()}\`,
                          name,
                          email,
                          designation,
                          message,
                          date: new Date().toISOString().split("T")[0]
                        };

                        syncPendingRegistrations([...pendingRegistrations, newRequest]);
                        form.reset();
                        alert(\`Access request submitted successfully!\\n\\nYour profile has been queued for review. Please contact the administrator to activate your account.\`);
                      } catch (err: any) {
                        console.error("Firebase registration failed", err);
                        alert("Failed to register account with Firebase: " + err.message);
                      }
                    }}`;

code = code.replace(regFormLogicRegex, newRegFormLogic);

const regFormFieldsRegex = /<input\s*name="regRole"\s*type="text"\s*placeholder="UX Sourcer"\s*required\s*className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1\.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"\s*\/>\s*<\/div>\s*<\/div>/;

const newRegFormFields = `<input
                          name="regRole"
                          type="text"
                          placeholder="UX Sourcer"
                          required
                          className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Password</label>
                        <input
                          name="regPassword"
                          type="password"
                          placeholder="••••••••"
                          required
                          className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    </div>`;

code = code.replace(regFormFieldsRegex, newRegFormFields);
fs.writeFileSync('src/App.tsx', code);
