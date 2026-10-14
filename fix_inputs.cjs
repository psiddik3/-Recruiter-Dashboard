const fs = require('fs');
let content = fs.readFileSync('src/components/JobsView.tsx', 'utf8');

const expTarget = `<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Required Experience</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 3+ years" 
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                    />`;

const expOptions = Array.from({length: 26}, (_, i) => `<option value="${i} years">${i} ${i===1?'year':'years'}</option>`).join('\n                      ');

const expReplace = `<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Required Experience</label>
                    <select
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                    >
                      ${expOptions}
                      <option value="3+ years">3+ years</option>
                    </select>`;

content = content.replace(expTarget, expReplace);

// Add Salary input if missing (or replace something else to make room)
// Let's find Employment Type or Location
const locTarget = `<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Remote, New York, etc." 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                    />
                  </div>`;

const locReplace = `<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Remote, New York, etc." 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Salary Range</label>
                    <input 
                      type="text" 
                      placeholder="e.g. $120,000 - $145,000" 
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                    />
                  </div>`;

content = content.replace(locTarget, locReplace);

fs.writeFileSync('src/components/JobsView.tsx', content, 'utf8');
