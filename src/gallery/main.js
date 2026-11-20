// The asset page: every asset in src/assets/registry.js drawn live, every image in art/ and refs/ (from catalog.json,
// written by tools/index.mjs), grouped by family, found as you type, opened in place with its controls and its file.
// Views: #in=all (one shelf per family), #in=<family|art|refs|fixture> (that family's full grid).
// Items: #<asset id> or #<image path> opens it. ?fixture=1 adds the sample assets, ?selftest=1 runs the page's tests.

import { drawScene, restFrame, sizeCanvas } from './draw.js';
import * as detail from './detail.js';

const q = new URLSearchParams(location.search);
const FIXTURE = q.get('fixture') === '1';
const SELFTEST = q.get('selftest') === '1';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICON = {
  fixture: 'sliders-horizontal', sky: 'sun', nature: 'globe', islands: 'circle', city: 'columns-3', sea: 'activity',
  air: 'arrow-up-right', defence: 'target', fx: 'sparkles', space: 'moon', aliens: 'bot', art: 'folder', refs: 'book-open',
};
const $ = (s, r = document) => r.querySelector(s);
const icon = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
  for (const k of kids) if (k !== null && k !== undefined) e.append(k);
  return e;
}
// an id or file name that may break only after a dot or an underscore (hyphens break by themselves), never mid-word
function brk(s) { const f = document.createDocumentFragment(); for (const part of String(s).split(/(?<=[._])/)) { if (f.childNodes.length) f.append(document.createElement('wbr')); f.append(part); } return f; }
const svg = (n) => { const t = document.createElement('template'); t.innerHTML = icon(n); return t.content.firstChild; };

export const G = {
  fixture: FIXTURE, selftest: SELFTEST, reduced: REDUCED,
  items: new Map(), // key (asset id or image path) -> item
  sections: [], // { id, title, el, items, ... }
  tiles: [], // { el, item, canvas, visible, dirty }
  view: 'all', gridHour: 17.8, catalog: null, families: [], required: {}, sky: null, notes: [],
};

// ---------- load ----------
async function load() {
  const [reg, catalog, required, fixture] = await Promise.all([
    import('../assets/registry.js').catch((e) => { console.error('registry did not load:', e.message); G.notes.push(`The registry did not load (${e.message}), so no asset in code is shown.`); return { FAMILIES: [], ASSETS: [] }; }),
    fetch(new URL('./catalog.json', import.meta.url)).then((r) => r.json()).catch((e) => { console.error('catalog.json did not load:', e.message); return { images: [], families: {}, backdrop: false }; }),
    import('../assets/required.js').then((m) => m.REQUIRED).catch(() => ({})),
    FIXTURE ? import('./fixture.js') : null,
  ]);
  G.catalog = catalog; G.required = required;
  G.families = reg.FAMILIES || [];
  let sky = [];
  if (catalog.backdrop) { // only asked for once tools/index.mjs has seen src/engine/backdrop.js, so it never 404s
    try {
      const m = await import('../engine/backdrop.js');
      const shared = document.createElement('canvas');
      G.sky = (canvas, a, hour, t) => {
        shared.width = canvas.width; shared.height = canvas.height;
        m.renderBackdrop(shared, { ...a.sky, h: hour, altitude: a.sky.altitude ?? 0, t, x: a.sky.x ?? 0 });
        const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height); c.drawImage(shared, 0, 0);
      };
      sky = (m.SKY_ENTRIES || []).map((e, i) => ({
        id: e.id || `sky.${e.name || i}`, family: 'sky', title: e.title || e.name || e.id || `Sky ${i + 1}`,
        about: e.about || 'A backdrop entry painted by the engine\'s shader.', w: 1920, h: 1080, states: ['idle'],
        loop: e.loop ?? 20, once: {}, variants: 1, ref: e.ref ?? null, sky: e, file: 'src/engine/backdrop.js', draw() {},
      }));
    } catch (e) { G.notes.push(`src/engine/backdrop.js did not load (${e.message}); the sky family is hidden.`); }
  }
  const fileOf = (a) => a.file || (a.family === 'fixture' ? 'src/gallery/fixture.js' : `src/assets/${a.family}/${String(a.id).split('.').slice(1).join('.')}.js`);
  const asItem = (a) => ({ key: a.id, kind: 'asset', a, title: a.title || a.id, path: fileOf(a), section: a.family });
  const assets = [...(fixture ? fixture.default : []), ...sky, ...(reg.ASSETS || [])].map(asItem);
  const images = (catalog.images || []).map((im) => ({ key: im.path, kind: 'image', im, title: im.title, path: im.path, section: im.group }));
  for (const it of [...assets, ...images]) G.items.set(it.key, it);
  return { assets, images };
}

// ---------- build ----------
function sectionsFor({ assets, images }) {
  const fam = G.catalog.families || {};
  const list = [];
  if (FIXTURE) list.push({ id: 'fixture', title: 'Samples', what: 'Three sample assets the page is built and tested against; shown only with ?fixture=1.', folder: 'src/gallery/fixture.js' });
  for (const f of G.families) list.push({ id: f.id, title: f.title, what: fam[f.id]?.what || '', owner: fam[f.id]?.owner, folder: f.id === 'sky' ? 'src/engine/backdrop.js' : `src/assets/${f.id}/` });
  list.push({ id: 'art', title: 'Photo art', what: 'The earlier scene\'s photo cut-outs, city plates, marina buildings and dust, kept as references.', folder: 'art/isles/' });
  list.push({ id: 'refs', title: 'References', what: 'The paintings every asset is matched to, from refs/manifest.json.', folder: 'refs/' });
  const known = new Set(list.map((s) => s.id));
  for (const it of assets) if (!known.has(it.section)) { known.add(it.section); list.splice(list.length - 2, 0, { id: it.section, title: it.section, what: 'Not a family CONTRACT.md knows.', folder: `src/assets/${it.section}/` }); }
  for (const s of list) {
    s.items = [...assets, ...images].filter((it) => it.section === s.id);
    s.wanted = Object.entries(G.required).filter(([id]) => id.startsWith(s.id + '.') && !G.items.has(id)).map(([id, states]) => ({ id, states }));
  }
  return list;
}

function assetTile(it) {
  const a = it.a;
  const states = Array.isArray(a.states) ? a.states : [];
  const find = [a.id, a.title, a.family, it.path, a.about, states.join(' ')].join(' ').toLowerCase();
  const canvas = h('canvas', { 'aria-hidden': 'true' });
  const pic = h('span', { class: 'g-pic', 'data-back': 'sky' }, canvas);
  if (states.length > 1) pic.append(h('span', { class: 'g-badge' }, `${states.length} states`));
  const el = h('button', { class: 'g-tile', type: 'button', 'data-asset': a.id, 'data-find-row': true, 'data-find': find, 'aria-label': `${it.title}, ${a.id}` },
    pic, h('span', { class: 'g-cap' }, h('b', {}, it.title), h('code', {}, brk(a.id))));
  return { el, item: it, canvas, visible: false, dirty: true, anim: 0 };
}

function imageTile(it, i = 0) {
  const im = it.im;
  const find = [im.path, im.title, im.what, im.light, im.place, im.subTitle, im.kind].filter(Boolean).join(' ').toLowerCase();
  const img = h('img', { src: im.path, alt: '', loading: i < 8 ? 'eager' : 'lazy', decoding: 'async', width: im.w || null, height: im.h || null });
  const el = h('button', { class: 'g-tile', type: 'button', 'data-image': im.path, 'data-kind': im.kind, 'data-find-row': true, 'data-find': find, 'aria-label': `${im.title}, ${im.path}` },
    h('span', { class: 'g-pic', 'data-fit': im.fit || 'contain', 'data-light': (im.light || '').split(' ')[0] || null }, img),
    h('span', { class: 'g-cap' }, h('b', {}, im.title), h('code', {}, brk(im.path.split('/').pop()))));
  return { el, item: it, img, visible: false };
}

function buildSection(s) {
  const n = s.items.length;
  const head = h('header', { class: 'g-sec-head' },
    h('div', { class: 'g-sec-title' }, svg(ICON[s.id] || 'circle'), h('h2', { id: `h-${s.id}` }, s.title), h('span', { class: 'k-count' }, String(n))),
    s.what ? h('p', {}, s.what) : null,
    h('div', { class: 'g-sec-tools' }, h('code', { class: 'g-folder' }, s.folder),
      n ? h('a', { class: 'k-btn', 'data-kind': 'ghost', 'data-size': 's', href: `#in=${s.id}`, 'data-more': true }, `See all ${n}`, svg('chevron-right')) : null));
  const grid = h('div', { class: 'g-grid' });
  let sub = null;
  for (const it of s.items) {
    if (it.kind === 'image' && it.im.sub !== sub) {
      sub = it.im.sub;
      const count = s.items.filter((x) => x.kind === 'image' && x.im.sub === sub).length;
      const dir = it.im.path.split('/').slice(0, -1).join('/') + '/';
      grid.append(h('h3', { class: 'g-sub', 'data-sub': sub }, h('span', {}, it.im.subTitle), h('code', {}, dir), h('span', { class: 'k-count' }, String(count))));
    }
    const t = it.kind === 'asset' ? assetTile(it) : imageTile(it, s.items.indexOf(it));
    t.el.addEventListener('click', () => go(it.key));
    if (t.canvas) {
      const on = () => animate(t, true), off = () => animate(t, false);
      t.el.addEventListener('pointerenter', on); t.el.addEventListener('pointerleave', off);
      t.el.addEventListener('focus', on); t.el.addEventListener('blur', off);
    }
    G.tiles.push(t);
    grid.append(t.el);
  }
  const wanted = s.wanted.length ? h('div', { class: 'g-wanted' },
    h('p', { class: 'k-label' }, n ? `Still to draw here (${s.wanted.length})` : `To draw (${s.wanted.length}), from CONTRACT.md §6`),
    h('ul', {}, ...s.wanted.map((w) => h('li', {}, h('code', { class: 'g-wid' }, w.id), h('span', {}, w.states.length ? w.states.join(' · ') : 'any states'), h('code', { class: 'g-wpath' }, `${s.folder}${w.id.split('.')[1]}.js`))))) : null;
  const empty = !n && !wanted ? h('p', { class: 'k-empty' }, svg(s.id === 'sky' ? 'clock' : 'circle'), s.id === 'sky' ? 'The sky comes from the engine: it shows here once src/engine/backdrop.js lands.' : 'Nothing in this family yet.') : null;
  s.el = h('section', { class: 'g-sec', 'data-sec': s.id, 'aria-labelledby': `h-${s.id}` }, head, n ? grid : null, wanted, empty);
  s.grid = n ? grid : null;
  return s.el;
}

function buildTodo(sections) {
  const empty = sections.filter((s) => !s.items.length && s.id !== 'art' && s.id !== 'refs');
  if (!empty.length) return null;
  // one kit list, a row a family (rule 8: a list beats a pile of word-only cards)
  const rows = empty.map((s) => h('a', { class: 'k-row g-todo-row', href: `#in=${s.id}` },
    h('span', { class: 'k-row-main' }, svg(ICON[s.id] || 'circle'),
      h('span', { class: 'k-row-text' }, h('b', {}, s.title),
        h('span', { 'data-wrap': true }, s.id === 'sky' ? 'Comes with the engine' : s.wanted.length ? `${s.wanted.length} ids to draw` : 'None asked for yet'))),
    h('code', { class: 'k-cell-end g-todo-dir' }, s.folder)));
  return h('section', { class: 'g-sec g-todo', 'data-sec': 'todo', 'aria-labelledby': 'h-todo' },
    h('header', { class: 'g-sec-head' },
      h('div', { class: 'g-sec-title' }, svg('clock'), h('h2', { id: 'h-todo' }, 'Still to draw'), h('span', { class: 'k-count' }, String(empty.length))),
      h('p', {}, 'Families with nothing drawn on this branch yet. Each one shows here the moment its files land in src/assets.')),
    h('div', { class: 'k-list g-todo-list' }, ...rows));
}

function buildNav() {
  const all = $('#g-nav [data-view="all"]');
  const label = $('#g-nav .k-nav-label:nth-of-type(2)');
  const rows = G.sections.filter((s) => s.id !== 'art' && s.id !== 'refs').map((s) =>
    h('a', { class: 'k-nav-row', href: `#in=${s.id}`, 'data-view': s.id }, svg(ICON[s.id] || 'circle'), h('span', {}, s.title), h('span', { class: 'k-count' }, String(s.items.length))));
  all.after(...rows);
  all.append(h('span', { class: 'k-count' }, String(G.items.size)));
  for (const id of ['art', 'refs']) {
    const s = G.sections.find((x) => x.id === id);
    $(`#g-nav [data-view="${id}"]`).append(h('span', { class: 'k-count' }, String(s.items.length)));
  }
  void label;
}

// ---------- tiles: drawn when on screen, animated while hovered or focused ----------
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const t = byEl.get(e.target);
    if (!t) continue;
    t.visible = e.isIntersecting;
    if (t.visible && t.dirty) paint(t);
  }
}, { rootMargin: '100px 0px' });
const ro = new ResizeObserver((entries) => {
  for (const e of entries) { const t = byEl.get(e.target); if (t && t.canvas) { t.dirty = true; if (t.visible) paint(t); } }
});
const byEl = new Map();

export function paint(t, extra = {}) {
  if (!t.canvas) return false;
  sizeCanvas(t.canvas, 2);
  const a = t.item.a, rest = restFrame(a);
  // a sky entry is its own hour (dawn, day, dusk, night); the grid's hour lights the drawn assets
  const ok = drawScene(t.canvas, a, { hour: a.sky ? a.sky.h : G.gridHour, state: a.states[0], seed: 0, back: 'sky', sky: G.sky, ...rest, ...extra });
  t.dirty = false;
  t.canvas.dataset.painted = String(G.gridHour);
  return ok;
}

function animate(t, on) {
  if (!on || REDUCED) { if (t.anim) { cancelAnimationFrame(t.anim); t.anim = 0; paint(t); } return; }
  if (t.anim) return;
  const a = t.item.a, rest = restFrame(a), start = performance.now();
  const once = a.once && a.once[a.states[0]];
  const step = (now) => {
    const el = (now - start) / 1000;
    const p = once ? Math.min(1, (el % (once + 0.8)) / once) : 0;
    const tt = once ? el : a.loop > 0 ? (rest.t + el) % a.loop : rest.t;
    sizeCanvas(t.canvas, 2);
    drawScene(t.canvas, a, { hour: a.sky ? a.sky.h : G.gridHour, state: a.states[0], seed: 0, t: tt, p, sky: G.sky });
    t.anim = requestAnimationFrame(step);
  };
  t.anim = requestAnimationFrame(step);
}

// Which tiles are on screen now, measured directly: the observer above only reports after a frame, and the first screen
// should not wait for one. Also clips to a shelf's own scroll box, so tiles past its right edge stay undrawn.
export function measure() {
  const vh = innerHeight, vw = innerWidth;
  for (const t of G.tiles) {
    let vis = !(t.el.hidden || t.el.closest('[hidden]'));
    if (vis) {
      const r = t.el.getBoundingClientRect(), g = t.el.parentElement.getBoundingClientRect();
      vis = r.width > 0 && r.bottom > -100 && r.top < vh + 100 && r.right > Math.max(0, g.left) && r.left < Math.min(vw, g.right);
    }
    t.visible = vis;
    if (vis && t.canvas && t.dirty) paint(t);
  }
}

export function relightGrid(hour) {
  G.gridHour = hour;
  for (const t of G.tiles) if (t.canvas) { t.dirty = true; if (t.visible) paint(t); }
}

// ---------- views and find ----------
const input = () => $('#g-q');
export function applyView() {
  const groups = $('#g-groups');
  const query = input().value.trim().toLowerCase();
  const mode = G.view === 'all' && !query ? 'shelf' : 'grid';
  groups.dataset.mode = mode;
  groups.dataset.view = G.view;
  let shown = 0;
  for (const s of G.sections) {
    const inView = G.view === 'all' ? s.items.length > 0 : s.id === G.view;
    const hits = s.items.length ? [...s.el.querySelectorAll('[data-find-row]')].filter((r) => !r.hidden).length : 0;
    s.el.hidden = !inView || (query && !hits);
    if (!s.el.hidden) shown += hits;
    for (const sub of s.el.querySelectorAll('.g-sub')) {
      let n = 0, x = sub.nextElementSibling;
      while (x && !x.classList.contains('g-sub')) { if (!x.hidden) n++; x = x.nextElementSibling; }
      sub.hidden = mode === 'shelf' || !n;
    }
    const w = s.el.querySelector('.g-wanted');
    if (w) w.hidden = mode === 'shelf' || !!query;
  }
  const todo = $('[data-sec="todo"]');
  if (todo) todo.hidden = G.view !== 'all' || !!query;
  const none = $('#g-none');
  const sec = G.sections.find((s) => s.id === G.view);
  none.hidden = !query || shown > 0;
  if (!none.hidden) {
    none.replaceChildren(svg('search'), `Nothing ${G.view === 'all' ? '' : `in ${sec ? sec.title : G.view} `}matches “${input().value.trim()}”.`);
    if (G.view !== 'all') none.append(' ', h('a', { href: '#in=all' }, 'Look everywhere'));
  }
  for (const a of document.querySelectorAll('[data-view]')) {
    if (a.dataset.view === G.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  $('#g-crumb').textContent = G.view === 'all' ? 'Assets' : (sec ? sec.title : G.view);
  document.title = `SISO Background · ${G.view === 'all' ? 'Assets' : sec ? sec.title : G.view}`;
  measure(); // tiles that just came into view draw now, not a frame later
  return { mode, shown };
}

function setView(v) {
  const ok = v === 'all' || G.sections.some((s) => s.id === v);
  const next = ok ? v : 'all';
  if (next !== G.view) { G.view = next; applyView(); scrollTo({ top: 0 }); } else applyView();
}

// ---------- routing: #in=<view> picks a view, #<id or path> opens an item ----------
const keyOf = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch { return location.hash.slice(1); } };
export function route() {
  const key = keyOf();
  if (key.startsWith('in=')) { detail.close(); setView(key.slice(3)); return; }
  const it = G.items.get(key);
  if (it) { detail.open(it); return; }
  if (key === '' ) { detail.close(); setView('all'); }
}
export function go(key) {
  const isView = key.startsWith('in=');
  if (!isView && detail.isOpen()) history.replaceState(history.state, '', '#' + key); // one history step per open drawer
  else history.pushState({ g: isView ? 'view' : 'open' }, '', '#' + key);
  route();
}

function wire() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const key = decodeURIComponent(a.getAttribute('href').slice(1));
    if (key.startsWith('in=') || G.items.has(key)) { e.preventDefault(); go(key); }
  });
  addEventListener('popstate', route);
  addEventListener('hashchange', route);
  input().addEventListener('input', () => { applyView(); }); // after the kit's finder has hidden the rows
  input().addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input().value) { input().value = ''; input().dispatchEvent(new Event('input', { bubbles: true })); }
    if (e.key === 'Enter') { const first = G.tiles.find((t) => !t.el.hidden && !t.el.closest('[hidden]')); first?.el.click(); }
  });
  $('#g-light').addEventListener('k-seg', (e) => relightGrid(Number(e.detail.value)));
  detail.onClose(() => { // closed by the user (Escape, the close button, the backdrop): leave the URL on the view
    if (!G.items.has(keyOf())) return; // closed by route(): the URL already moved
    if (history.state && history.state.g === 'open') history.back();
    else history.replaceState(null, '', '#in=' + G.view);
  });
}

// ---------- start ----------
async function start() {
  const data = await load();
  G.sections = sectionsFor(data);
  const groups = $('#g-groups');
  $('#g-loading')?.remove();
  for (const s of G.sections) groups.append(buildSection(s));
  const todo = buildTodo(G.sections);
  if (todo) groups.append(todo);
  buildNav();
  if (G.notes.length) { const n = $('#g-alert'); n.replaceChildren(svg('circle-alert'), G.notes.join(' ')); n.hidden = false; }
  detail.init({ G, go });
  for (const t of G.tiles) { byEl.set(t.el, t); io.observe(t.el); if (t.canvas) { byEl.set(t.canvas, t); ro.observe(t.canvas); } }
  wire();
  applyView();
  route();
  document.documentElement.dataset.ready = '1';
  if (SELFTEST) {
    const { run } = await import('./selftest.js');
    await run({ G, go, route, applyView, measure, paint, relightGrid, detail });
  }
}

start().catch((e) => { console.error('asset page failed to start:', e && e.stack || e); });
