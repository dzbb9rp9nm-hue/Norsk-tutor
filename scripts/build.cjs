// Publish only the app, never project notes, tests, credentials, or database scripts.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'app.js', 'styles.css', 'scenarios.js', 'tutor-prompt.js', '_headers']) {
  fs.copyFileSync(path.join(root, name), path.join(output, name));
}
console.log('Prepared six app files for publication.');
