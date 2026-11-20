// assets.html?selftest=1: the page tests itself the way a person uses it (clicks a tile, presses the nav, types in
// find, presses a state, drags the hour) and reads the pixels back. Writes <pre id="selftest">{"checks":[...]}</pre>,
// with the names tools/gallery-check.mjs needs.

import { pixels, diffShare, brightness, backdrop, lightFor, sizeCanvas } from './draw.js';
import { D, hhmm } from './detail.js';

// Waiting. Under the check's --virtual-time-budget an idle page jumps straight to its next timer and frames come in real
// time, so a setTimeout poll can burn the whole budget before Back or a picture lands. A tiny fetch pauses virtual time
// and takes real time, so each poll here waits for real.
let n = 0;
const breathe = () => fetch(`kit/assets/siso-lion.svg?wait=${n++}`, { cache: 'no-store' }).then((r) => r.arrayBuffer()).catch(() => null);
async function until(fn, tries = 150) {
  for (let i = 0; i < tries; i++) { if (fn()) return true; await breathe(); }
  return !!fn();
}
const $ = (s) => document.querySelector(s);
const shown = (el) => !!el && !el.hidden && !el.closest('[hidden]');
const pct = (x) => `${(x * 100).toFixed(1)}%`;

export async function run({ G, go, applyView, measure, detail }) {
  const checks = [];
  const add = (name, ok, note) => checks.push({ name, ok: !!ok, note: String(note ?? '') });
  const safe = async (name, fn) => { try { const [ok, note] = await fn(); add(name, ok, note); } catch (e) { add(name, false, `threw: ${e && e.message}`); } };
  const q = $('#g-q');
  const typeFind = (v) => { q.value = v; q.dispatchEvent(new Event('input', { bubbles: true })); };
  const assetTiles = G.tiles.filter((t) => t.item.kind === 'asset');
  const imageTiles = G.tiles.filter((t) => t.item.kind === 'image');
  const reg = await import('../assets/registry.js').catch(() => ({ ASSETS: [], misses: new Map() }));
  const fx = await import('./fixture.js');
  const dlg = $('#g-detail');
  const closeByButton = () => dlg.querySelector('[data-close]').click();

  // let the first screen draw: the tiles on screen painted, their pictures loaded
  measure();
  await until(() => G.tiles.filter((t) => t.canvas && t.visible).every((t) => !t.dirty), 50);
  await until(() => imageTiles.filter((t) => t.visible).every((t) => t.img.complete), 400);

  await safe('every-asset-listed', () => {
    const want = [...reg.ASSETS.map((a) => a.id), ...(G.fixture ? fx.default.map((a) => a.id) : []), ...[...G.items.values()].filter((x) => x.kind === 'asset' && x.a.sky).map((x) => x.key)];
    const tiles = [...document.querySelectorAll('#g-groups [data-asset]')].map((e) => e.dataset.asset);
    const missing = want.filter((id) => tiles.filter((x) => x === id).length !== 1);
    const extra = tiles.filter((id) => !want.includes(id));
    const dup = reg.ASSETS.length - new Set(reg.ASSETS.map((a) => a.id)).size;
    const navSum = [...document.querySelectorAll('#g-nav .k-nav-row[data-view]:not([data-view="all"]):not([data-view="art"]):not([data-view="refs"]) .k-count')].reduce((s, e) => s + Number(e.textContent), 0);
    return [!missing.length && !extra.length && !dup && navSum === want.length,
      `${want.length} assets (${reg.ASSETS.length} registered${G.fixture ? ', 3 samples' : ''}), ${tiles.length} tiles, nav counts sum ${navSum}` +
      (missing.length ? `; missing or doubled: ${missing.join(', ')}` : '') + (extra.length ? `; unknown: ${extra.join(', ')}` : '') + (dup ? `; ${dup} duplicate ids` : '')];
  });

  await safe('every-image-listed', () => {
    const want = (G.catalog.images || []).map((i) => i.path);
    const els = [...document.querySelectorAll('#g-groups [data-image]')];
    const bad = want.filter((p) => { const e = els.filter((x) => x.dataset.image === p); return e.length !== 1 || e[0].querySelector('img')?.getAttribute('src') !== p; });
    return [want.length > 0 && !bad.length && els.length === want.length, `${want.length} images in catalog.json, ${els.length} tiles, each showing its own file${bad.length ? `; wrong: ${bad.slice(0, 5).join(', ')}` : ''}`];
  });

  await safe('thumbs-painted', async () => {
    const on = assetTiles.filter((t) => t.visible), off = assetTiles.filter((t) => !t.visible);
    const blank = (t) => { // the same tile with nothing on it: the asset must have changed it
      const c = document.createElement('canvas'); c.width = t.canvas.width; c.height = t.canvas.height;
      backdrop(c.getContext('2d'), c.width, c.height, lightFor(t.item.a, G.gridHour), 'sky', t.item.a.family === 'space');
      return diffShare(pixels(t.canvas), pixels(c));
    };
    const drawn = on.map((t) => ({ id: t.item.key, share: t.canvas.width > 1 ? blank(t) : 0 }));
    const flat = drawn.filter((d) => d.share < 0.002 && !G.items.get(d.id).a.sky);
    const offPainted = off.filter((t) => t.canvas.dataset.painted).length;
    const imgsOn = imageTiles.filter((t) => t.visible);
    const decoded = imgsOn.filter((t) => t.img.complete && t.img.naturalWidth > 0).length;
    const ok = (on.length ? !flat.length : true) && (imgsOn.length ? decoded > 0 : on.length > 0) && offPainted === 0;
    return [ok, `${on.length} asset tiles on screen, all drawn (${drawn.map((d) => `${d.id} ${pct(d.share)}`).join(', ') || 'none in this mode'}); ${off.length} off screen, ${offPainted} painted; ${decoded} of ${imgsOn.length} on-screen pictures decoded` + (flat.length ? `; blank: ${flat.map((d) => d.id).join(', ')}` : '')];
  });

  await safe('grid-light', () => {
    const t = assetTiles.find((x) => x.visible);
    const night = $('#g-light [data-value="22"]'), dusk = $('#g-light [data-value="17.8"]');
    if (!t) { night.click(); const ok = G.gridHour === 22; dusk.click(); return [ok && G.gridHour === 17.8, 'no asset tile in this mode; the light switch still sets the grid hour']; }
    const before = pixels(t.canvas);
    night.click();
    const after = pixels(t.canvas), d = diffShare(before, after);
    const ok = G.gridHour === 22 && t.canvas.dataset.painted === '22' && d > 0.2 && brightness(after) < brightness(before);
    dusk.click();
    return [ok && t.canvas.dataset.painted === '17.8', `Night relit ${t.item.key}: ${pct(d)} of its pixels changed, brightness ${brightness(before).toFixed(0)} to ${brightness(after).toFixed(0)}`];
  });

  await safe('family-filter', () => {
    const notes = [];
    let ok = true;
    const targets = [G.sections.find((s) => s.items.length && s.items[0].kind === 'asset' && s.id !== 'fixture'), G.sections.find((s) => s.id === 'fixture'), G.sections.find((s) => s.id === 'refs')].filter(Boolean).slice(0, 2);
    for (const s of targets) {
      document.querySelector(`#g-nav [data-view="${s.id}"]`).click();
      const vis = G.sections.filter((x) => shown(x.el)).map((x) => x.id);
      const tiles = [...s.el.querySelectorAll('[data-find-row]')].filter(shown).length;
      const others = G.tiles.filter((t) => t.item.section !== s.id && shown(t.el)).length;
      const pass = G.view === s.id && location.hash === `#in=${s.id}` && vis.length === 1 && vis[0] === s.id && tiles === s.items.length && !others &&
        $('#g-groups').dataset.mode === 'grid' && document.querySelector(`#g-nav [data-view="${s.id}"]`).getAttribute('aria-current') === 'page';
      ok = ok && pass;
      notes.push(`${s.title}: ${tiles} of ${s.items.length} tiles, ${others} others${pass ? '' : ` (view ${G.view}, sections ${vis.join('+')})`}`);
    }
    document.querySelector('#g-nav [data-view="all"]').click();
    const back = G.sections.filter((s) => s.items.length).every((s) => shown(s.el)) && $('#g-groups').dataset.mode === 'shelf';
    notes.push(`All: ${back ? 'every family back, one shelf each' : 'not every family came back'}`);
    return [ok && back && targets.length > 0, notes.join('; ')];
  });

  await safe('find-filters', () => {
    const rows = G.tiles.map((t) => t.el);
    const cands = ['police', 'tower', 'night', 'dusk', ...rows.slice(0, 3).map((r) => r.dataset.find.split(' ')[0])];
    const word = cands.find((w) => { const n = rows.filter((r) => r.dataset.find.includes(w)).length; return n > 0 && n < rows.length; });
    if (!word) return [false, 'no word matches some tiles but not all'];
    typeFind(word);
    const expect = rows.filter((r) => r.dataset.find.includes(word));
    const vis = rows.filter(shown);
    const exact = vis.length === expect.length && vis.every((r) => r.dataset.find.includes(word));
    const mode = $('#g-groups').dataset.mode;
    typeFind('zzqx nothing');
    const none = rows.filter(shown).length === 0 && shown($('#g-none'));
    typeFind('');
    const all = rows.filter((r) => !r.hidden).length === rows.length && $('#g-groups').dataset.mode === 'shelf' && !shown($('#g-none'));
    return [exact && mode === 'grid' && none && all, `“${word}” shows ${vis.length} of ${rows.length} tiles (${expect.length} expected) as one grid; a word with no match shows the empty line; clearing brings all ${rows.length} back`];
  });

  await safe('open-detail', async () => {
    const t = assetTiles[0] || imageTiles[0];
    t.el.click();
    const it = t.item;
    const opened = dlg.open && $('#d-title').textContent === it.title && location.hash === '#' + it.key && history.state?.g === 'open';
    let drawn = true;
    if (it.kind === 'asset') drawn = brightness(pixels($('#d-canvas'))) > 1 && $('#d-canvas').width > 100;
    else drawn = $('#d-img').getAttribute('src') === it.path;
    closeByButton();
    const closed = await until(() => !dlg.open && location.hash !== '#' + it.key);
    t.el.click();
    const again = dlg.open;
    history.back();
    const back = await until(() => !dlg.open && location.hash !== '#' + it.key);
    return [opened && drawn && closed && again && back, `${it.key}: opened in the drawer with the URL #${it.key}${it.kind === 'asset' ? ', preview drawn' : ', picture shown'}; the close button and Back both close it and restore the URL`];
  });

  await safe('paths-shown', async () => {
    const items = [...G.items.values()].filter((x) => x.kind === 'asset');
    const subs = new Set();
    for (const x of G.items.values()) if (x.kind === 'image' && !subs.has(x.im.sub)) { subs.add(x.im.sub); items.push(x); }
    let md = '';
    try { md = await fetch('ASSETS.md').then((r) => (r.ok ? r.text() : '')); } catch { md = ''; }
    const bad = [];
    for (const it of items) {
      detail.open(it);
      const p = $('#d-path').textContent;
      const want = it.kind === 'image' ? it.path : it.a.family === 'fixture' ? 'src/gallery/fixture.js' : it.a.sky ? 'src/engine/backdrop.js' : `src/assets/${it.a.family}/${it.a.id.split('.').slice(1).join('.')}.js`;
      const copy = shown($('#d-copy'));
      const inMd = it.a?.family === 'fixture' || it.a?.sky || md.includes(it.path);
      if (p !== want || !copy || !inMd) bad.push(`${it.key} (${p}${inMd ? '' : ', not in ASSETS.md'})`);
    }
    detail.close();
    await until(() => !dlg.open);
    return [items.length > 0 && !bad.length && md.length > 0, `${items.length} items opened (every asset, one image per folder): each shows its file path with a copy button, and ASSETS.md names it${bad.length ? `; wrong: ${bad.join(', ')}` : ''}`];
  });

  // the asset with the most states; the sample tower (drawer only, never a tile) while the registry has none with two
  const many = [...G.items.values()].filter((x) => x.kind === 'asset' && !x.a.sky && x.a.states.length > 1).sort((a, b) => b.a.states.length - a.a.states.length)[0];
  const subject = many || { key: 'fixture.building', kind: 'asset', a: fx.building, title: fx.building.title, path: 'src/gallery/fixture.js', section: 'fixture' };
  const used = many ? subject.key : 'fixture.building (drawer only: no registered asset has two states yet)';

  await safe('state-buttons', () => {
    detail.open(subject);
    const btns = [...document.querySelectorAll('#c-state > button')];
    const a = subject.a;
    if (btns.length !== a.states.length) return [false, `${btns.length} buttons for ${a.states.length} states`];
    const frames = [];
    let pressed = true;
    for (const b of btns) {
      b.click();
      pressed = pressed && D.state === b.dataset.value && btns.every((x) => (x.getAttribute('aria-pressed') === 'true') === (x === b));
      const once = a.once && a.once[b.dataset.value];
      if (once) { // a once state shows play and a scrub; scrubbing moves the picture
        pressed = pressed && shown($('#c-playrow')) && D.playing;
        const r = $('#c-p');
        r.value = '0.15'; r.dispatchEvent(new Event('input', { bubbles: true }));
        const early = pixels($('#d-canvas'));
        r.value = '0.9'; r.dispatchEvent(new Event('input', { bubbles: true }));
        const late = pixels($('#d-canvas'));
        frames.push({ s: b.dataset.value, d: late, scrub: diffShare(early, late), out: $('#c-p-out').textContent });
      } else {
        pressed = pressed && (!$('#c-playrow') || !shown($('#c-playrow')));
        frames.push({ s: b.dataset.value, d: pixels($('#d-canvas')) });
      }
    }
    const diffs = frames.slice(1).map((f) => ({ s: f.s, d: diffShare(frames[0].d, f.d) }));
    const scrubs = frames.filter((f) => f.scrub !== undefined);
    const ok = pressed && diffs.some((x) => x.d > 0.004) && scrubs.every((f) => f.scrub > 0.004 && f.out === '90%');
    btns[0].click();
    return [ok, `${used}: ${btns.length} buttons, each presses alone; against ${frames[0].s}: ${diffs.map((x) => `${x.s} ${pct(x.d)}`).join(', ')}` + (scrubs.length ? `; scrubbing ${scrubs.map((f) => `${f.s} 15% to 90% changed ${pct(f.scrub)}`).join(', ')}` : '')];
  });

  await safe('hour-changes-picture', () => {
    if (!D.a) detail.open(subject);
    const r = $('#c-hour');
    const set = (v) => { r.value = String(v); r.dispatchEvent(new Event('input', { bubbles: true })); return pixels($('#d-canvas')); };
    const noon = set(12), night = set(22);
    const d = diffShare(noon, night), bn = brightness(noon), bk = brightness(night);
    const readout = $('#c-hour-out').textContent;
    $('#c-pick [data-value="6"]').click();
    const dawn = D.hour === 6 && Number(r.value) === 6 && $('#c-hour-out').textContent === hhmm(6);
    $('#c-back [data-value="grey"]').click();
    const g = pixels($('#d-canvas'));
    const grey = Math.abs(g[0] - 0x6b) < 3 && Math.abs(g[1] - 0x6e) < 3 && Math.abs(g[2] - 0x73) < 3;
    $('#c-back [data-value="sky"]').click();
    let variant = 'one look';
    if ((subject.a.variants || 1) > 1) {
      const v0 = pixels($('#d-canvas')); $('#c-next').click(); const v1 = pixels($('#d-canvas'));
      variant = `variant 2 changed ${pct(diffShare(v0, v1))}, reads “${$('#c-seed').textContent}”`;
      $('#c-prev').click();
    }
    const ok = d > 0.2 && bn > bk + 10 && readout === '22:00' && dawn && grey;
    detail.close();
    return [ok, `${subject.key}: 12:00 to 22:00 changed ${pct(d)} of the pixels, brightness ${bn.toFixed(0)} to ${bk.toFixed(0)}, readout ${readout}; Dawn sets 06:00; grey backdrop ${grey ? 'is' : 'is not'} #6b6e73; ${variant}`];
  });

  await safe('deep-link', async () => {
    await until(() => !dlg.open);
    const keys = [assetTiles[0]?.item.key, imageTiles[0]?.item.key].filter(Boolean);
    const notes = [];
    let ok = keys.length > 0;
    for (const k of keys) {
      location.hash = '#' + k;
      const opened = await until(() => dlg.open && D.item && D.item.key === k);
      location.hash = '#in=all';
      const closed = await until(() => !dlg.open);
      ok = ok && opened && closed;
      notes.push(`#${k} ${opened ? 'opens it' : 'did not open'}${closed ? '' : ', did not close'}`);
    }
    return [ok, notes.join('; ') + ' (the same route() runs on load)'];
  });

  await safe('no-console-errors', () => {
    const errs = (window.__galleryErrors || []);
    const offline = errs.filter((e) => /fonts\.(googleapis|gstatic)\.com/.test(e));
    const real = errs.filter((e) => !offline.includes(e));
    const misses = reg.misses ? [...reg.misses.keys()] : [];
    return [!real.length && !misses.length, `${real.length} errors${real.length ? `: ${real.slice(0, 3).join(' | ')}` : ''}; ${misses.length} asset draws failed${misses.length ? `: ${misses.slice(0, 3).join(', ')}` : ''}` + (offline.length ? `; web fonts unreachable (offline), not counted` : '')];
  });

  // leave the page as it was found
  if (dlg.open) detail.close();
  typeFind('');
  if (location.hash !== '#in=all' && location.hash) history.replaceState(null, '', location.pathname + location.search);
  applyView();
  const out = { checks, mode: G.fixture ? 'fixture' : 'plain', ok: checks.every((c) => c.ok) };
  const pre = $('#selftest');
  pre.textContent = JSON.stringify(out);
  document.documentElement.dataset.selftest = out.ok ? 'pass' : 'fail';
  console.log('selftest', out.ok ? 'PASS' : 'FAIL', checks.filter((c) => !c.ok).map((c) => c.name).join(' '));
  void go; void sizeCanvas;
}
