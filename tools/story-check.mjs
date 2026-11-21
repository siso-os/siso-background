#!/usr/bin/env node
// The finish line for story mode (src/story/): the script plays the owner's storyline as one loop, and this proves it.
//   node tools/story-check.mjs [--no-browser]
// In node (the drawing stubbed): every scripted event plans, in this loop and the next, the same way twice; each one is
// on screen for at least half of its run from the story's own camera; the beats and the camera keys run in order
// inside the loop; the camera rides the rocket into space and is back home for the tower; the seam is black when the
// camera jumps. In headless Chromium: a still of every beat draws with no errors, and the live page shows the bar.
// The last line is PASS or FAIL.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

globalThis.Path2D ??= class { addPath() {} moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} closePath() {} arc() {} rect() {} ellipse() {} };
globalThis.OffscreenCanvas ??= class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return new Proxy({}, { get: () => () => ({ addColorStop() {} }) }); } };

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const { StoryDirector } = await imp('src/story/director.js');
const { makeView, setZoom, LEVELS } = await imp('src/engine/view.js');
const { lightAt } = await imp('src/core/light.js');

const problems = [];
const W = 1920, H = 1080;
setZoom(1.25);
const d = new StoryDirector(), again = new StoryDirector();
const S = d.S, LOOP = d.loop;

// 1. order and bounds
const asc = (xs, k) => xs.every((x, i) => i === 0 || x[k] > xs[i - 1][k]);
if (!asc(S.BEATS, 'at') || S.BEATS[0].at !== 0 || S.BEATS.at(-1).at >= LOOP) problems.push('beats are not in order inside the loop');
if (!asc(S.CAMERA, 't') || S.CAMERA[0].t !== 0 || S.CAMERA.at(-1).t !== LOOP) problems.push('camera keys are not in order from 0 to LOOP');
for (const e of S.EVENTS) if (e.at < 0 || e.at >= LOOP) problems.push(`event ${e.id} at ${e.at} is outside the loop`);

// 2. every event plans, the same way twice, and in the next loop; it is on screen for half its run
const sig = (ev) => JSON.stringify(ev, (k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : typeof v === 'function' ? undefined : v));
for (let i = 0; i < S.EVENTS.length; i++) {
  const e = S.EVENTS[i], ev = d.ev(i, 0), ev1 = d.ev(i, 1);
  if (!ev) { problems.push(`event ${i} ${e.id} plans nothing`); continue; }
  if (!ev1) problems.push(`event ${i} ${e.id} plans nothing in the second loop`);
  if (sig(ev) !== sig(again.ev(i, 0))) problems.push(`event ${i} ${e.id} plans differently the second time`);
  let on = 0, n = 0;
  for (let u = 0.5; u < ev.dur; u += ev.dur / 12) {
    const t = ev.t0 + u, c = d.cam(t), v = makeView(W, H, c.x, c.y);
    const L = lightAt(d.hour(t), { altitude: 0 });
    const vis = d.items(t, L, v).filter((it) => !it.overlay && it.x !== undefined && it.z > 0).filter((it) => {
      const X = v.sx(it.x, it.z), Y = v.sy(it.y || 0, it.z);
      return X > -40 && X < W + 40 && Y > -40 && Y < H + 40;
    });
    n++; if (vis.length) on++;
  }
  const line = `${String(i).padStart(2)} ${e.id.padEnd(12)} at ${String(e.at).padStart(3)}  on screen ${on}/${n}`;
  console.log(line);
  if (on < n / 2) problems.push(`event ${i} ${e.id} is on screen in only ${on} of ${n} samples`);
}

// 3. the camera: up with the rocket, over the strike in space, home for the tower; the seam black
const space = LEVELS[2];
const top = Math.min(...Array.from({ length: 60 }, (_, k) => d.cam(137 + k * 0.75).y));
if (top > space + 100) problems.push(`the camera never reaches space while riding the rocket (highest y ${top.toFixed(0)})`);
const strike = S.EVENTS.find((e) => e.id === 'strike');
if (strike && Math.abs(d.cam(strike.at + 8).y - space) > 60) problems.push(`the camera is not in space for the strike (y ${d.cam(strike.at + 8).y.toFixed(0)})`);
// home: down at the bay, at most the islands' height up (the tower barrage is framed high, so the tower and the
// stream climbing out of it are in shot), never still up in the clouds or space
for (const b of S.BEATS.filter((b) => /tower/i.test(b.title))) if (Math.abs(d.cam(b.at + 6).y) > 600) problems.push(`the camera is not home at the bay for "${b.title}" (y ${d.cam(b.at + 6).y.toFixed(0)})`);
if (d.fade(LOOP - 0.1) < 0.97 || d.fade(0.02) < 0.97) problems.push('the seam is not black when the camera jumps');
if (d.fade(LOOP / 2) !== 0) problems.push('the fade is up in the middle of the loop');
const jump = Math.hypot(d.cam(LOOP - 0.01).x - d.cam(LOOP + 0.01).x, d.cam(LOOP - 0.01).y - d.cam(LOOP + 0.01).y);
console.log(`camera: rocket ride tops out at y ${top.toFixed(0)}, seam jump ${jump.toFixed(0)} under a fade of ${d.fade(LOOP - 0.1).toFixed(2)}`);

// 4. in the browser: a still of every beat draws cleanly, the live page shows the bar
if (!process.argv.includes('--no-browser')) {
  const { withServer, chrome } = await import(pathToFileURL(path.join(ROOT, 'tools/chrome.mjs')).href);
  await withServer(async (base) => {
    for (let i = 0; i < S.BEATS.length; i++) {
      const b = S.BEATS[i], end = i + 1 < S.BEATS.length ? S.BEATS[i + 1].at : LOOP, t = (b.at + end) / 2;
      const dom = chrome(['--window-size=1280,720', '--dump-dom', `${base}/index.html?story=1&freeze=1&t=${t}`], { budget: 8000 });
      const ready = /data-ready="1"/.test(dom), errors = (dom.match(/data-errors="(\d+)"/) || [])[1], drawn = (dom.match(/data-drawn="(\d+)\//) || [])[1];
      const err = (dom.match(/data-error="([^"]*)"/) || [])[1];
      if (!ready || errors !== '0' || !(Number(drawn) > 0)) problems.push(`beat ${i + 1} "${b.title}" at t ${t}: ready ${ready}, errors ${errors}, drawn ${drawn}${err ? ' (' + err + ')' : ''}`);
    }
    const live = chrome(['--window-size=1280,720', '--dump-dom', `${base}/index.html`], { budget: 3000 });
    if (!/<nav id="story"(?![^>]*hidden)/.test(live)) problems.push('the live page does not show the story bar');
    if ((live.match(/class="seg/g) || []).length !== S.BEATS.length) problems.push('the story bar does not have one segment per beat');
    const off = chrome(['--window-size=1280,720', '--dump-dom', `${base}/index.html?story=0`], { budget: 3000 });
    if (!/<nav id="story"[^>]*hidden/.test(off)) problems.push('?story=0 still shows the story bar');
  });
  console.log(`browser: ${S.BEATS.length} beat stills, the live page and ?story=0 checked`);
}

for (const p of problems) console.log('  - ' + p);
console.log(problems.length ? `FAIL (${problems.length})` : 'PASS');
process.exit(problems.length ? 1 : 0);
