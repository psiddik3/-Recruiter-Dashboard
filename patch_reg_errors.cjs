const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add states
code = code.replace(
    'const [loginError, setLoginError] = useState("");',
    'const [loginError, setLoginError] = useState("");\n  const [regError, setRegError] = useState("");\n  const [regSuccess, setRegSuccess] = useState("");'
);

// Form submit
const startMarker = `                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();`;
const startReplacement = `                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setRegError("");
                      setRegSuccess("");`;
code = code.replace(startMarker, startReplacement);

// alert("This email is already registered or has a pending request.");
code = code.replace(
    'alert("This email is already registered or has a pending request.");',
    'setRegError("This email is already registered or has a pending request.");'
);
code = code.replace(
    'alert("Please enter a password.");',
    'setRegError("Please enter a password.");'
);

const successAlertReg = `alert(\`Access request submitted successfully!\\n\\nYour profile has been queued for review. Please contact the administrator to activate your account.\`);`;
const successRegCode = `setRegSuccess(\`Access request submitted successfully! Your profile has been queued for review.\`);`;
code = code.replace(successAlertReg, successRegCode);

const errAlertReg = `alert("Failed to register account with Firebase: " + err.message);`;
const errRegCode = `setRegError("Failed to register account with Firebase: " + err.message);`;
code = code.replace(errAlertReg, errRegCode);

// Add the message box UI to registration form
const regFormFieldsStart = `                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Full Name</label>`;

const regFormFieldsWithMessages = `                      {regError && (
                        <div className="md:col-span-2 bg-red-50 border border-red-100 text-red-600 text-[11px] px-3 py-2.5 rounded-xl text-center font-medium leading-relaxed">
                          {regError}
                        </div>
                      )}
                      {regSuccess && (
                        <div className="md:col-span-2 bg-green-50 border border-green-100 text-green-600 text-[11px] px-3 py-2.5 rounded-xl text-center font-medium leading-relaxed">
                          {regSuccess}
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Full Name</label>`;

code = code.replace(regFormFieldsStart, regFormFieldsWithMessages);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched reg errors inline!");
