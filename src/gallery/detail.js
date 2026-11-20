// The open item, in the kit's drawer (<dialog class="k-drawer">, so Escape and focus work natively): for an asset a
// large live preview with its controls (state, hour, play and scrub for once states, variant, backdrop) and its facts
// beside it (file path with copy, size, states, the painting it is matched to); for an image the picture large with its
// path, prompt and light. Every control redraws at once, so what it shows can be read straight back.

import { drawScene, restFrame, sizeCanvas } from './draw.js';

const $ = (s) => document.querySelector(s);
const icon = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const PICKS = [['Dawn', 6], ['Day', 12], ['Dusk', 17.8], ['Night', 22]];
export const hhmm = (x) => { const m = Math.round(((x % 24) + 24) % 24 * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const kb = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

// D: what the drawer shows now. Read by the self-test.
export const D = { item: null, a: null, state: '', hour: 17.8, seed: 0, back: 'sky', p: 0, playing: false, playFrom: 0, start: 0, raf: 0 };
let ctx = null; // { G, go }
let closeFns = [];
const dlg = () => $('#g-detail');
const stage = () => $('#d-canvas');

export const isOpen = () => !!dlg()?.open;
export const onClose = (fn) => closeFns.push(fn);

export function init(c) {
  ctx = c;
  const d = dlg();
  d.addEventListener('close', () => { stop(); D.item = null; delete d.dataset.open; for (const f of closeFns) f(); });
  $('#d-ctls').addEventListener('k-seg', (e) => {
    const id = e.target.id, v = e.detail.value;
    if (id === 'c-state') setState(v);
    else if (id === 'c-pick') setHour(Number(v));
    else if (id === 'c-back') { D.back = v; render(); }
  });
  $('#d-ctls').addEventListener('input', (e) => {
    if (e.target.id === 'c-hour') setHour(Number(e.target.value));
    else if (e.target.id === 'c-p') { D.playing = false; D.p = Number(e.target.value); syncPlay(); render(); }
  });
  $('#d-ctls').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'c-play') play();
    else if (b.id === 'c-prev' || b.id === 'c-next') setSeed(D.seed + (b.id === 'c-next' ? 1 : -1));
  });
  $('#d-copy').addEventListener('click', () => copy($('#d-copy'), $('#d-path').textContent));
  $('#d-link').addEventListener('click', () => copy($('#d-link'), location.href));
  new ResizeObserver(() => { if (D.a && sizeCanvas(stage(), 2)) render(); }).observe(stage());
}

function copy(btn, text) {
  const done = (ok) => {
    btn.dataset.copied = ok ? '1' : '0';
    const use = btn.querySelector('use');
    if (use) use.setAttribute('href', ok ? '#i-check' : '#i-copy');
    const span = btn.querySelector('span'); const was = span?.textContent;
    if (span && ok) span.textContent = 'Copied';
    setTimeout(() => { if (use) use.setAttribute('href', '#i-copy'); if (span && was) span.textContent = was; delete btn.dataset.copied; }, 1400);
  };
  try { navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); } catch { done(false); }
}

// ---------- open and close ----------
export function open(item) {
  const d = dlg();
  if (D.item === item && d.open) return;
  stop();
  D.item = item;
  d.dataset.open = item.kind;
  d.dataset.key = item.key; // never data-asset: only grid tiles carry that
  $('#d-title').textContent = item.title;
  $('#d-id').textContent = item.kind === 'asset' ? item.a.id : item.path.split('/').pop();
  $('#d-path').textContent = item.path;
  if (item.kind === 'asset') openAsset(item); else openImage(item);
  if (!d.open) d.showModal();
  $('#d-body').scrollTop = 0;
  if (item.kind === 'asset') { sizeCanvas(stage(), 2); render(); loop(); }
}
export function close() { const d = dlg(); if (d?.open) d.close(); }

function factsHtml(rows) {
  return rows.filter(Boolean).map(([k, v, cls]) => `<dt>${esc(k)}</dt><dd${cls ? ` class="${cls}"` : ''}>${v}</dd>`).join('');
}

function refFigure(path) {
  const fig = $('#d-ref');
  if (!path) { fig.hidden = true; return; }
  const known = ctx.G.items.has(path);
  $('#d-ref-img').src = path;
  $('#d-ref-img').alt = `The painting this asset is matched to: ${path}`;
  $('#d-ref-link').href = known ? '#' + path : path;
  $('#d-ref-path').textContent = path;
  $('#d-ref-path').href = known ? '#' + path : path;
  const im = known ? ctx.G.items.get(path).im : null;
  const pic = $('#d-ref-link');
  if (im && im.light) pic.dataset.light = im.light.split(' ')[0]; else delete pic.dataset.light;
  pic.dataset.fit = im && im.fit === 'cover' ? 'cover' : 'contain';
  fig.hidden = false;
}

function openAsset(item) {
  const a = item.a, G = ctx.G;
  D.a = a; D.seed = 0; D.back = 'sky'; D.hour = a.sky ? a.sky.h : 17.8; D.p = 0; D.playing = false;
  D.state = a.states[0];
  const once = a.once || {};
  $('#d-img').hidden = true; $('#d-img').removeAttribute('src');
  stage().hidden = false;
  $('#d-stage').dataset.kind = 'asset';
  $('#d-stage').style.removeProperty('--ar');
  $('#d-about').textContent = a.about || '';
  const fam = G.families.find((f) => f.id === a.family);
  const states = a.states.map((s) => (once[s] ? `${esc(s)} <span class="k-muted">(once, ${once[s]} s)</span>` : esc(s))).join(', ');
  $('#d-facts').innerHTML = factsHtml([
    ['Id', `<code>${esc(a.id)}</code>`],
    ['Family', esc(fam ? fam.title : a.family === 'fixture' ? 'Samples' : a.family)],
    ['Size', `${a.w} × ${a.h} units`],
    ['States', states, 'g-wrap'],
    ['Loop', a.loop ? `${a.loop} s` : 'still'],
    ['Variants', String(a.variants || 1)],
    a.free ? ['Free-form', 'yes: draws along its own points'] : null,
  ]);
  refFigure(a.ref);
  $('#d-prompt').hidden = true;
  const probe = $('#d-probe');
  const canProbe = a.family !== 'fixture' && !a.sky;
  probe.hidden = !canProbe;
  if (canProbe) probe.href = `tools/probe.html?asset=${encodeURIComponent(a.id)}&mode=grid${a.ref ? `&ref=${encodeURIComponent(a.ref)}` : ''}`;
  const n = a.variants || 1;
  const hasOnce = a.states.some((s) => once[s]);
  $('#d-ctls').innerHTML = `
    <div class="g-ctl g-ctl-state">
      <span class="k-label" id="l-state">State</span>
      <div class="k-seg g-seg-wrap" role="group" aria-labelledby="l-state" id="c-state">${a.states.map((s, i) =>
        `<button type="button" data-value="${esc(s)}" aria-pressed="${i === 0}"${once[s] ? ` title="Plays once over ${once[s]} s"` : ''}>${once[s] ? icon('play') : ''}${esc(s)}</button>`).join('')}</div>
    </div>
    ${hasOnce ? `<div class="g-ctl g-ctl-play" id="c-playrow" hidden>
      <span class="k-label" id="l-p">Progress</span>
      <div class="g-row"><button class="k-btn" data-kind="primary" data-size="s" type="button" id="c-play">${icon('play')}<span>Play</span></button>
      <input class="g-range" type="range" id="c-p" min="0" max="1" step="0.01" value="0" aria-labelledby="l-p"><output id="c-p-out" class="g-out">0%</output></div>
    </div>` : ''}
    <div class="g-ctl g-ctl-hour">
      <span class="k-label" id="l-hour">Hour</span>
      <div class="g-row"><input class="g-range" type="range" id="c-hour" min="0" max="24" step="0.1" value="${D.hour}" aria-labelledby="l-hour"><output id="c-hour-out" class="g-out">${hhmm(D.hour)}</output></div>
      <div class="k-seg" role="group" aria-label="Quick hours" id="c-pick">${PICKS.map(([k, v]) => `<button type="button" data-value="${v}" aria-pressed="${Math.abs(v - D.hour) < 0.05}">${k}</button>`).join('')}</div>
    </div>
    <div class="g-ctl-pair">
      ${n > 1 ? `<div class="g-ctl"><span class="k-label">Variant</span>
        <div class="g-step"><button class="k-icon-btn" type="button" id="c-prev" aria-label="Previous variant">${icon('chevron-left')}</button><output id="c-seed" class="g-out">1 of ${n}</output><button class="k-icon-btn" type="button" id="c-next" aria-label="Next variant">${icon('chevron-right')}</button></div></div>` : ''}
      <div class="g-ctl"><span class="k-label" id="l-back">Backdrop</span>
        <div class="k-seg" role="group" aria-labelledby="l-back" id="c-back"><button type="button" data-value="sky" aria-pressed="true">Sky</button><button type="button" data-value="grey" aria-pressed="false">Grey</button><button type="button" data-value="black" aria-pressed="false">Black</button></div></div>
    </div>`;
  $('#d-ctls').hidden = false;
  // a once-only default state starts paused most of the way through, like its tile
  if (once[D.state]) { D.p = restFrame(a).p; document.getElementById('c-playrow').hidden = false; syncPlay(); }
}

function openImage(item) {
  const im = item.im, G = ctx.G;
  D.a = null;
  stage().hidden = true;
  const img = $('#d-img');
  img.hidden = false; img.src = im.path; img.alt = im.what || im.title;
  $('#d-stage').dataset.kind = 'image';
  // the stage takes the picture's own shape (kept between portrait and wide), so a small cut-out is not lost in a tall box
  $('#d-stage').style.setProperty('--ar', im.w && im.h ? String(Math.min(2.4, Math.max(0.8, im.w / im.h))) : '1.6');
  $('#d-stage').dataset.fit = im.fit || 'contain';
  $('#d-stage').dataset.light = (im.light || '').split(' ')[0];
  $('#d-about').textContent = im.what || '';
  const matched = [...G.items.values()].filter((x) => x.kind === 'asset' && x.a.ref === im.path);
  $('#d-facts').innerHTML = factsHtml([
    ['Folder', esc(im.subTitle)],
    im.light ? ['Light', esc(im.light)] : null,
    im.place ? ['City or place', esc(im.place), 'g-wrap'] : null,
    im.w ? ['Pixels', `${im.w} × ${im.h}`] : null,
    im.bytes ? ['File size', kb(im.bytes)] : null,
    im.license ? ['Licence', esc(im.license), 'g-wrap'] : null,
    ['Matched by', matched.length ? matched.map((x) => `<a class="k-link" href="#${esc(x.key)}">${esc(x.title)}</a>`).join(', ') : '<span class="k-muted">no asset yet</span>', 'g-wrap'],
  ]);
  $('#d-ref').hidden = true;
  $('#d-probe').hidden = true;
  const pr = $('#d-prompt');
  if (im.prompt) {
    pr.innerHTML = `<p class="k-label">Prompt${im.promptFrom ? `, from <code>${esc(im.promptFrom)}</code>` : ''}</p><p class="g-prompt-text">${esc(im.prompt)}</p>`;
    pr.hidden = false;
  } else pr.hidden = true;
  $('#d-ctls').innerHTML = ''; $('#d-ctls').hidden = true;
}

// ---------- controls ----------
function press(id, value) {
  const seg = document.getElementById(id);
  if (!seg) return;
  for (const b of seg.children) b.setAttribute('aria-pressed', String(String(b.dataset.value) === String(value)));
}

export function setState(s) {
  const a = D.a; if (!a || !a.states.includes(s)) return;
  D.state = s;
  press('c-state', s);
  const once = a.once && a.once[s];
  const row = document.getElementById('c-playrow');
  if (row) row.hidden = !once;
  D.p = 0; D.playing = false;
  if (once) play();
  render();
}

export function setHour(x) {
  D.hour = clamp(Number(x) || 0, 0, 24);
  const r = document.getElementById('c-hour'); if (r && Number(r.value) !== D.hour) r.value = String(D.hour);
  const o = document.getElementById('c-hour-out'); if (o) o.textContent = hhmm(D.hour);
  const hit = PICKS.find(([, v]) => Math.abs(v - D.hour) < 0.05);
  press('c-pick', hit ? hit[1] : NaN);
  render();
}

function setSeed(n) {
  const v = D.a?.variants || 1;
  D.seed = ((n % v) + v) % v;
  const o = document.getElementById('c-seed'); if (o) o.textContent = `${D.seed + 1} of ${v}`;
  render();
}

function play() {
  const once = D.a?.once?.[D.state];
  if (!once) return;
  if (D.playing) { D.playing = false; syncPlay(); return; }
  if (D.p >= 1) D.p = 0;
  D.playing = true;
  D.playFrom = performance.now() - D.p * once * 1000;
  syncPlay();
  loop();
}

function syncPlay() {
  const b = document.getElementById('c-play'); if (!b) return;
  const label = D.playing ? 'Pause' : D.p >= 1 ? 'Replay' : 'Play';
  b.querySelector('span').textContent = label;
  b.querySelector('use').setAttribute('href', D.playing ? '#i-pause' : D.p >= 1 ? '#i-rotate-cw' : '#i-play');
  const r = document.getElementById('c-p'); if (r) r.value = String(D.p);
  const o = document.getElementById('c-p-out'); if (o) o.textContent = `${Math.round(D.p * 100)}%`;
}

// ---------- drawing ----------
export function frame(now = performance.now()) {
  const a = D.a;
  const once = a.once && a.once[D.state];
  if (once && D.playing) {
    D.p = clamp((now - D.playFrom) / (once * 1000));
    if (D.p >= 1) D.playing = false;
    syncPlay();
  }
  const el = (now - D.start) / 1000;
  const t = ctx.G.reduced ? restFrame(a, D.state).t : once ? el % Math.max(1, once) : a.loop > 0 ? el % a.loop : 0;
  return { t, p: D.p };
}

export function render(now) {
  if (!D.a) return false;
  const c = stage();
  if (!c.width || c.width < 4) sizeCanvas(c, 2);
  const { t, p } = frame(now);
  return drawScene(c, D.a, { hour: D.hour, state: D.state, seed: D.seed, back: D.back, t, p, sky: ctx.G.sky });
}

function loop() {
  if (D.raf || !D.a) return;
  if (!D.start) D.start = performance.now();
  if (ctx.G.reduced && !D.playing) return;
  const step = (now) => {
    D.raf = 0;
    if (!D.a || !dlg().open) return;
    render(now);
    if (!ctx.G.reduced || D.playing) D.raf = requestAnimationFrame(step);
  };
  D.raf = requestAnimationFrame(step);
}
function stop() { if (D.raf) cancelAnimationFrame(D.raf); D.raf = 0; D.start = performance.now(); }
