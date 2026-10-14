const fs = require('fs');
let code = fs.readFileSync('src/components/CandidateApplyView.tsx', 'utf8');

const deadlineBlock = `<div className="flex items-start gap-2.5 text-slate-600 min-w-[140px] flex-1">
                    <Calendar className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1 block whitespace-nowrap">Deadline</span>
                      <span className="text-sm font-bold text-slate-800 block whitespace-nowrap">{selectedJob.deadline || "Open"}</span>
                    </div>
                  </div>`;

code = code.replace(deadlineBlock, '');

fs.writeFileSync('src/components/CandidateApplyView.tsx', code);
