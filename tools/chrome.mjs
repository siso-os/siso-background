// Shared by shoot.mjs and check.mjs: start the repo's server on a free port, run headless Chromium, stop the server.
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CHROME = process.env.CHROME || 'chromium';
const FLAGS = ['--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-extensions'];

function freePort() {
  return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}

export async function withServer(fn) {
  const port = await freePort();
  const srv = spawn('python3', [path.join(ROOT, 'tools/serve.py'), String(port), '--quiet'], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res) => srv.stdout.once('data', res));
  try { return await fn(`http://127.0.0.1:${port}`); } finally { srv.kill('SIGTERM'); }
}

const dataDir = () => path.join(ROOT, '.chrome-' + process.pid + '-' + Math.random().toString(36).slice(2, 8));

export function chrome(args, { budget = 6000, timeout = 120000 } = {}) {
  const dir = dataDir();
  try {
    return execFileSync(CHROME, [...FLAGS, `--user-data-dir=${dir}`, `--virtual-time-budget=${budget}`, ...args],
      { encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } finally { execFileSync('rm', ['-rf', dir]); }
}
