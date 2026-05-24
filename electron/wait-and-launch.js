const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

function check(url) {
  return new Promise((resolve) => {
    http.get(url, () => resolve(true)).on('error', () => resolve(false));
  });
}

async function waitForServices() {
  console.log('Waiting for services...');
  for (let i = 0; i < 60; i++) {
    const [vite, server] = await Promise.all([
      check('http://localhost:5173'),
      check('http://localhost:3001/api/health'),
    ]);
    if (vite && server) {
      console.log('Services ready, launching Electron...');
      const electronPath = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
      const child = spawn(electronPath, ['.'], { cwd: __dirname, stdio: 'inherit' });
      child.on('exit', (code) => process.exit(code || 0));
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error('Timeout waiting for services');
  process.exit(1);
}

waitForServices();
