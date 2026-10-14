const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/alert\(`Access Revoked: Your recruiter account \(\$\{loggedInRecruiter\.name\}\) has been suspended by the administrator\.`\);/g, `setGlobalMessage(\`Access Revoked: Your recruiter account (\${loggedInRecruiter.name}) has been suspended by the administrator.\`);`);
code = code.replace(/alert\("Backup data imported and restored successfully!"\);/g, `setGlobalMessage("Backup data imported and restored successfully!");`);
code = code.replace(/alert\("Invalid backup file format\. Please upload a valid JSON backup file\."\);/g, `setGlobalMessage("Invalid backup file format. Please upload a valid JSON backup file.");`);
code = code.replace(/alert\(`Successfully sent compiled batch to \$\{bulkEmailIds\.length\} candidate email list!`\);/g, `setGlobalMessage(\`Successfully sent compiled batch to \${bulkEmailIds.length} candidate email list!\`);`);

fs.writeFileSync('src/App.tsx', code);
console.log('Patched alerts');
