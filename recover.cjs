const fs = require('fs');
const code = fs.readFileSync('/tmp/served_app.tsx', 'utf8');
const base64Match = code.match(/sourceMappingURL=data:application\/json;base64,(.+)/);
if (base64Match) {
  const jsonStr = Buffer.from(base64Match[1], 'base64').toString('utf8');
  const map = JSON.parse(jsonStr);
  const appIndex = map.sources.findIndex(s => s.includes('App.tsx'));
  if (appIndex !== -1) {
    fs.writeFileSync('src/App.tsx', map.sourcesContent[appIndex]);
    console.log('Recovered App.tsx!');
  } else {
    console.log('App.tsx not found in sources array');
  }
} else {
  console.log('No source map found');
}
