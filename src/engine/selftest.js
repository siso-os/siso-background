// index.html?selftest=1: drives the real scene (its camera, keys, director and renderer) and reports
// { checks: [{ name, ok, note }] } into <pre id="selftest">. Every check states what it measured.

import { Camera } from './camera.js';
import { LEVELS, altitudeOf } from './view.js';
import { hourAt } from '../main.js';
import { REQUIRED } from '../assets/required.js';
import { sizeOf, SIZES } from './standin.js';
import { misses } from '../assets/registry.js';
import { EVENTS } from '../events/index.js';

const STEP = 1 / 60;
const key = (type, code, shift = true) => dispatchEvent(new KeyboardEvent(type, { code, key: code.replace('Key', ''), shiftKey: shift, bubbles: true }));

// Mean brightness (0..1) of a band of the backdrop, read straight after a draw.
function skyMean(r, y0f, y1f) {
  const gl = r.backdrop.gl, W = r.skyW, H = r.skyH;
  const y0 = Math.floor(H * (1 - y1f)), h = Math.max(1, Math.floor(H * (y1f - y0f)));
  const px = new Uint8Array(W * h * 4);
  gl.readPixels(0, y0, W, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let s = 0;
  for (let i = 0; i < px.length; i += 4) s += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  return s / (W * h * 255);
}

// A signature of every layer's pixels (FNV over a sample), to tell whether two frames are the same.
// A sample of every layer's pixels and a band of the backdrop, to compare two frames (mean difference 0..1 per layer).
// Exact equality is too strict: the browser may move a canvas between GPU and CPU drawing once it is read back.
function sample(r) {
  const out = {};
  for (const id of ['far', 'mid', 'main', 'near']) {
    const c = r.c[id];
    const d = c.getContext('2d', { willReadFrequently: false }).getImageData(0, 0, c.width, c.height).data;
    const s = new Uint8Array(Math.ceil(d.length / 28));
    for (let i = 0, j = 0; i < d.length; i += 28, j++) s[j] = (d[i] + d[i + 1] + d[i + 2] + d[i + 3]) >> 2;
    out[id] = s;
  }
  const gl = r.backdrop.gl, px = new Uint8Array(r.skyW * 4 * 8);
  gl.readPixels(0, Math.floor(r.skyH / 2), r.skyW, 8, gl.RGBA, gl.UNSIGNED_BYTE, px);
  out.sky = px;
  return out;
}
function differ(a, b) {
  const o = {};
  for (const k of Object.keys(a)) { let s = 0; for (let i = 0; i < a[k].length; i++) s += Math.abs(a[k][i] - b[k][i]); o[k] = s / (a[k].length * 255); }
  return o;
}
const fmt = (o) => Object.entries(o).map(([k, v]) => `${k} ${v.toFixed(4)}`).join(', ');

// Per-column coverage of a layer (sum of alpha), and the shift that best maps one onto another.
function profile(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const W = c.width, H = c.height, p = new Float32Array(W);
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x++) p[x] += d[(y * W + x) * 4 + 3];
  return p;
}
function bestShift(a, b, max) {
  let best = 0, err = Infinity;
  for (let s = 0; s <= max; s++) {
    let e = 0, n = 0;
    for (let i = 0; i + s < a.length; i += 2) { e += Math.abs(a[i + s] - b[i]); n++; }
    e /= Math.max(1, n);
    if (e < err) { err = e; best = s; }
  }
  return best;
}

export async function selftest(scene) {
  const checks = [];
  const add = (name, ok, note) => checks.push({ name, ok: !!ok, note: String(note) });
  const { cam, renderer: r, P } = scene;
  const safe = (name, f) => { try { f(); } catch (e) { add(name, false, 'threw: ' + e.message); } };
  let t = 40;
  const run = (secs) => { for (let i = 0; i < Math.round(secs / STEP); i++) { t += STEP; cam.step(STEP, t); } };

  // 1. the keys move the camera: Shift+D speeds it right, Shift+A left, the arrows too
  safe('keys-move-camera', () => {
    run(0.2);
    const a = cam.x;
    key('keydown', 'KeyD'); run(1.0); const b = cam.x; key('keyup', 'KeyD');
    run(5);
    const c0 = cam.x; key('keydown', 'KeyA'); run(1.0); const c = cam.x; key('keyup', 'KeyA');
    run(5);
    const d0 = cam.x; key('keydown', 'ArrowRight', false); run(0.8); key('keyup', 'ArrowRight', false); const d1 = cam.x;
    run(5);
    const plain = cam.x; key('keydown', 'KeyD', false); run(0.5); key('keyup', 'KeyD', false); const plainMoved = cam.x - plain;
    add('keys-move-camera', b - a > 300 && c < c0 - 300 && d1 - d0 > 200 && Math.abs(plainMoved) < 60,
      `Shift+D 1 s: +${(b - a).toFixed(0)} u; Shift+A 1 s: ${(c - c0).toFixed(0)} u; ArrowRight 0.8 s: +${(d1 - d0).toFixed(0)} u; plain D (no Shift) coasting only: ${plainMoved.toFixed(0)} u`);
  });

  // 2. untouched it drifts right at 40 u/s on the auto path; after input it coasts, then drifts again after 15 s
  safe('autoscroll', () => {
    const c = new Camera({ x0: 1000, t0: 0, drift: 40 });
    let tt = 0;
    for (let i = 0; i < 600; i++) { tt += STEP; c.step(STEP, tt); }
    const moved = c.x - 1000;
    run(2);
    const coast = Math.abs(cam.vx);
    run(14);
    const back = cam.vx;
    add('autoscroll', Math.abs(moved - 400) < 2 && Math.abs(c.x - c.autoX(tt)) < 1e-6 && coast < 15 && Math.abs(back - cam.drift) < 0.15 * cam.drift,
      `10 s untouched: +${moved.toFixed(1)} u (want 400); after the keys: ${coast.toFixed(1)} u/s while coasting, ${back.toFixed(1)} u/s 16 s later (drift ${cam.drift})`);
  });

  // 3. two Shift+W presses climb to space; the top of the frame is then black; two Shift+S bring it back
  safe('climb-to-space', () => {
    key('keydown', 'KeyW'); key('keyup', 'KeyW');
    run(0.5);
    key('keydown', 'KeyW'); key('keyup', 'KeyW');
    run(4.5);
    const y = cam.y, lvl = cam.level;
    scene.frame(t, { hour: 12 });
    const top = skyMean(r, 0, 0.3);
    key('keydown', 'KeyS'); key('keyup', 'KeyS'); run(0.4); key('keydown', 'KeyS'); key('keyup', 'KeyS'); run(5);
    const down = cam.y;
    scene.frame(t, { hour: 12 });
    const ground = skyMean(r, 0, 0.3);
    add('climb-to-space', lvl === 2 && Math.abs(y - LEVELS[2]) < 80 && altitudeOf(y) > 0.98 && top < 0.12 && ground > top + 0.25 && Math.abs(down) < 40,
      `after 2 presses and 5 s: level ${lvl}, y ${y.toFixed(0)} (space ${LEVELS[2]}), sky top at noon ${top.toFixed(3)} vs ${ground.toFixed(3)} at ground; two Shift+S: y ${down.toFixed(0)}`);
  });

  // 4. the same moment draws the same frame; another moment does not
  safe('deterministic', () => {
    cam.x = 1650; cam.y = 0; cam.vy = 0; cam.level = 0;
    const t0 = performance.now();
    scene.frame(37.25); sample(r);
    scene.frame(37.25); const a = sample(r);
    const ms = performance.now() - t0;
    scene.frame(81.5); const b = sample(r);
    scene.frame(37.25); const c = sample(r);
    const same = differ(a, c), moved = differ(a, b);
    const worst = Math.max(...Object.values(same)), most = Math.max(...Object.values(moved));
    add('deterministic', worst < 0.002 && most > 0.01, `t=37.25 drawn twice, mean difference: ${fmt(same)}; against t=81.5: ${fmt(moved)}; two frames ${ms.toFixed(0)} ms`);
  });

  // 5. the hour follows t (a day every ?day seconds) and noon is bright, midnight dark
  safe('day-cycle', () => {
    const h0 = hourAt(0, P), hHalf = hourAt(P.day / 2, P), hDay = hourAt(P.day, P);
    scene.frame(37.25, { hour: 12 }); const noon = skyMean(r, 0, 0.7);
    scene.frame(37.25, { hour: 0 }); const night = skyMean(r, 0, 0.7);
    scene.frame(37.25, { hour: 18.3 }); const dusk = skyMean(r, 0, 0.7);
    const ok = Math.abs(h0 - P.h) < 1e-9 && Math.abs(hHalf - ((P.h + 12) % 24)) < 1e-9 && Math.abs(hDay - P.h) < 1e-9 && noon > night + 0.25 && dusk < noon && dusk > night;
    add('day-cycle', ok, `hour at t=0 ${h0}, t=day/2 ${hHalf.toFixed(2)}, t=day ${hDay.toFixed(2)}; sky brightness noon ${noon.toFixed(3)}, dusk ${dusk.toFixed(3)}, midnight ${night.toFixed(3)}`);
  });

  // 6. the layers slide at their own speeds: a camera move of 300 u moves the city 300 k px and the mountains far less
  safe('layers-parallax', () => {
    cam.x = 1650; cam.y = 0;
    scene.frame(37.25, { hour: 12 });
    const fa = profile(r.c.far), ma = profile(r.c.main);
    cam.x = 1950;
    scene.frame(37.25, { hour: 12 });
    const fb = profile(r.c.far), mb = profile(r.c.main);
    const k = r.H / 1080;
    const want = 300 * k;
    const sf = bestShift(fa, fb, Math.round(want * 1.3)), sm = bestShift(ma, mb, Math.round(want * 1.3));
    const filled = fa.some((v) => v > 0) && ma.some((v) => v > 0);
    add('layers-parallax', filled && Math.abs(sm - want) < 0.12 * want && sf > 0.08 * want && sf < 0.45 * want,
      `camera +300 u: city layer moved ${sm} px (want ${want.toFixed(0)}), mountain layer ${sf} px (${(sf / want).toFixed(2)} of it)`);
    cam.x = 1650;
  });

  // 7. every required asset id has something to draw (its own drawing or a stand-in of its size)
  safe('standins-cover-required', () => {
    const missing = Object.keys(REQUIRED).filter((id) => !SIZES[id] && sizeOf(id)[0] === 60);
    const standing = [...misses.keys()].filter((k) => !k.includes(':'));
    add('standins-cover-required', missing.length === 0, `${Object.keys(REQUIRED).length} required ids; ${standing.length} drawn as stand-ins so far; without a size: ${missing.join(', ') || 'none'}`);
  });

  // 8. the director plans the events from (seed, slot), the same each time
  safe('events-planned', () => {
    const seen = new Map();
    // both tracks: the ground slots and the space slots (the palace attack plays only up there)
    for (let n = 0; n < 60; n++) for (const tr of ['ground', 'space']) { const ev = scene.director.plan(n, tr); if (ev) seen.set(ev.id, (seen.get(ev.id) || 0) + 1); }
    const first = scene.director.plan(7), again = scene.director.plan(7);
    const want = (P.events || EVENTS.map((e) => e.id));
    add('events-planned', want.every((id) => seen.get(id) > 0) && JSON.stringify(first) === JSON.stringify(again),
      `in the first 30 min: ${[...seen].map(([k, v]) => `${k} ${v}`).join(', ')}`);
  });

  // 9. nothing logged an error, no asset threw
  const throws = [...misses.keys()].filter((k) => k.includes(':'));
  const errs = (window.__errors || []).concat(throws);
  add('no-console-errors', errs.length === 0 && r.errors === 0, errs.length ? errs.slice(0, 3).join(' | ') : `none (renderer errors ${r.errors})`);

  // leave the page showing a frame
  cam.x = 1650; cam.y = 0;
  scene.frame(37.25);
  return { checks };
}
