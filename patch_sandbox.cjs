const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const sandboxCode = `
  const sandboxControls = !isDeveloperPreviewLink && (typeof window !== "undefined" && (
    window.location.hostname.includes("localhost") ||
    window.location.hostname.includes("127.0.0.1") ||
    window.location.hostname.includes("run.app") ||
    window.location.hostname.includes("googleusercontent.com") ||
    window.location.hostname.includes("aistudio")
  )) ? (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-900/95 text-slate-100 p-3.5 rounded-2xl border border-slate-800 shadow-xl max-w-xs space-y-2.5 backdrop-blur-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">🧪 Sandbox Tester Controls</span>
        <span className={\`w-2 h-2 rounded-full \${isAdminMode ? "bg-rose-500" : "bg-emerald-500"} animate-pulse\`}></span>
      </div>
      <div className="space-y-1.5 text-left">
        <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">
          Testing Mode: <span className="font-mono text-indigo-300">{isAdminMode ? "Admin Panel" : "Recruiter CRM"}</span>
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => {
              handleNavigatePath("/recruiter");
              setCurrentView("dashboard");
            }}
            className={\`text-[9px] font-black p-2 rounded-lg transition-colors flex items-center justify-center gap-1 \${
              !isAdminMode ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }\`}
            title="Go to Recruiter CRM portal screen"
          >
            🔓 Recruiter
          </button>
          <button
            onClick={() => {
              handleNavigatePath("/admin");
              setCurrentView("dashboard");
            }}
            className={\`text-[9px] font-black p-2 rounded-lg transition-colors flex items-center justify-center gap-1 \${
              isAdminMode ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }\`}
            title="Go to Founder Admin master portal"
          >
            🛡️ Admin
          </button>
        </div>
      </div>
    </div>
  ) : null;

`;

code = code.replace("if (!isConfigLoaded) {", sandboxCode + "  if (!isConfigLoaded) {");

code = code.replace(
  `  if (currentView === "public-home" || urlPath.startsWith("/home")) {
    return (
      <PublicHomepageView 
        jobs={jobs}
        teamRecruiters={teamRecruiters}
        companyName={companyName}
        companyLogo={companyLogo}
      />
    );
  }`,
  `  if (currentView === "public-home" || urlPath.startsWith("/home")) {
    return (
      <>
        <PublicHomepageView 
          jobs={jobs}
          teamRecruiters={teamRecruiters}
          companyName={companyName}
          companyLogo={companyLogo}
        />
        {sandboxControls}
      </>
    );
  }`
);

code = code.replace(
  `  if (currentView === "candidate-portal" || urlPath.startsWith("/apply")) {
    return (
      <CandidateApplyView 
        jobs={jobs}
        teamRecruiters={teamRecruiters}
        onApply={handleAddCandidate}
        companyName={companyName}
        companyLogo={companyLogo}
      />
    );
  }`,
  `  if (currentView === "candidate-portal" || urlPath.startsWith("/apply")) {
    return (
      <>
        <CandidateApplyView 
          jobs={jobs}
          teamRecruiters={teamRecruiters}
          onApply={handleAddCandidate}
          companyName={companyName}
          companyLogo={companyLogo}
        />
        {sandboxControls}
      </>
    );
  }`
);

fs.writeFileSync('src/App.tsx', code);
