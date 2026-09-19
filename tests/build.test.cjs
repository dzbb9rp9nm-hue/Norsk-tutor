const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');

test('publish output contains only the allowed app assets, with their exact source contents',()=>{
  execFileSync(process.execPath,['scripts/build.cjs']);
  const expected=['_headers','app.js', 'password-reset.js', 'learning.js', 'sync.js','index.html','scenarios.js','styles.css','tutor-prompt.js'];
  assert.deepEqual(fs.readdirSync('dist').sort(),expected.sort());
  for(const file of expected)assert.equal(fs.readFileSync('dist/'+file,'utf8'),fs.readFileSync(file,'utf8'));
});
test('security policy permits the existing tutor endpoint without inline scripts or framing',()=>{
  const headers=fs.readFileSync('_headers','utf8');
  assert.match(headers,/script-src 'self'/);assert.doesNotMatch(headers,/unsafe-inline|unsafe-eval/);
  assert.match(headers,/connect-src 'self' https:\/\/api\.anthropic\.com;/);
  assert.match(headers,/frame-ancestors 'none'/);assert.match(headers,/X-Content-Type-Options: nosniff/);
  assert.match(headers,/microphone=\(self\)/);assert.match(headers,/Referrer-Policy: no-referrer/);
  const html=fs.readFileSync('index.html','utf8');
  assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(html,/\son(?:click|load|error|submit)=/i);
});
