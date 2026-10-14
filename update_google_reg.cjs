const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update approvalRequest state to include company
code = code.replace(
`  const [approvalRequest, setApprovalRequest] = useState<{
    id: string;
    name: string;
    email: string;
    designation: string;
    message?: string;
    phone?: string;
    date: string;
  } | null>(null);`,
`  const [approvalRequest, setApprovalRequest] = useState<{
    id: string;
    name: string;
    email: string;
    designation: string;
    message?: string;
    phone?: string;
    company?: string;
    date: string;
  } | null>(null);`
);

// 2. Update newRec creation inside handleConfirmApproval
code = code.replace(
`    const newRec = {
      id: newRecId,
      name: approvalRequest.name,
      email: approvalRequest.email,
      phone: approvalRequest.phone || "",
      designation: approvalRequest.designation,
      sourcedCount: 0,
      accessScope: "local" as const, // default isolated scope
      status: "active" as const,
      joinedDate: new Date().toISOString().split("T")[0],
      password: "password123"
    };`,
`    const newRec = {
      id: newRecId,
      name: approvalRequest.name,
      email: approvalRequest.email,
      phone: approvalRequest.phone || "",
      company: approvalRequest.company || adminCompanyName || "Spread One",
      designation: approvalRequest.designation,
      sourcedCount: 0,
      accessScope: "local" as const, // default isolated scope
      status: "active" as const,
      joinedDate: new Date().toISOString().split("T")[0],
      password: "password123"
    };`
);

// 3. Update Google Registration Form Logic
const googleFormOld = `                        <h3 className="text-sm font-extrabold text-indigo-900 mb-1 flex items-center gap-2">
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
                            };`;

const googleFormNew = `                        <h3 className="text-sm font-extrabold text-indigo-900 mb-1 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Welcome to Spread one, recruiter portal.
                        </h3>
                        <p className="text-xs text-indigo-700/80 mb-4">
                          Welcome to Spread one, {googleRegistrationPendingUser.name}. Please provide your company name, designation, and contact number to submit your access request.
                        </p>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const phone = (form.elements.namedItem("regPhone") as HTMLInputElement).value.trim();
                            const designation = (form.elements.namedItem("regRole") as HTMLInputElement).value.trim();
                            const company = (form.elements.namedItem("regCompany") as HTMLInputElement).value.trim();
                            
                            const newRequest = {
                              id: \`req-\${Date.now()}\`,
                              name: googleRegistrationPendingUser.name,
                              email: googleRegistrationPendingUser.email,
                              company,
                              designation,
                              phone,
                              message: "Signed up via Google Authentication.",
                              date: new Date().toISOString().split("T")[0]
                            };`;

code = code.replace(googleFormOld, googleFormNew);

// 4. Update Google Registration Form Inputs
const googleInputsOld = `                          <div>
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
                          </div>`;

const googleInputsNew = `                          <div>
                            <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Company Name</label>
                            <input
                              name="regCompany"
                              type="text"
                              placeholder="e.g. Spread One"
                              required
                              className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                            />
                          </div>
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
                          </div>`;

code = code.replace(googleInputsOld, googleInputsNew);


// 5. Update Manual Registration Request handling
const manualFormOld = `                      const phone = (form.elements.namedItem("regPhone") as HTMLInputElement)?.value.trim() || "";
                      const designation = (form.elements.namedItem("regRole") as HTMLInputElement).value.trim();
                      const message = (form.elements.namedItem("regMsg") as HTMLTextAreaElement).value.trim();
                      const password = (form.elements.namedItem("regPassword") as HTMLInputElement)?.value.trim();`;

const manualFormNew = `                      const phone = (form.elements.namedItem("regPhone") as HTMLInputElement)?.value.trim() || "";
                      const company = (form.elements.namedItem("regCompany") as HTMLInputElement)?.value.trim() || "";
                      const designation = (form.elements.namedItem("regRole") as HTMLInputElement).value.trim();
                      const message = (form.elements.namedItem("regMsg") as HTMLTextAreaElement).value.trim();
                      const password = (form.elements.namedItem("regPassword") as HTMLInputElement)?.value.trim();`;

code = code.replace(manualFormOld, manualFormNew);

const manualNewRequestOld = `                        const newRequest = {
                          id: \`req-\${Date.now()}\`,
                          name,
                          email,
                          phone,
                          designation,
                          message,
                          date: new Date().toISOString().split("T")[0]
                        };`;

const manualNewRequestNew = `                        const newRequest = {
                          id: \`req-\${Date.now()}\`,
                          name,
                          email,
                          phone,
                          company,
                          designation,
                          message,
                          date: new Date().toISOString().split("T")[0]
                        };`;

code = code.replace(manualNewRequestOld, manualNewRequestNew);

// 6. Update Manual Registration Form Inputs
const manualInputsOld = `                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Your Role</label>
                        <input
                          name="regRole"
                          type="text"
                          placeholder="UX Sourcer"
                          required
                          className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>`;

const manualInputsNew = `                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Company Name</label>
                        <input
                          name="regCompany"
                          type="text"
                          placeholder="Spread One"
                          required
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

code = code.replace(manualInputsOld, manualInputsNew);

// 7. Update Founder Panel Modal display fields
const modalDisplayOld = `                <div><span className="font-bold text-slate-700">Email:</span> {approvalRequest.email}</div>
                {approvalRequest.phone && <div><span className="font-bold text-slate-700">Phone:</span> {approvalRequest.phone}</div>}
                <div><span className="font-bold text-slate-700">Designation:</span> {approvalRequest.designation}</div>`;

const modalDisplayNew = `                <div><span className="font-bold text-slate-700">Email:</span> {approvalRequest.email}</div>
                {approvalRequest.phone && <div><span className="font-bold text-slate-700">Phone:</span> {approvalRequest.phone}</div>}
                {approvalRequest.company && <div><span className="font-bold text-slate-700">Company:</span> {approvalRequest.company}</div>}
                <div><span className="font-bold text-slate-700">Designation:</span> {approvalRequest.designation}</div>`;

code = code.replace(modalDisplayOld, modalDisplayNew);

// 8. Update Listing display fields
const listingDisplayOld = `                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900 text-xs">{req.name}</span>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">{req.designation}</span>
                                    <span className="text-[9px] text-slate-400 font-bold">{req.date}</span>
                                  </div>`;

const listingDisplayNew = `                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900 text-xs">{req.name}</span>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">{req.designation}</span>
                                    {req.company && <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">{req.company}</span>}
                                    <span className="text-[9px] text-slate-400 font-bold">{req.date}</span>
                                  </div>`;

code = code.replace(listingDisplayOld, listingDisplayNew);

fs.writeFileSync('src/App.tsx', code);
console.log("Updated correctly.");
