const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /if \(window\.confirm\(`Are you sure you want to decline \$\{req\.name\}'s request\?`\)\) \{\n\s*const updated = pendingRegistrations\.filter\(r => r\.id !== req\.id\);\n\s*syncPendingRegistrations\(updated\);\n\s*\}/g,
  `setConfirmDialog({\n                                        message: \`Are you sure you want to decline \${req.name}'s request?\`,\n                                        onConfirm: () => {\n                                          const updated = pendingRegistrations.filter(r => r.id !== req.id);\n                                          syncPendingRegistrations(updated);\n                                          setGlobalMessage(\`Request from \${req.name} has been declined.\`);\n                                        }\n                                      });`
);

code = code.replace(
  /if \(window\.confirm\("Are you sure you want to restore default sample data\? This will reset job openings, candidates, and templates to initial default state\."\)\) \{\n\s*portalDb\.save\(\{ jobs: INITIAL_JOBS \}\);\n\s*applicantsDb\.save\(INITIAL_CANDIDATES\);\n\s*configDb\.save\(\{ templates: INITIAL_TEMPLATES \}\);\n\s*setJobs\(INITIAL_JOBS\);\n\s*setCandidates\(INITIAL_CANDIDATES\);\n\s*setTemplates\(INITIAL_TEMPLATES\);\n\s*alert\("System data restored to default sample state successfully!"\);\n\s*\}/g,
  `setConfirmDialog({\n      message: "Are you sure you want to restore default sample data? This will reset job openings, candidates, and templates to initial default state.",\n      onConfirm: () => {\n        portalDb.save({ jobs: INITIAL_JOBS });\n        applicantsDb.save(INITIAL_CANDIDATES);\n        configDb.save({ templates: INITIAL_TEMPLATES });\n        setJobs(INITIAL_JOBS);\n        setCandidates(INITIAL_CANDIDATES);\n        setTemplates(INITIAL_TEMPLATES);\n        setGlobalMessage("System data restored to default sample state successfully!");\n      }\n    });`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Patched');
