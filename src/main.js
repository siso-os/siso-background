// SISO Background: boots the scene, runs the frame loop, wires the keys, the pointer, the hint and the story bar.
//
// By default the scene plays the story (src/story/script.js): one 330 s loop the camera follows on its own, which the
// keys and the pointer can take over at any time (it eases back 15 s after the last input). ?story=0 is the open world
// with random events instead; so is any ?x=, ?y=, ?freeze=1, ?events= or ?selftest=1, unless ?story=1 says otherwise.
//
// URL: ?t= start second, ?h= start hour (17.0), ?day= seconds per day (1440), ?freeze=1 one frame at ?t= and stop,
// ?x= ?y= place the camera, ?seed=, ?auto=0 no drift, ?selftest=1 run the self-tests, ?stats=1 frame times,
// ?dpr= cap for the 2D layers (1), ?sky= most backdrop pixels (2000000), ?events=patrol,flyby only these events,
// ?zoom= how far the view is zoomed in (1.25; the self-test always uses 1), ?story=0|1, ?beat= start at a story beat,
// ?art=0 the coded art only (no painted images), ?grade=blue the earlier navy night instead of black and ember.

import { Renderer } from './engine/renderer.js';
import { Camera } from './engine/camera.js';
import { Director } from './engine/director.js';
import { StoryDirector } from './story/director.js';
import { lightAt, setGrade } from './core/light.js';
import { altitudeOf, LEVELS, setZoom, zoom } from './engine/view.js';
import { loadSprites, artReady } from './core/sprites.js';

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
    story: q.get('story') === '1' || (q.get('story') !== '0' && !['x', 'y', 'freeze', 'events', 'selftest'].some((k) => q.has(k))),
    hourSet: q.has('h'), beat: q.has('beat') ? Math.trunc(num('beat', 0)) : null,
    art: q.get('art') !== '0', grade: q.get('grade') || 'ember',
  };
}

export const hourAt = (t, P) => ((((P.h + (t / P.day) * 24) % 24) + 24) % 24);

// The scene: camera, director and renderer, and frame(t) that draws the moment t from wherever the camera is.
export function createScene(canvases, P, { preserve = false } = {}) {
  setZoom(P.zoom ?? 1);
  setGrade(P.grade);
  const story = P.story ? new StoryDirector({ seed: P.seed }) : null;
  const drift = P.auto ? (P.reduced ? 20 : 40) : 0;
  const x0 = P.x !== null ? P.x - drift * P.t : HOME_X;
  const start = story ? story.cam(P.t) : null;
  const y = story ? start.y : P.y !== null ? P.y : LEVELS[0];
  const cam = new Camera({ x0, t0: P.t, drift, level: Camera.nearest(y), y, path: story ? (t) => story.cam(t) : null });
  if (story) cam.x = start.x;
  const director = story || new Director({ seed: P.seed, autoX: (t) => cam.autoX(t), only: P.events });
  const renderer = new Renderer(canvases, { seed: P.seed, preserve, skyPx: P.sky, dpr: P.dpr });
  // the hour: the story's own (golden hour into night), unless ?h= sets the clock
  const hourOf = (t) => (story && !P.hourSet ? story.hour(t) : hourAt(t, P));
  const scene = {
    P, cam, director, renderer, story,
    hour: hourOf,
    light(t, hour = hourOf(t)) { return lightAt(hour, { altitude: altitudeOf(cam.y) }); },
    frame(t, { hour } = {}) {
      if (story && !cam.touched) { const p = story.cam(t); cam.x = p.x; cam.y = p.y; }   // a still sits on the path too
      const L = scene.light(t, hour ?? hourOf(t));
      return renderer.draw({ t, camX: cam.x, camY: cam.y, L, director });
    },
  };
  return scene;
}

// Keys: Shift+A / Shift+D (or the arrows) move, Shift+W / Shift+S (or up and down) change level, ? shows the hint.
const LETTERS = { KeyD: 'right', KeyA: 'left', KeyW: 'up', KeyS: 'down' };
const ARROWS = { ArrowRight: 'right', ArrowLeft: 'left', ArrowUp: 'up', ArrowDown: 'down' };
export function wireKeys(cam, { onHint = () => {}, onBeat = null } = {}) {
  const down = (e) => {
    if (e.key === '?') { onHint(); return; }
    if (onBeat && (e.key === '[' || e.key === ']') && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); onBeat(e.key === ']' ? 1 : -1); return; }
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

// The story bar along the bottom: one segment per beat (its width its length), the one playing filling up, the beat's
// title and line above it. Clicking a segment (or [ and ]) jumps there. It shows itself at each new beat and while the
// pointer is near the bottom, and fades out otherwise.
function storyBar(story, { jump }) {
  const el = document.getElementById('story');
  if (!el) return { update() {} };
  el.hidden = false;
  document.body.classList.add('story');
  const B = story.S.BEATS, LOOP = story.loop;
  const title = el.querySelector('.title'), line = el.querySelector('.line'), track = el.querySelector('.track');
  const segs = B.map((b, i) => {
    const end = i + 1 < B.length ? B[i + 1].at : LOOP;
    const s = document.createElement('button');
    s.type = 'button'; s.className = 'seg'; s.style.flexGrow = String(end - b.at);
    s.setAttribute('aria-label', `${i + 1}. ${b.title}`);
    s.innerHTML = '<i></i>';
    s.addEventListener('click', () => { jump(i); wake(4); });
    s.addEventListener('pointerenter', () => { hover = i; paint(); });
    s.addEventListener('pointerleave', () => { hover = -1; paint(); });
    s.addEventListener('focus', () => { hover = i; paint(); wake(4); });
    s.addEventListener('blur', () => { hover = -1; paint(); });
    track.appendChild(s);
    return s;
  });
  let cur = -1, hover = -1, until = 0, near = false;
  const wake = (sec) => { until = Math.max(until, performance.now() + sec * 1000); };
  const paint = () => {
    const b = B[hover >= 0 ? hover : Math.max(0, cur)];
    title.textContent = `${(hover >= 0 ? hover : cur) + 1}. ${b.title}`;
    line.textContent = b.line;
  };
  addEventListener('pointermove', (e) => { near = e.clientY > innerHeight - 140; if (near) wake(2.5); }, { passive: true });
  addEventListener('keydown', () => wake(3));
  return {
    update(t) {
      const bt = story.beat(t), ts = ((t % LOOP) + LOOP) % LOOP;
      if (bt.i !== cur) { cur = bt.i; segs.forEach((s, i) => s.classList.toggle('on', i === cur)); paint(); wake(5); }
      for (let i = 0; i < segs.length; i++) {
        const b = B[i], end = i + 1 < B.length ? B[i + 1].at : LOOP;
        const f = i < cur ? 1 : i > cur ? 0 : (ts - b.at) / (end - b.at);
        segs[i].firstChild.style.transform = `scaleX(${Math.max(0, Math.min(1, f)).toFixed(4)})`;
      }
      el.classList.toggle('on', near || hover >= 0 || performance.now() < until);
    },
  };
}

async function boot() {
  const P = params();
  // the painted art (img/, built by tools/art.py): read its index first; images then load as they are wanted
  if (P.art && !P.selftest) await loadSprites('img/');
  const $ = (id) => document.getElementById(id);
  const canvases = { sky: $('sky'), far: $('far'), mid: $('mid'), main: $('main'), near: $('near') };
  const scene = createScene(canvases, P, { preserve: P.freeze || P.selftest });
  const { cam, renderer } = scene;
  let still = null;   // in freeze mode, the one moment to redraw when the window changes size (a resize clears canvases)
  const fit = () => { renderer.resize(innerWidth, innerHeight); if (still !== null) scene.frame(still); };
  fit();
  addEventListener('resize', fit);
  const showHint = hint();
  // the clock: t = P.t + shift + seconds since start; jumping to a story beat moves shift
  const start = performance.now();
  let shift = 0;
  const clock = (now = performance.now()) => P.t + shift + (now - start) / 1000;
  const story = scene.story;
  const jumpTo = (i) => {
    const t = clock(), L = story.loop, k = Math.floor(t / L);
    const B = story.S.BEATS, n = ((i % B.length) + B.length) % B.length;
    shift += k * L + B[n].at + 0.01 - t;
    cam.idle = Infinity; cam.vx = 0; cam.vy = 0;          // back onto the story's path
  };
  const step = (d) => { const b = story.beat(clock()); jumpTo(b.i + d); };
  if (story && P.beat !== null) jumpTo(P.beat);
  wireKeys(cam, { onHint: showHint, onBeat: story ? step : null });
  wirePointer($('near'), cam);
  const bar = story && !P.freeze && !P.selftest ? storyBar(story, { jump: jumpTo }) : null;
  const fade = story ? $('fade') : null;
  window.scene = scene;
  scene.clock = clock; scene.jump = jumpTo; scene.artReady = artReady;

  if (P.selftest) {
    const { selftest } = await import('./engine/selftest.js');
    const out = await selftest(scene);
    const pre = $('selftest') || document.body.appendChild(Object.assign(document.createElement('pre'), { id: 'selftest' }));
    pre.textContent = JSON.stringify(out);
    return;
  }
  if (P.freeze) {
    still = clock(start);
    scene.frame(still);
    await artReady();     // a still waits for its painted images, then draws again
    const st = scene.frame(still);
    if (fade) fade.style.opacity = story.fade(still).toFixed(3);
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
  let last = start, n = 0, acc = 0, slow = 0;
  const tick = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const t = clock(now);
    cam.step(dt, t);
    const st = scene.frame(t);
    if (fade) { const f = story.fade(t); fade.style.opacity = f > 0.002 ? f.toFixed(3) : '0'; }
    if (bar) bar.update(t);
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
