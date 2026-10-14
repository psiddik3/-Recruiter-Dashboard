const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldFunc = `  const handleUpdateTeamRecruiters = (updated: any[]) => {
    setTeamRecruiters(updated);
    try { localStorage.setItem("recruit_crm_team_recruiters_v2", JSON.stringify(updated)); } catch(e) { console.error("LocalStorage quota exceeded", e); } configDb.save({ teamRecruiters: updated });
  };`;

const newFunc = `  const handleUpdateTeamRecruiters = (updated: any[] | ((prev: any[]) => any[])) => {
    setTeamRecruiters((prev) => {
      const nextState = typeof updated === 'function' ? updated(prev) : updated;
      try { localStorage.setItem("recruit_crm_team_recruiters_v2", JSON.stringify(nextState)); } catch(e) { console.error("LocalStorage quota exceeded", e); } 
      configDb.save({ teamRecruiters: nextState });
      return nextState;
    });
  };`;

code = code.replace(oldFunc, newFunc);

const oldDel = `                                          onConfirm: () => {
                                            const updated = teamRecruiters.filter(tr => tr.id !== r.id);
                                            handleUpdateTeamRecruiters(updated);
                                            setGlobalMessage(\`\${r.name} has been removed.\`);
                                          }`;

const newDel = `                                          onConfirm: () => {
                                            handleUpdateTeamRecruiters(prev => prev.filter(tr => tr.id !== r.id));
                                            
                                            // Ensure their candidates remain in the central pool and are detached from the deleted recruiter
                                            const candidatesToUpdate = candidates.filter(c => c.recruiterId === r.id || c.sourcedBy === r.name);
                                            if (candidatesToUpdate.length > 0) {
                                               const updatedCandidates = candidates.map(c => {
                                                  if (c.recruiterId === r.id || c.sourcedBy === r.name) {
                                                      const updatedCand = { ...c, recruiterId: "central", sourcedBy: "Central Pool" };
                                                      import("./lib/firebase").then(({ applicantsDb }) => {
                                                          if (updatedCand.dbId) applicantsDb.update(updatedCand);
                                                      });
                                                      return updatedCand;
                                                  }
                                                  return c;
                                               });
                                               setCandidates(updatedCandidates);
                                            }

                                            setGlobalMessage(\`\${r.name} has been permanently deleted. Their candidates have been preserved in the central pool.\`);
                                          }`;

code = code.replace(oldDel, newDel);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched");
