const fs = require('fs');
let content = fs.readFileSync('src/components/JobsView.tsx', 'utf8');

const target = `<button 
                    onClick={() => setSharingJob(job)} 
                    className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>`;

const replaceWith = `<button 
                    onClick={() => setSharingJob(job)} 
                    className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditModal(job); }}
                    className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>`;

content = content.replace(target, replaceWith);
fs.writeFileSync('src/components/JobsView.tsx', content, 'utf8');
