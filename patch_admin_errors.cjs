const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add states
code = code.replace(
    'const [loginError, setLoginError] = useState("");',
    'const [loginError, setLoginError] = useState("");\n  const [adminError, setAdminError] = useState("");'
);

const adminFormStart = `<form
                    onSubmit={(e) => {
                      e.preventDefault();`;
const newAdminFormStart = `<form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setAdminError("");`;
code = code.replace(adminFormStart, newAdminFormStart);

const adminErrorAlert = `alert("Invalid Admin credentials. Only authorized Admin account (admin@company.com) is allowed.");`;
const newAdminErrorAlert = `setAdminError("Invalid Admin credentials. Only authorized Admin account (admin@company.com) is allowed.");`;
code = code.replace(adminErrorAlert, newAdminErrorAlert);

const adminGoogleError1 = `alert("Access Denied: Your Google account is not authorized as an admin.");`;
const newAdminGoogleError1 = `setAdminError("Access Denied: Your Google account is not authorized as an admin.");`;
code = code.replace(adminGoogleError1, newAdminGoogleError1);

const adminGoogleError2 = `alert("Failed to login with Google: " + (e instanceof Error ? e.message : String(e)));`;
const newAdminGoogleError2 = `setAdminError("Failed to login with Google: " + (e instanceof Error ? e.message : String(e)));`;
// Make sure to only replace it in the first occurrence (which is the admin one, because it appears twice now if it wasn't fully replaced)
code = code.replace(adminGoogleError2, newAdminGoogleError2);

const adminFormFieldsStart = `                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Admin Email ID</label>`;

const adminFormFieldsWithMessages = `                    {adminError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] px-3 py-2.5 rounded-xl text-center font-medium leading-relaxed">
                        {adminError}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Admin Email ID</label>`;

code = code.replace(adminFormFieldsStart, adminFormFieldsWithMessages);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched admin errors inline!");
