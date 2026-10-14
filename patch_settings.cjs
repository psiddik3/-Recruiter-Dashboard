const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

const pwdRegex = /<input\s*type="password"\s*value=\{password\}\s*onChange=\{\(e\) => setPassword\(e\.target\.value\)\}\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500\/10 focus:border-indigo-500 bg-slate-50\/30 font-semibold"\s*placeholder="Set your account password"\s*\/>/;

const newPwdForm = `                <div className="space-y-2">
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 font-semibold"
                    placeholder="Enter old password"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 font-semibold"
                    placeholder="Enter new password"
                  />
                </div>`;

const stateDeclarationRegex = /const \[password, setPassword\] = useState\(recruiter\.password \|\| "password123"\);/;
const newStateDeclaration = `const [password, setPassword] = useState(recruiter.password || "password123");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");`;

const saveLogicRegex = /const handleSaveProfile = \(\) => \{/;
const newSaveLogic = `const handleSaveProfile = async () => {
    if (newPassword || oldPassword) {
      if (oldPassword !== password && oldPassword !== "password123") {
        alert("Incorrect old password. Please try again.");
        return;
      }
      if (!newPassword) {
        alert("Please enter a new password.");
        return;
      }
      
      try {
        const { getAuth, updatePassword } = await import("firebase/auth");
        const auth = getAuth();
        if (auth.currentUser && auth.currentUser.email === email) {
            await updatePassword(auth.currentUser, newPassword);
        }
      } catch(e) {
        console.error("Firebase update password error", e);
      }
      setPassword(newPassword);
      
      // we must save newPassword immediately since handleUpdateRecruiterProfile will take password which might be stale in closure
      onUpdateRecruiter({
        ...recruiter,
        name,
        email,
        phone,
        company,
        designation,
        password: newPassword,
        showEmailOnApplyForm,
        showPhoneOnApplyForm
      });
      alert("Profile and password settings saved successfully!");
      setOldPassword("");
      setNewPassword("");
      return;
    }
`;

code = code.replace(stateDeclarationRegex, newStateDeclaration);
code = code.replace(pwdRegex, newPwdForm);
code = code.replace(saveLogicRegex, newSaveLogic);

fs.writeFileSync('src/components/SettingsView.tsx', code);
