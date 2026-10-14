const fs = require('fs');

const files = [
  'src/App.tsx',
  'src/components/TalentPoolView.tsx',
  'src/components/SettingsView.tsx',
  'src/components/CandidateApplyView.tsx',
  'src/components/PortalJobsManager.tsx',
  'src/components/ATSWorkspace.tsx',
  'src/components/JobsView.tsx',
  'src/components/ShareKitView.tsx',
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;
    
    code = code.replace(/<input\b([^]*?)\/>/g, function(match, p1) {
      if (match.includes('type="email"') || match.includes('type="password"')) {
         return match;
      }
      if (match.includes('type="text"') || match.includes('type="search"') || match.includes('type="tel"') || !match.includes('type=')) {
         if (match.includes('className="')) {
            let newMatch = match.replace(/className="([^"]*?)"/, function(cMatch, c1) {
              if (c1.includes('capitalize')) return cMatch;
              return 'className="' + c1 + ' capitalize"';
            });
            if (!newMatch.includes('autoCapitalize=')) {
                newMatch = newMatch.replace(/<input\b/, '<input autoCapitalize="words"');
            }
            return newMatch;
         }
      }
      return match;
    });
    
    code = code.replace(/<textarea\b([^]*?)>([^]*?)<\/textarea>/g, function(match, p1, p2) {
      if (match.includes('className="')) {
         let newMatch = match.replace(/className="([^"]*?)"/, function(cMatch, c1) {
           if (c1.includes('capitalize')) return cMatch;
           return 'className="' + c1 + ' capitalize"';
         });
         if (!newMatch.includes('autoCapitalize=')) {
             newMatch = newMatch.replace(/<textarea\b/, '<textarea autoCapitalize="sentences"');
         }
         return newMatch;
      }
      return match;
    });
    
    if (code !== original) {
      fs.writeFileSync(file, code);
      console.log('Patched ' + file);
    }
  }
});
