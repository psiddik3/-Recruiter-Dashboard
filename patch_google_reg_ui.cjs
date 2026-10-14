const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `<div className="space-y-4">\n                    <div>\n                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">\n                        <Unlock className="w-4.5 h-4.5 text-indigo-600" /> Sign In with Registered Email\n                      </h3>`;

const replaceStr = `<div className="space-y-4">
                    {googleRegistrationPendingUser ? (
                      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-4 animate-in fade-in zoom-in duration-300">
                        <h3 className="text-sm font-extrabold text-indigo-900 mb-1 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Complete Registration
                        </h3>
                        <p className="text-xs text-indigo-700/80 mb-4">
                          Welcome, {googleRegistrationPendingUser.name}! Please provide your contact number and designation to submit your access request.
                        </p>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const phone = (form.elements.namedItem("regPhone") as HTMLInputElement).value.trim();
                            const designation = (form.elements.namedItem("regRole") as HTMLInputElement).value.trim();
                            
                            const newRequest = {
                              id: \`req-\${Date.now()}\`,
                              name: googleRegistrationPendingUser.name,
                              email: googleRegistrationPendingUser.email,
                              designation,
                              phone,
                              message: "Signed up via Google Authentication.",
                              date: new Date().toISOString().split("T")[0]
                            };
                            syncPendingRegistrations([...pendingRegistrations, newRequest]);
                            setGoogleRegistrationPendingUser(null);
                            alert("Access request submitted successfully!\\n\\nWe will contact you shortly to complete the onboarding process.");
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Phone Number</label>
                            <input
                              name="regPhone"
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              required
                              className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Designation</label>
                            <input
                              name="regRole"
                              type="text"
                              placeholder="e.g. Talent Sourcer"
                              required
                              className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setGoogleRegistrationPendingUser(null)}
                              className="flex-1 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl py-2 transition-colors focus:outline-none"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl py-2 transition-colors focus:outline-none"
                            >
                              Submit Request
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <Unlock className="w-4.5 h-4.5 text-indigo-600" /> Sign In with Registered Email
                      </h3>`;

if (code.includes('<Unlock className="w-4.5 h-4.5 text-indigo-600" /> Sign In with Registered Email')) {
  code = code.replace(targetStr, replaceStr);
  const endTarget = `                  {/* Simulated Recruiters testing help */}`;
  const endReplace = `                  </>\n                  )}\n                  {/* Simulated Recruiters testing help */}`;
  code = code.replace(endTarget, endReplace);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched successfully!");
} else {
  console.log("Could not find target string.");
}
