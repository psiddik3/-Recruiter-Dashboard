const fs = require('fs');
let code = fs.readFileSync('src/components/JobsView.tsx', 'utf8');

// Replace deadline state with durationDays
code = code.replace(
  `const [deadline, setDeadline] = useState("2026-08-30");`,
  `const [durationDays, setDurationDays] = useState("15");\n  const [deadline, setDeadline] = useState("");`
);

// Add durationDays to job creation
code = code.replace(
  `      benefits,
      deadline,
      status,`,
  `      benefits,
      deadline,
      durationDays: parseInt(durationDays) || 15,
      expiresAt: new Date(Date.now() + (parseInt(durationDays) || 15) * 24 * 60 * 60 * 1000).toISOString(),
      status,`
);

// In the rendering, replace "Application Deadline" input with "Active Duration (Days)"
code = code.replace(
  `<label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Application Deadline
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800"
                    />`,
  `<label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Active Duration (Days)
                    </label>
                    <select
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800"
                    >
                      <option value="5">5 Days</option>
                      <option value="10">10 Days</option>
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                    </select>`
);

// Update preview to show how many days the job posting will be active
// We'll search for the place where deadline is displayed.
code = code.replace(
  `<span>Deadline: {job.deadline}</span>`,
  `<span>Active for {job.durationDays || 15} Days</span>`
);

fs.writeFileSync('src/components/JobsView.tsx', code);
console.log("Updated JobsView.tsx");
