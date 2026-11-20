// SISO Background: boots the scene, runs the frame loop, wires the keys, the pointer and the hint.
//
// URL: ?t= start second, ?h= start hour (17.0), ?day= seconds per day (1440), ?freeze=1 one frame at ?t= and stop,
// ?x= ?y= place the camera, ?seed=, ?auto=0 no drift, ?selftest=1 run the self-tests, ?stats=1 frame times,
// ?dpr= cap for the 2D layers (1), ?sky= most backdrop pixels (2000000), ?events=patrol,flyby only these events,
// ?zoom= how far the view is zoomed in (1.25; the self-test always uses 1).

import { Renderer } from './engine/renderer.js';
import { Camera } from './engine/camera.js';
import { Director } from './engine/director.js';
import { lightAt } from './core/light.js';
import { altitudeOf, LEVELS, setZoom, zoom } from './engine/view.js';

export const HOME_X = 1500;   // the camera starts with the SISO home bay coming into view

export function params(search = location.search) {
  const q = new URLSearchParams(search);
  const num = (k, d) => (q.has(k) && q.get(k) !== '' && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : d);
  return {
    t: num('t', 0), h: num('h', 17.0), day: Math.max(1, num('day', 1440)),
    freeze: q.get('freeze') === '1', x: q.has('x') ? num('x', null) : null, y: q.has('y') ? num('y', null) : null,
    seed: Math.trunc(num('seed', 0)), auto: q.get('auto') !== '0', selftest: q.get('selftest') === '1',
    stats: q.get('stats') === '1', dpr: num('dpr', 1), sky: num('sky', 2.0e6),
    zoom: q.get('selftest') === '1' ? 1 : num('zoom', 1.25),
    events: q.get('events') ? q.get('events').split(',') : null,
    reduced: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

export const hourAt = (t, P) => ((((P.h + (t / P.day) * 24) % 24) + 24) % 24);

// The scene: camera, director and renderer, and frame(t) that draws the moment t from wherever the camera is.
export function createScene(canvases, P, { preserve = false } = {}) {
  setZoom(P.zoom ?? 1);
  const drift = P.auto ? (P.reduced ? 20 : 40) : 0;
  const x0 = P.x !== null ? P.x - drift * P.t : HOME_X;
  const y = P.y !== null ? P.y : LEVELS[0];
  let level = 0;
  LEVELS.forEach((ly, i) => { if (Math.abs(ly - y) < Math.abs(LEVELS[level] - y)) level = i; });
  const cam = new Camera({ x0, t0: P.t, drift, level, y });
  const director = new Director({ seed: P.seed, autoX: (t) => cam.autoX(t), only: P.events });
  const renderer = new Renderer(canvases, { seed: P.seed, preserve, skyPx: P.sky, dpr: P.dpr });
  const scene = {
    P, cam, director, renderer,
    light(t, hour = hourAt(t, P)) { return lightAt(hour, { altitude: altitudeOf(cam.y) }); },
    frame(t, { hour } = {}) {
      const L = scene.light(t, hour ?? hourAt(t, P));
      return renderer.draw({ t, camX: cam.x, camY: cam.y, L, director });
    },
  };
  return scene;
}

// Keys: Shift+A / Shift+D (or the arrows) move, Shift+W / Shift+S (or up and down) change level, ? shows the hint.
const LETTERS = { KeyD: 'right', KeyA: 'left', KeyW: 'up', KeyS: 'down' };
const ARROWS = { ArrowRight: 'right', ArrowLeft: 'left', ArrowUp: 'up', ArrowDown: 'down' };
export function wireKeys(cam, { onHint = () => {} } = {}) {
  const down = (e) => {
    if (e.key === '?') { onHint(); return; }
    const k = ARROWS[e.code] || (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey ? LETTERS[e.code] : null);
    if (!k) return;
    e.preventDefault();
    if (e.repeat && cam.keys[k]) return;
    cam.press(k, true);
  };
  const up = (e) => { const k = ARROWS[e.code] || LETTERS[e.code]; if (k && cam.keys[k]) cam.press(k, false); };
  const blur = () => { for (const k of Object.keys(cam.keys)) if (cam.keys[k]) cam.press(k, false); };
  addEventListener('keydown', down);
  addEventListener('keyup', up);
  addEventListener('blur', blur);
  return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); };
}

function wirePointer(el, cam) {
  let lastT = 0;
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); lastT = e.timeStamp; cam.pointerDown(e.clientX, e.clientY); });
  el.addEventListener('pointermove', (e) => {
    if (!cam.drag) return;
    const dt = Math.max(1, e.timeStamp - lastT) / 1000; lastT = e.timeStamp;
    cam.pointerMove(e.clientX, e.clientY, (innerHeight / 1080) * zoom(), dt);
  });
  const end = () => cam.pointerUp(innerHeight);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function hint() {
  const el = document.getElementById('hint');
  if (!el) return () => {};
  let timer = 0;
  const show = () => { el.classList.add('on'); clearTimeout(timer); timer = setTimeout(() => el.classList.remove('on'), 6000); };
  return show;
}

async function boot() {
  const P = params();
  const $ = (id) => document.getElementById(id);
  const canvases = { sky: $('sky'), far: $('far'), mid: $('mid'), main: $('main'), near: $('near') };
  const scene = createScene(canvases, P, { preserve: P.freeze || P.selftest });
  const { cam, renderer } = scene;
  let still = null;   // in freeze mode, the one moment to redraw when the window changes size (a resize clears canvases)
  const fit = () => { renderer.resize(innerWidth, innerHeight); if (still !== null) scene.frame(still); };
  fit();
  addEventListener('resize', fit);
  const showHint = hint();
  wireKeys(cam, { onHint: showHint });
  wirePointer($('near'), cam);
  window.scene = scene;

  if (P.selftest) {
    const { selftest } = await import('./engine/selftest.js');
    const out = await selftest(scene);
    const pre = $('selftest') || document.body.appendChild(Object.assign(document.createElement('pre'), { id: 'selftest' }));
    pre.textContent = JSON.stringify(out);
    return;
  }
  if (P.freeze) {
    still = P.t;
    const st = scene.frame(P.t);
    const d = document.documentElement.dataset;
    d.ready = '1'; d.drawn = `${st.drawn}/${st.items}`; d.errors = String((window.__errors || []).length);
    d.size = `${innerWidth}x${innerHeight} sky ${renderer.skyW}x${renderer.skyH} css ${canvases.sky.clientWidth}x${canvases.sky.clientHeight} cam ${cam.x.toFixed(0)},${cam.y.toFixed(0)}`;
    if (window.__errors && window.__errors.length) d.error = window.__errors[0].slice(0, 300);
    return;
  }
  if (!P.selftest) requestAnimationFrame(() => showHint());

  // the loop: t from the clock, the camera stepped by the real frame time
  const stats = P.stats ? $('stats') : null;
  if (stats) stats.hidden = false;
  const start = performance.now();
  let last = start, n = 0, acc = 0, slow = 0;
  const tick = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const t = P.t + (now - start) / 1000;
    cam.step(dt, t);
    const st = scene.frame(t);
    // keep 60 fps: if frames run long for two seconds, draw the backdrop at fewer pixels, then the layers too
    acc += dt; n++;
    if (n >= 120) {
      const avg = acc / n;
      if (avg > 0.0185 && renderer.skyPx > 0.5e6) { renderer.skyPx *= 0.8; fit(); slow++; }
      else if (avg > 0.0185 && renderer.dpr > 0.75) { renderer.dpr = Math.max(0.75, renderer.dpr - 0.125); fit(); slow++; }
      if (stats) {
        const L = st.layers;
        stats.textContent = `${(1000 * avg).toFixed(1)} ms/frame  draw ${st.total.toFixed(1)}  sky ${st.sky.toFixed(1)}  far ${L.far.ms.toFixed(1)}  mid ${L.mid.ms.toFixed(1)}  main ${L.main.ms.toFixed(1)}  near ${L.near.ms.toFixed(1)}  items ${st.drawn}/${st.items}  sky ${renderer.skyW}x${renderer.skyH}${slow ? ' (cut ' + slow + ')' : ''}  x ${cam.x.toFixed(0)} y ${cam.y.toFixed(0)}`;
      }
      acc = 0; n = 0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

if (typeof document !== 'undefined' && document.getElementById('sky')) boot().catch((e) => console.error('boot: ' + (e && e.stack || e)));
