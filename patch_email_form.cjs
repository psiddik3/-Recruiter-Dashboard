const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update form handling
const newFormHandling = `const email = (form.elements.namedItem("regEmail") as HTMLInputElement).value.trim();
                      const phone = (form.elements.namedItem("regPhone") as HTMLInputElement)?.value.trim() || "";
                      const designation = (form.elements.namedItem("regRole") as HTMLInputElement).value.trim();`;
code = code.replace(/const email = \(form\.elements\.namedItem\("regEmail"\) as HTMLInputElement\)\.value\.trim\(\);\s*const designation = \(form\.elements\.namedItem\("regRole"\) as HTMLInputElement\)\.value\.trim\(\);/, newFormHandling);

// Add phone to newRequest
const newRequestData = `const newRequest = {
                          id: \`req-\${Date.now()}\`,
                          name,
                          email,
                          phone,
                          designation,
                          message,
                          date: new Date().toISOString().split("T")[0]
                        };`;
code = code.replace(/const newRequest = \{\s*id: `req-\$\{Date\.now\(\)\}`,\s*name,\s*email,\s*designation,\s*message,\s*date: new Date\(\)\.toISOString\(\)\.split\("T"\)\[0\]\s*\};/, newRequestData);

// Update HTML Form
const newInputs = `                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Corporate Email</label>
                        <input
                          name="regEmail"
                          type="email"
                          placeholder="ananya@company.com"
                          required
                          className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Phone Number</label>
                        <input
                          name="regPhone"
                          type="text"
                          placeholder="+1 234 567 8900"
                          className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Your Role</label>
                        <input
                          name="regRole"
                          type="text"
                          placeholder="UX Sourcer"
                          required
                          className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>`;

code = code.replace(/<div className="grid grid-cols-2 gap-2">\s*<div>\s*<label className="block text-\[10px\] font-black text-indigo-900\/50 uppercase tracking-wider mb-0\.5">Corporate Email<\/label>\s*<input\s*name="regEmail"\s*type="email"\s*placeholder="ananya@company\.com"\s*required\s*className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1\.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"\s*\/>\s*<\/div>\s*<div>\s*<label className="block text-\[10px\] font-black text-indigo-900\/50 uppercase tracking-wider mb-0\.5">Your Role<\/label>\s*<input\s*name="regRole"\s*type="text"\s*placeholder="UX Sourcer"\s*required\s*className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1\.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"\s*\/>\s*<\/div>/, newInputs);

fs.writeFileSync('src/App.tsx', code);
