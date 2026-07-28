import fs from 'fs';

let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

// Replace name block
code = code.replace(/\{isFounderMode \? \(\s*<div className="relative">\s*<input\s*type="text"\s*value=\{name\}\s*disabled\s*readOnly\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-100 text-slate-500 cursor-not-allowed font-semibold"\s*\/>\s*<span className="absolute right-3 top-2 text-\[10px\] font-black text-rose-500 bg-rose-50 border border-rose-100\/60 px-1\.5 py-0\.5 rounded uppercase tracking-wider">Locked<\/span>\s*<\/div>\s*\) : \(\s*<input\s*type="text"\s*value=\{name\}\s*onChange=\{\(e\) => setName\(e.target.value\)\}\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500\/10 focus:border-indigo-500 bg-slate-50\/30"\s*\/>\s*\)\}/g, `<input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30"
                />`);

// Replace email block
code = code.replace(/<div className="relative">\s*<input\s*type="email"\s*value=\{email\}\s*disabled\s*readOnly\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-100 text-slate-500 cursor-not-allowed font-semibold"\s*\/>\s*<span className="absolute right-3 top-2 text-\[10px\] font-black text-rose-500 bg-rose-50 border border-rose-100\/60 px-1\.5 py-0\.5 rounded uppercase tracking-wider">Locked<\/span>\s*<\/div>/g, `<input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30"
                  />`);

// Replace phone block
code = code.replace(/\{isFounderMode \? \(\s*<div className="relative">\s*<input\s*type="text"\s*value=\{phone\}\s*disabled\s*readOnly\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-100 text-slate-500 cursor-not-allowed font-semibold"\s*\/>\s*<span className="absolute right-3 top-2 text-\[10px\] font-black text-rose-500 bg-rose-50 border border-rose-100\/60 px-1\.5 py-0\.5 rounded uppercase tracking-wider">Locked<\/span>\s*<\/div>\s*\) : \(\s*<input\s*type="text"\s*value=\{phone\}\s*onChange=\{\(e\) => setPhone\(e.target.value\)\}\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500\/10 focus:border-indigo-500 bg-slate-50\/30"\s*\/>\s*\)\}/g, `<input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30"
                  />`);

// Replace company block
code = code.replace(/\{isFounderMode \? \(\s*<div className="relative">\s*<input\s*type="text"\s*value=\{company\}\s*disabled\s*readOnly\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-100 text-slate-500 cursor-not-allowed font-semibold"\s*\/>\s*<span className="absolute right-3 top-2 text-\[10px\] font-black text-rose-500 bg-rose-50 border border-rose-100\/60 px-1\.5 py-0\.5 rounded uppercase tracking-wider">Locked<\/span>\s*<\/div>\s*\) : \(\s*<input\s*type="text"\s*value=\{company\}\s*onChange=\{\(e\) => setCompany\(e.target.value\)\}\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500\/10 focus:border-indigo-500 bg-slate-50\/30"\s*\/>\s*\)\}/g, `<input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30"
                  />`);

// Replace designation block
code = code.replace(/\{isFounderMode \? \(\s*<div className="relative">\s*<input\s*type="text"\s*value=\{designation\}\s*disabled\s*readOnly\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-100 text-slate-500 cursor-not-allowed font-semibold"\s*\/>\s*<span className="absolute right-3 top-2 text-\[10px\] font-black text-rose-500 bg-rose-50 border border-rose-100\/60 px-1\.5 py-0\.5 rounded uppercase tracking-wider">Locked<\/span>\s*<\/div>\s*\) : \(\s*<input\s*type="text"\s*value=\{designation\}\s*onChange=\{\(e\) => setDesignation\(e.target.value\)\}\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500\/10 focus:border-indigo-500 bg-slate-50\/30"\s*\/>\s*\)\}/g, `<input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30"
                />`);

// Replace password block
code = code.replace(/\{isFounderMode \? \(\s*<div className="relative">\s*<input\s*type="password"\s*value=\{password\}\s*disabled\s*readOnly\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-100 text-slate-500 cursor-not-allowed font-semibold"\s*\/>\s*<span className="absolute right-3 top-2 text-\[10px\] font-black text-rose-500 bg-rose-50 border border-rose-100\/60 px-1\.5 py-0\.5 rounded uppercase tracking-wider">Locked<\/span>\s*<\/div>\s*\) : \(\s*<input\s*type="password"\s*value=\{password\}\s*onChange=\{\(e\) => setPassword\(e.target.value\)\}\s*className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500\/10 focus:border-indigo-500 bg-slate-50\/30 font-semibold"\s*\/>\s*\)\}/g, `<input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 font-semibold"
                />`);


fs.writeFileSync('src/components/SettingsView.tsx', code);
