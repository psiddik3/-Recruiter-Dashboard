const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

content = content.replace('const [designation, setDesignation] = useState(recruiter.designation);', 'const [designation, setDesignation] = useState(recruiter.designation);\n  const [hiringTarget, setHiringTarget] = useState(recruiter.hiringTarget || "");');
content = content.replace('setDesignation(recruiter.designation);', 'setDesignation(recruiter.designation);\n    setHiringTarget(recruiter.hiringTarget || "");');

const designationTarget = `            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Designation</label>
              <input autoCapitalize="words"
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 capitalize"
                />
            </div>`;

const designationReplace = `            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Designation</label>
              <input autoCapitalize="words"
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 capitalize"
                />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly / LP Hiring Target</label>
              <input 
                  type="text"
                  placeholder="e.g. 5 hires / month"
                  value={hiringTarget}
                  onChange={(e) => setHiringTarget(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30"
                />
            </div>`;

content = content.replace(designationTarget, designationReplace);

const updateRecruiterTarget = `onUpdateRecruiter({
                  ...recruiter,
                  name,
                  email,
                  phone,
                  company,
                  designation,
                  password
                });`;

const updateRecruiterReplace = `onUpdateRecruiter({
                  ...recruiter,
                  name,
                  email,
                  phone,
                  company,
                  designation,
                  password,
                  hiringTarget
                });`;
content = content.replace(updateRecruiterTarget, updateRecruiterReplace);

fs.writeFileSync('src/components/SettingsView.tsx', content, 'utf8');
