const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /if \(window\.confirm\("Are you sure you want to restore default sample data\? This will reset job openings, candidates, and templates to initial default state\."\)\) \{\n([\s\S]*?)alert\("System data restored to default sample state successfully!"\);\n\s*\}/;

const match = code.match(regex);
if (match) {
  const replacement = `setConfirmDialog({
      message: "Are you sure you want to restore default sample data? This will reset job openings, candidates, and templates to initial default state.",
      onConfirm: () => {
${match[1]}        setGlobalMessage("System data restored to default sample state successfully!");
      }
    });`;
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched restore defaults");
} else {
  console.log("Not found");
}

