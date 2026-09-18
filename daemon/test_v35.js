const http = require('http');

async function main() {
  // Test apply-code
  const payload = JSON.stringify({
    filename: 'scripts/test_feature.gd',
    code: 'extends KinematicBody\nexport var speed = 200\nfunc _ready():\n\tyield(get_tree().create_timer(1.0), "timeout")',
    commitMessage: 'Test v3.5 sanitizer & rollback'
  });

  const applyRes = await new Promise(resolve => {
    const req = http.request('http://127.0.0.1:32124/apply-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.write(payload);
    req.end();
  });

  console.log('Apply Result:', applyRes);

  // Check file content
  const fs = require('fs');
  const path = require('path');
  const savedPath = path.join(__dirname, '..', 'godot_project', 'scripts', 'test_feature.gd');
  console.log('Saved Content:\n' + fs.readFileSync(savedPath, 'utf8'));

  // Clean up test file
  fs.unlinkSync(savedPath);
  console.log('Cleaned up test file.');
}

main().catch(console.error);
