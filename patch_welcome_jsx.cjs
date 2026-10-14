const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const welcomeModalJSX = `
      {/* Welcome Modal for First-time Logins */}
      {showWelcomeModal && loggedInRecruiter && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Sparkles className="w-24 h-24 text-white" />
               </div>
               <div className="absolute bottom-0 left-0 p-4 opacity-20 transform translate-y-1/2 -translate-x-1/4">
                  <Sparkles className="w-32 h-32 text-white" />
               </div>
               <div className="relative z-10">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
                    <PartyPopper className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Welcome to Your Portal</h2>
                  <p className="text-indigo-100 text-sm font-medium">Hello, {loggedInRecruiter.name.split(' ')[0]}! Your recruiter workspace is ready.</p>
               </div>
            </div>
            
            <div className="p-8">
               <div className="space-y-6">
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                       <UserPlus className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                       <h4 className="text-sm font-bold text-slate-800 mb-1">Source & Manage Candidates</h4>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed">Add new applicants directly to the ATS, track their progress, and move them through pipeline stages.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                       <Grid className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                       <h4 className="text-sm font-bold text-slate-800 mb-1">Track Live Openings</h4>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed">Access real-time job openings approved by the founder, complete with job descriptions and requirements.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                       <PieChart className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                       <h4 className="text-sm font-bold text-slate-800 mb-1">Monitor Your Performance</h4>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed">Keep track of your active submissions, approvals, and total sourced candidates right from your dashboard.</p>
                    </div>
                 </div>
               </div>
               
               <button
                  onClick={() => {
                     localStorage.setItem(\`recruit_crm_welcome_shown_\${loggedInRecruiter.id}\`, "true");
                     setShowWelcomeModal(false);
                  }}
                  className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl py-3.5 transition-all active:scale-[0.98] focus:outline-none flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
               >
                  Let's Get Started <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace('{sandboxControls}', welcomeModalJSX + '\n      {sandboxControls}');

fs.writeFileSync('src/App.tsx', code);
console.log("Patched welcome modal JSX");
