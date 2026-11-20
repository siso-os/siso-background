#!/usr/bin/env node
// Films the scene: draws it at fixed steps of t in headless Chromium and saves each frame, for videos made from the
// story (the README's hero, the T3 chapters). The page is drawn exactly as a still (?freeze=1), one t after another,
// so the film is the same every time and does not depend on how fast the machine is.
//
//   node tools/film.mjs OUT_DIR [--from 0] [--to 330] [--fps 12] [--size 1280x720] [--q story=1] [--jpeg 90]
//
// Writes OUT_DIR/f00000.jpg ... and OUT_DIR/film.json ({ from, to, fps, size, frames, q }). --q adds URL params
// (story=1 by default: the story's own camera, hour and seam fade). Prints one line per 10 % and ends with PASS or FAIL.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { withServer } from './chrome.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const out = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!out) { console.log('usage: node tools/film.mjs OUT_DIR [--from s] [--to s] [--fps n] [--size WxH] [--q params]\nFAIL'); process.exit(2); }
const from = Number(opt('from', 0)), to = Number(opt('to', 330)), fps = Number(opt('fps', 12));
const [W, H] = opt('size', '1280x720').split('x').map(Number);
const q = opt('q', 'story=1'), jpeg = Number(opt('jpeg', 90));
fs.mkdirSync(out, { recursive: true });

const CHROME = process.env.CHROME || 'chromium';
const dir = path.join(out, '.chrome');

// a tiny CDP client over the page's websocket
function cdp(url) {
  const ws = new WebSocket(url);
  let id = 0; const wait = new Map(); const events = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && wait.has(msg.id)) { const { res, rej } = wait.get(msg.id); wait.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
    else if (msg.method) events.push(msg);
  };
  return new Promise((res, rej) => {
    ws.onopen = () => res({
      send: (method, params = {}) => new Promise((r, j) => { const n = ++id; wait.set(n, { res: r, rej: j }); ws.send(JSON.stringify({ id: n, method, params })); }),
      close: () => ws.close(),
    });
    ws.onerror = (e) => rej(new Error('cdp: ' + (e.message || 'socket error')));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = false;
await withServer(async (base) => {
  const ch = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-extensions',
    `--user-data-dir=${dir}`, '--remote-debugging-port=0', `--window-size=${W},${H}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  try {
    const port = await new Promise((res, rej) => {
      let buf = '';
      const t = setTimeout(() => rej(new Error('chromium did not start')), 20000);
      ch.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//); if (m) { clearTimeout(t); res(Number(m[1])); } });
    });
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find((p) => p.type === 'page');
    const c = await cdp(page.webSocketDebuggerUrl);
    await c.send('Page.enable'); await c.send('Runtime.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await c.send('Page.navigate', { url: `${base}/index.html?freeze=1&t=${from}&${q}` });
    const ev = async (expr) => { const r = await c.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
    // the page may not exist yet right after the navigation, on a loaded machine: ask until it is there and ready
    const ready = async () => { try { return (await ev('(document.documentElement && document.documentElement.dataset.ready) || ""')) === '1'; } catch { return false; } };
    for (let i = 0; i < 900 && !(await ready()); i++) await sleep(100);
    if (!(await ready())) throw new Error('the scene never got ready');
    const n = Math.max(1, Math.round((to - from) * fps));
    const t0 = Date.now();
    for (let k = 0; k < n; k++) {
      const t = from + k / fps;
      const file = path.join(out, `f${String(k).padStart(5, '0')}.jpg`);
      if (fs.existsSync(file) && fs.statSync(file).size > 0) continue;   // a rerun picks up where the last one stopped
      await ev(`(() => { const t = ${t}; scene.frame(t); const f = document.getElementById('fade'); if (f && scene.story) f.style.opacity = String(scene.story.fade(t)); return (window.__errors || []).length; })()`);
      const shot = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: jpeg, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
      fs.writeFileSync(file + '.tmp', Buffer.from(shot.data, 'base64')); fs.renameSync(file + '.tmp', file);
      if (k % Math.max(1, Math.round(n / 10)) === 0) console.log(`frame ${k}/${n}  t ${t.toFixed(2)}  ${((Date.now() - t0) / (k + 1)).toFixed(0)} ms/frame`);
    }
    const errors = await ev('(window.__errors || []).slice(0, 3)');
    fs.writeFileSync(path.join(out, 'film.json'), JSON.stringify({ from, to, fps, size: [W, H], frames: n, q }, null, 1));
    c.close();
    if (errors.length) console.log('page errors: ' + errors.join(' | ')); else ok = true;
    console.log(`${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  } finally { ch.kill('SIGTERM'); await sleep(300); fs.rmSync(dir, { recursive: true, force: true }); }
});
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
